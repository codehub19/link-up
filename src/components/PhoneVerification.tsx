import React, { useState, useEffect } from 'react'
import {
    auth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    linkWithPhoneNumber,
    PhoneAuthProvider,
    updateProfileAndStatus,
    ensureUserDocument
} from '../firebase'
import { useAuth } from '../state/AuthContext'
import { toast } from 'sonner'
import LoadingSpinner from './LoadingSpinner'

type Props = {
    onVerified: () => void
}

const COUNTRY_CODES = [
    { code: '+91', label: '🇮🇳 +91' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+971', label: '🇦🇪 +971' },
    { code: '+61', label: '🇦🇺 +61' },
    { code: '+65', label: '🇸🇬 +65' },
    { code: '+49', label: '🇩🇪 +49' },
    { code: '+33', label: '🇫🇷 +33' },
    { code: '+977', label: '🇳🇵 +977' },
    { code: '+880', label: '🇧🇩 +880' },
    { code: '+94', label: '🇱🇰 +94' },
    { code: '+966', label: '🇸🇦 +966' },
    { code: '+974', label: '🇶🇦 +974' },
    { code: '+60', label: '🇲🇾 +60' },
    { code: '+64', label: '🇳🇿 +64' },
]

declare global {
    interface Window {
        recaptchaVerifier: any
        confirmationResult: any
    }
}

export default function PhoneVerification({ onVerified }: Props) {
    const { user, refreshProfile } = useAuth()
    const [countryCode, setCountryCode] = useState('+91')
    const [phone, setPhone] = useState('')
    const [otp, setOtp] = useState('')
    const [step, setStep] = useState<'phone' | 'otp'>('phone')
    const [loading, setLoading] = useState(false)

    // E.164: country code + subscriber number, at most 15 digits total.
    // Indian numbers are always 10 digits; elsewhere accept 6-12.
    const formattedPhone = `${countryCode}${phone}`
    const isValidPhone = countryCode === '+91'
        ? phone.length === 10
        : phone.length >= 6 && formattedPhone.length - 1 <= 15

    useEffect(() => {
        // Clear any existing verifier to ensure we bind to the current DOM element
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear()
            } catch (e) {
                console.warn('Failed to clear old recaptcha', e)
            }
            window.recaptchaVerifier = null
        }

        try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            })
        } catch (e) {
            console.error('Failed to init recaptcha', e)
        }

        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear()
                } catch (e) {
                    // ignore
                }
                window.recaptchaVerifier = null
            }
        }
    }, [])

    const sendOtp = async () => {
        if (!isValidPhone) {
            toast.error('Please enter a valid phone number')
            return
        }

        setLoading(true)
        try {
            let appVerifier = window.recaptchaVerifier

            if (!appVerifier) {
                try {
                    appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                        'size': 'invisible',
                        'callback': (response: any) => { }
                    })
                    window.recaptchaVerifier = appVerifier
                } catch (e) {
                    console.error('Failed to re-init recaptcha', e)
                    toast.error('Verification failed. Please refresh the page.')
                    setLoading(false)
                    return
                }
            }

            // We use linkWithPhoneNumber if user is already signed in (which they are)
            // However, linkWithPhoneNumber requires re-authentication sometimes.
            // A simpler flow for verification is just to verify the phone credential.

            // Actually, for just "verification" without changing auth credential, we can use linkWithPhoneNumber
            // But if we just want to verify they own the number, we can use signInWithPhoneNumber (but that signs them in)
            // Since they are already signed in with Google, we want to LINK this phone number.

            if (!user) return

            const confirmationResult = await linkWithPhoneNumber(user, formattedPhone, appVerifier)
            window.confirmationResult = confirmationResult
            setStep('otp')
            toast.success('OTP sent to ' + formattedPhone)
        } catch (error: any) {
            console.error(error)
            if (error.code === 'auth/credential-already-in-use') {
                toast.error('This phone number is already linked to another account.')
            } else if (error.code === 'auth/invalid-app-credential') {
                toast.error('Configuration Error: Domain not authorized or App Check failure.')
            } else if (error.code === 'auth/too-many-requests') {
                toast.error('Too many attempts. Please try again later.')
            } else if (error.code === 'auth/provider-already-linked') {
                toast.success('Phone number already verified!')
                if (user) {
                    await updateProfileAndStatus(user.uid, {
                        phoneNumber: user.phoneNumber || formattedPhone,
                        isPhoneVerified: true
                    })
                    await refreshProfile()
                    onVerified()
                }
            } else if (error.code === 'auth/invalid-phone-number') {
                toast.error('That phone number doesn\'t look right. Check the country code and number.')
            } else if (error.code === 'auth/operation-not-allowed') {
                toast.error('SMS verification is not available for this country yet.')
            } else {
                toast.error('Failed to send OTP. ' + error.message)
            }
            // Reset recaptcha
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear()
                window.recaptchaVerifier = null
            }
        } finally {
            setLoading(false)
        }
    }

    const verifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP')
            return
        }
        setLoading(true)
        try {
            const confirmationResult = window.confirmationResult
            await confirmationResult.confirm(otp)

            // If successful, update profile
            if (user) {
                await updateProfileAndStatus(user.uid, {
                    phoneNumber: formattedPhone,
                    isPhoneVerified: true
                })
                await refreshProfile()
                toast.success('Phone verified successfully!')
                onVerified()
            }
        } catch (error: any) {
            console.error(error)
            toast.error('Invalid OTP. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ marginTop: 12 }}>
            {step === 'phone' ? (
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'auto 2fr 1fr' }}>
                    <select
                        className="field-input"
                        aria-label="Country code"
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        disabled={loading}
                        style={{ paddingRight: 8 }}
                    >
                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <input
                        className="field-input"
                        placeholder="Mobile number"
                        inputMode="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
                        maxLength={countryCode === '+91' ? 10 : 12}
                        disabled={loading}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={sendOtp}
                        disabled={loading || !isValidPhone}
                        style={{ minWidth: 80, whiteSpace: 'nowrap' }}
                    >
                        {loading ? <LoadingSpinner size={16} color="#fff" /> : 'Send OTP'}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '2fr 1fr' }}>
                    <input
                        className="field-input"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        disabled={loading}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={verifyOtp}
                        disabled={loading || otp.length < 6}
                        style={{ minWidth: 80 }}
                    >
                        {loading ? <LoadingSpinner size={16} color="#fff" /> : 'Verify'}
                    </button>
                </div>
            )}
            <div id="recaptcha-container"></div>
        </div>
    )
}
