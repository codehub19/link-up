import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'
import LoadingSpinner from '../../components/LoadingSpinner'

// Options Constants
const RELATIONSHIP_TYPES = [
    { value: 'serious', label: 'Serious relationship' },
    { value: 'casual', label: 'Casual dating' },
    { value: 'friendship', label: 'Friendship' },
    { value: 'open', label: 'Open to anything' },
    { value: 'unsure', label: 'Not sure yet' },
]

const COMMUNICATION_STYLES = [
    { value: 'texting', label: 'Texting' },
    { value: 'voice', label: 'Voice calls' },
    { value: 'video', label: 'Video calls' },
    { value: 'in_person', label: 'In-person' },
]

// Optional field, so we don't block progress
export default function RelationshipGoals({ embedded, onComplete }: { embedded?: boolean; onComplete?: () => void }) {
    const { user, profile, refreshProfile } = useAuth()
    const nav = useNavigate()
    const [saving, setSaving] = useState(false)

    // State
    const [lookingFor, setLookingFor] = useState(profile?.lookingFor || '')
    const [commStyle, setCommStyle] = useState(profile?.communicationStyle || '')

    const save = async () => {
        if (!user) return
        setSaving(true)
        try {
            await updateProfileAndStatus(
                user.uid,
                {
                    lookingFor,
                    communicationStyle: commStyle
                },
                { relationshipGoals: true } // Mark step as complete
            )
            await refreshProfile()
            if (embedded && onComplete) onComplete()
            else {
                nav('/setup/deal-breakers') // Next step
            }
        } finally {
            setSaving(false)
        }
    }

    // Reuse the qa-option style
    const RadioOption = ({ value, label, current, onChange }: any) => (
        <label className={`qa-option ${current === value ? 'on' : ''}`}>
            <input
                type="radio"
                name="relationship" // Shared name for grouping
                value={value}
                checked={current === value}
                onChange={() => onChange(value)}
            />
            <span>{label}</span>
        </label>
    )

    const RadioOptionComm = ({ value, label, current, onChange }: any) => (
        <label className={`qa-option ${current === value ? 'on' : ''}`}>
            <input
                type="radio"
                name="comm"
                value={value}
                checked={current === value}
                onChange={() => onChange(value)}
            />
            <span>{label}</span>
        </label>
    )

    return (
        <>
            {!embedded && <Navbar />}
            <div className={embedded ? '' : 'setup-page'}>
                <section className="setup-card">
                    <h1 className="setup-title">Your Goals</h1>
                    <p className="setup-sub">Help us find the right match for you.</p>

                    {/* Looking For */}
                    <fieldset className="qa-group">
                        <legend>What are you looking for right now?</legend>
                        {RELATIONSHIP_TYPES.map(opt => (
                            <RadioOption
                                key={opt.value}
                                {...opt}
                                current={lookingFor}
                                onChange={setLookingFor}
                            />
                        ))}
                    </fieldset>

                    {/* Communication Style (Optional) */}
                    <fieldset className="qa-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <legend style={{ marginBottom: 0 }}>Communication Style</legend>
                            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, color: 'rgba(255,255,255,0.6)' }}>OPTIONAL</span>
                        </div>
                        {COMMUNICATION_STYLES.map(opt => (
                            <RadioOptionComm
                                key={opt.value}
                                {...opt}
                                current={commStyle}
                                onChange={setCommStyle}
                            />
                        ))}
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
