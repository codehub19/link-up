import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'
import LoadingSpinner from '../../components/LoadingSpinner'

const DEAL_BREAKERS = [
    { value: 'smoking', label: 'Smoking' },
    { value: 'drinking', label: 'Drinking' },
    { value: 'long_distance', label: 'Long-distance' },
    { value: 'politics', label: 'Different political views' },
    { value: 'religion', label: 'Different religion' },
    { value: 'kids', label: 'Wanting / not wanting kids' },
]

export default function DealBreakers({ embedded, onComplete }: { embedded?: boolean; onComplete?: () => void }) {
    const { user, profile, refreshProfile } = useAuth()
    const nav = useNavigate()
    const [saving, setSaving] = useState(false)

    // Multi-select state
    const [dealBreakers, setDealBreakers] = useState<string[]>(profile?.dealBreakers || [])

    const toggle = (value: string) => {
        setDealBreakers(prev => {
            if (prev.includes(value)) return prev.filter(p => p !== value)
            return [...prev, value]
        })
    }

    const save = async () => {
        if (!user) return
        setSaving(true)
        try {
            await updateProfileAndStatus(
                user.uid,
                { dealBreakers },
                { dealBreakers: true } // Mark step as complete
            )
            await refreshProfile()
            if (embedded && onComplete) onComplete()
            else {
                // Proceed to Q1 (Personality)
                nav('/setup/q1')
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
                    <h1 className="setup-title">Deal Breakers</h1>
                    <p className="setup-sub">Select anything that is a non-negotiable for you.</p>

                    <fieldset className="qa-group">
                        <legend>Any deal-breakers? (Multi-select)</legend>
                        {DEAL_BREAKERS.map(opt => {
                            const selected = dealBreakers.includes(opt.value)
                            return (
                                <label key={opt.value} className={`qa-option ${selected ? 'on' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggle(opt.value)}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            )
                        })}
                    </fieldset>

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
