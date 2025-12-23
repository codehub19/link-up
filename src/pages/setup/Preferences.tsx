import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function PreferencesPage({ embedded, onComplete }: { embedded?: boolean; onComplete?: () => void }) {
    const { user, profile, refreshProfile } = useAuth()
    const nav = useNavigate()

    // Default values
    const [ageRange, setAgeRange] = useState<[number, number]>([
        profile?.ageRangeMin || 18,
        profile?.ageRangeMax || 35
    ])
    const [distance, setDistance] = useState(profile?.distancePreference || 50)
    const [saving, setSaving] = useState(false)

    // Handlers
    const handleAgeChange = (idx: 0 | 1, val: number) => {
        const next = [...ageRange] as [number, number]
        next[idx] = val
        // Enforce min < max with slight buffer or just swap
        if (idx === 0 && val > next[1]) next[1] = val
        if (idx === 1 && val < next[0]) next[0] = val
        setAgeRange(next)
    }

    const save = async () => {
        if (!user) return
        setSaving(true)
        try {
            await updateProfileAndStatus(
                user.uid,
                {
                    ageRangeMin: ageRange[0],
                    ageRangeMax: ageRange[1],
                    distancePreference: distance
                },
                // We'll consider this part of 'profile' setup or maybe a new key like 'preferences'
                // For now, let's just mark it as part of 'profile' block or similar, 
                // effectively it updates the user doc. 
                // But to ensure 'setupStatus' tracks it, let's assume 'preferences' key.
                { preferences: true }
            )
            await refreshProfile()
            if (embedded && onComplete) onComplete()
            else {
                // Assuming this is inserted after setup/interests
                // We need to verify where to navigate next.
                // For now, let's explicitly go to q1 or whatever is next in flow.
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
                <section className="setup-card setup-card-glass">
                    <h1 className="setup-title">Discovery Preferences</h1>
                    <p className="setup-sub">Who are you looking for?</p>

                    <div className="pref-section">
                        <div className="pref-header">
                            <span className="pref-label">Age Range</span>
                            <span className="pref-value">{ageRange[0]} - {ageRange[1]}</span>
                        </div>
                        {/* Simple Dual Slider Simulation with two inputs */}
                        <div className="range-slider-container">
                            <input
                                type="range"
                                min="18" max="60"
                                value={ageRange[0]}
                                onChange={(e) => handleAgeChange(0, parseInt(e.target.value))}
                                className="range-input"
                            />
                            <input
                                type="range"
                                min="18" max="60"
                                value={ageRange[1]}
                                onChange={(e) => handleAgeChange(1, parseInt(e.target.value))}
                                className="range-input"
                            />
                            {/* Visual Track - optional advanced styling could go here */}
                        </div>
                    </div>

                    <div className="pref-section">
                        <div className="pref-header">
                            <span className="pref-label">Distance</span>
                            <span className="pref-value">{distance} km</span>
                        </div>
                        <input
                            type="range"
                            min="5" max="200" step="5"
                            value={distance}
                            onChange={(e) => setDistance(parseInt(e.target.value))}
                            className="range-input-single"
                        />
                    </div>

                    <div className="setup-card-footer">
                        <button className="btn-primary-lg" disabled={saving} onClick={save}>
                            {saving ? <LoadingSpinner color="#fff" size={20} /> : 'Continue'}
                        </button>
                    </div>
                </section>
            </div>

            <style>{`
        .pref-section {
          margin-bottom: 32px;
          background: rgba(255,255,255,0.05);
          padding: 20px;
          border-radius: 12px;
        }
        .pref-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          color: #fff;
          font-weight: 600;
        }
        .pref-value {
          color: #ff5d7c;
        }
        .range-slider-container {
          position: relative;
          height: 30px;
        }
        .range-input {
          position: absolute;
          width: 100%;
          pointer-events: none;
          appearance: none;
          background: none;
          top: 50%;
          transform: translateY(-50%);
        }
        .range-input::-webkit-slider-thumb {
          pointer-events: all;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ff5d7c;
          cursor: pointer;
          appearance: none;
          position: relative;
          z-index: 10;
        }
        /* Single slider */
        .range-input-single {
          width: 100%;
          accent-color: #ff5d7c;
        }
      `}</style>
        </>
    )
}
