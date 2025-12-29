
import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { validateReferralCode } from '../../services/referrals'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

export default function Referral({ embedded, onComplete }: Props) {
    const { user, profile, refreshProfile } = useAuth()
    const nav = useNavigate()

    const [code, setCode] = useState(sessionStorage.getItem('referralCode') || '')
    const [error, setError] = useState('')
    const [validating, setValidating] = useState(false)
    const [saving, setSaving] = useState(false)

    // If already has referredBy or skipped, we might show that? But usually step logic handles skipping.

    const save = async (referrerUid: string | null) => {
        if (!user) return
        setSaving(true)
        try {
            await updateProfileAndStatus(user.uid, {
                referredBy: referrerUid,
                referralSkipped: !referrerUid
            }, { referral: true }) // We need to ensure 'referral' is a tracked step in setupStatus or just handle logical flow

            await refreshProfile()
            if (embedded && onComplete) onComplete()
            else {
                const next = nextSetupRoute(profile)
                nav(next || '/setup/interests')
            }
        } catch (e) {
            console.error(e)
            setError('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleNext = async () => {
        setError('')
        if (!code.trim()) {
            // Skip
            await save(null)
            return
        }

        // Validate
        setValidating(true)
        try {
            const uid = await validateReferralCode(code.trim())
            if (!uid) {
                setError('Invalid referral code. Please check or clear to skip.')
                setValidating(false)
                return
            }
            if (uid === user?.uid) {
                setError('You cannot refer yourself.')
                setValidating(false)
                return
            }
            // Create separate referral record
            const { createReferralRecord } = await import('../../services/referrals')
            await createReferralRecord(uid, user?.uid || '', profile?.name || 'New User')

            await save(uid)
        } catch (e) {
            console.error(e)
            setError('Error validating code.')
        } finally {
            setValidating(false)
        }
    }

    return (
        <>
            {!embedded && <Navbar />}
            <div className={embedded ? '' : 'setup-page'}>
                <section className="setup-card setup-card-glass">
                    <h1 className="setup-title">Referral Code</h1>
                    <p className="setup-sub">Do you have a referral code? Enter it to unlock benefits.</p>

                    <div className="details-form">
                        <input
                            className="field-input"
                            placeholder="Enter Code (Optional)"
                            value={code}
                            onChange={e => {
                                setCode(e.target.value.toUpperCase())
                                setError('')
                            }}
                            style={{ textAlign: 'center', letterSpacing: 2, fontSize: 18, textTransform: 'uppercase' }}
                        />
                        {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: 8 }}>{error}</p>}
                    </div>

                    <div className="setup-card-footer">
                        <button
                            className="btn-primary-lg"
                            onClick={handleNext}
                            disabled={validating || saving}
                        >
                            {validating ? 'Verifying...' : saving ? 'Saving...' : code ? 'Apply Code' : 'Skip'}
                        </button>
                    </div>
                </section>
            </div>
        </>
    )
}
