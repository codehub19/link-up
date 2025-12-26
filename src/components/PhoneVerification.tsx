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

declare global {
    interface Window {
        recaptchaVerifier: any
        confirmationResult: any
    }
}

export default function PhoneVerification({ onVerified }: Props) {
    const { user, refreshProfile } = useAuth()
    const [phone, setPhone] = useState('')
    const [otp, setOtp] = useState('')
    const [step, setStep] = useState<'phone' | 'otp'>('phone')
    const [loading, setLoading] = useState(false)

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
        if (!phone || phone.length < 10) {
            toast.error('Please enter a valid phone number')
            return
        }
        // Basic formatting for India, can be improved
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`

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
                        phoneNumber: phone,
                        isPhoneVerified: true
                    })
                    await refreshProfile()
                    onVerified()
                }
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
                    phoneNumber: phone,
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
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '2fr 1fr' }}>
                    <input
                        className="field-input"
                        placeholder="Enter mobile number"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        disabled={loading}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={sendOtp}
                        disabled={loading || phone.length < 10}
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
