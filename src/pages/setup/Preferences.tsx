import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'
import LoadingSpinner from '../../components/LoadingSpinner'
import RangeSlider from '../../components/ui/RangeSlider'

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
                { preferences: true }
            )
            await refreshProfile()
            if (embedded && onComplete) onComplete()
            else {
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
                        {/* Properly implemented RangeSlider with filled track */}
                        <div className="range-slider-container">
                            <RangeSlider
                                min={18}
                                max={60}
                                value={ageRange}
                                onChange={setAgeRange}
                            />
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
                            style={{
                                background: `linear-gradient(90deg, #ff5d7c ${((distance - 5) / (200 - 5)) * 100}%, rgba(255,255,255,0.1) ${((distance - 5) / (200 - 5)) * 100}%)`
                            }}
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
          padding: 24px;
          border-radius: 12px;
          border: 1px solid var(--clr-border-glass);
        }
        .pref-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          color: #fff;
          font-weight: 600;
        }
        .pref-value {
          color: #ff5d7c;
          font-weight: 700;
        }
        .range-slider-container {
          position: relative;
          height: 30px;
          padding: 0 10px;
        }
        /* Single slider style match */
        .range-input-single {
          width: 100%;
          accent-color: #ff5d7c;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          appearance: none;
        }
        .range-input-single::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #ff5d7c;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
      `}</style>
        </>
    )
}
