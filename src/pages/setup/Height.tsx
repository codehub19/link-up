import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'
import LoadingSpinner from '../../components/LoadingSpinner'
import SingleRangeSlider from '../../components/ui/SingleRangeSlider'

export default function Height({ embedded, onComplete }: { embedded?: boolean; onComplete?: () => void }) {
    const { user, profile, refreshProfile } = useAuth()
    const nav = useNavigate()
    const [cm, setCm] = useState(170) // Default 170cm
    const [saving, setSaving] = useState(false)

    const cmToFt = (cm: number) => {
        const realFeet = ((cm * 0.393700) / 12);
        const feet = Math.floor(realFeet);
        const inches = Math.round((realFeet - feet) * 12);
        return `${feet}'${inches}"`;
    }

    const save = async () => {
        if (!user) return
        setSaving(true)
        try {
            const heightStr = `${cmToFt(cm)} (${cm} cm)`
            await updateProfileAndStatus(
                user.uid,
                { height: heightStr }, // Save as string "5'7" (170 cm)"
                { height: true }
            )
            await refreshProfile()
            if (embedded && onComplete) onComplete()
            else {
                nav('/setup/interests')
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            {!embedded && <Navbar />}
            <div className={embedded ? '' : 'setup-page'}>
                <section className="setup-card">
                    <h1 className="setup-title">Your Height</h1>
                    <p className="setup-sub">Help matches get to know you.</p>

                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                            {cmToFt(cm)}
                        </div>
                        <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>
                            {cm} cm
                        </div>

                        <div className="range-slider-container">
                            <SingleRangeSlider
                                min={120}
                                max={220}
                                value={cm}
                                onChange={setCm}
                            />
                        </div>
                    </div>

                    <div className="setup-card-footer">
                        <button className="btn-primary-lg" disabled={saving} onClick={save}>
                            {saving ? <LoadingSpinner color="#fff" size={20} /> : 'Continue'}
                        </button>
                    </div>
                </section>
            </div>
        </>
    )
}
