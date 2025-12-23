import React, { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import HomeBackground from '../../components/home/HomeBackground'
import { useAuth } from '../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import { updateProfileAndStatus, requestAccountDeletion, db, getDoc, doc, updateDoc, arrayRemove } from '../../firebase'
import './dashboard.css'
import './Settings.styles.css'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useDialog } from '../../components/ui/Dialog'
import RangeSlider from '../../components/ui/RangeSlider'

// Reusing same CSS classes as dashboard for theme consistency

interface SectionItem {
  label: string
  value?: string | number
  type?: 'toggle' | 'slider' | 'action' | 'info'
  // For toggle
  checked?: boolean
  // For slider
  min?: number
  max?: number
  range?: [number, number]
  onChange?: (val: any) => void
  // Common
  action?: () => void
  loading?: boolean
}

interface Section {
  title: string
  items: SectionItem[]
}

export default function SettingsPage() {
  const { logout, profile, refreshProfile, user } = useAuth()
  const nav = useNavigate()
  const { showAlert, showConfirm } = useDialog()

  // Local State for Sliders (debounced save)
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 35])
  const [distance, setDistance] = useState(50)

  // UI State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)

  // Sync local state on mount
  useEffect(() => {
    if (profile) {
      setAgeRange([profile.ageRangeMin || 18, profile.ageRangeMax || 35])
      setDistance(profile.distancePreference || 50)
    }
  }, [profile])

  // Handlers
  const toggleSetting = async (field: string, currentVal: boolean) => {
    if (!user) return
    try {
      await updateProfileAndStatus(user.uid, { [field]: !currentVal })
      await refreshProfile()
    } catch (e) {
      console.error(e)
      showAlert('Failed to update setting')
    }
  }

  const savePreferences = async () => {
    if (!user) return
    // Debounce or just save on change? For simplicity, save on change end
    await updateProfileAndStatus(user.uid, {
      ageRangeMin: ageRange[0],
      ageRangeMax: ageRange[1],
      distancePreference: distance
    })
    await refreshProfile()
  }

  const handleAgeChange = (idx: 0 | 1, val: number) => {
    const next = [...ageRange] as [number, number]
    next[idx] = val
    if (idx === 0 && val > next[1]) next[1] = val
    if (idx === 1 && val < next[0]) next[0] = val
    setAgeRange(next)
  }

  // Blocked Users
  const fetchBlockedUsers = async () => {
    if (!user || !profile?.blockedUsers?.length) {
      setBlockedUsers([])
      return
    }
    setLoadingBlocked(true)
    try {
      // Fetch minimal details for each blocked uid
      // In a real app we might have a dedicated collection or better query
      const promises = profile.blockedUsers.map(async (bUid: string) => {
        const snap = await getDoc(doc(db, 'users', bUid))
        return snap.exists() ? snap.data() : { uid: bUid, name: 'Unknown User' }
      })
      const data = await Promise.all(promises)
      setBlockedUsers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingBlocked(false)
    }
  }

  const unblockUser = async (targetUid: string) => {
    if (!user) return
    if (await showConfirm('Unblock this user?')) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          blockedUsers: arrayRemove(targetUid)
        })
        await refreshProfile()
        setBlockedUsers(prev => prev.filter(u => u.uid !== targetUid))
      } catch (e) {
        showAlert('Failed to unblock')
      }
    }
  }

  // Account Deletion
  const handleDeleteRequest = async () => {
    if (!deleteReason) {
      showAlert('Please select a reason.')
      return
    }

    let finalReason = deleteReason
    if (deleteReason === 'Other') {
      if (!otherReason.trim()) {
        showAlert('Please specify the reason.')
        return
      }
      finalReason = `Other: ${otherReason}`
    }

    if (!user) return

    setIsDeleting(true)
    try {
      await requestAccountDeletion(user.uid, finalReason)
      await showAlert('Your request has been submitted. Your account will be permanently deleted within 30 days. You will be logged out now.')
      await logout()
      nav('/')
    } catch (e) {
      console.error(e)
      showAlert('Failed to submit deletion request.')
    } finally {
      setIsDeleting(false)
    }
  }


  const sections: Section[] = [
    {
      title: 'Account',
      items: [
        { label: 'Phone Number', value: profile?.phoneNumber || 'Not linked', action: () => { } },
        { label: 'Email', value: profile?.email || 'Not linked', action: () => { } },
        { label: 'Restore Purchases', action: () => showAlert('Restore Purchases functionality coming soon.') },
      ]
    },
    {
      title: 'Discovery',
      items: [
        {
          label: 'Distance Preference',
          type: 'slider',
          value: distance + ' km',
          min: 5, max: 200,
          onChange: (val) => { setDistance(val); updateProfileAndStatus(user!.uid, { distancePreference: val }); }
        },
        {
          label: 'Age Range',
          type: 'slider',
          value: `${ageRange[0]} - ${ageRange[1]}`,
          range: ageRange, // Custom handling in UI
          min: 18, max: 60
        },
        {
          label: 'Global Mode',
          type: 'toggle',
          checked: profile?.globalMode || false,
          action: () => toggleSetting('globalMode', profile?.globalMode || false)
        },
      ]
    },
    {
      title: 'Notifications',
      items: [
        {
          label: 'Push Notifications',
          type: 'toggle',
          checked: profile?.pushNotifications !== false, // default true
          action: () => toggleSetting('pushNotifications', profile?.pushNotifications !== false)
        },
        {
          label: 'Email Updates',
          type: 'toggle',
          checked: profile?.emailUpdates || false,
          action: () => toggleSetting('emailUpdates', profile?.emailUpdates || false)
        },
      ]
    },
    {
      title: 'Privacy',
      items: [
        {
          label: 'Blocked Users',
          action: () => { setShowBlockedModal(true); fetchBlockedUsers(); }
        },
        {
          label: 'Read Receipts',
          type: 'toggle',
          checked: profile?.readReceipts !== false, // default true
          action: () => toggleSetting('readReceipts', profile?.readReceipts !== false)
        },
      ]
    },
    {
      title: 'Community',
      items: [
        { label: 'Community Guidelines', action: () => window.open('/community-guidelines', '_blank') },
        { label: 'Safety Tips', action: () => window.open('/support', '_blank') },
      ]
    },
    {
      title: 'Help & Support',
      items: [
        { label: 'Help Center', action: () => window.open('/support', '_blank') },
        { label: 'Contact Us', action: () => window.open('mailto:support@dateu.com') },
      ]
    }
  ]

  const handleLogout = async () => {
    if (await showConfirm('Are you sure you want to log out?')) {
      await logout()
      nav('/')
    }
  }

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container settings-container">

        {/* Header */}
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => nav(-1)}>
            <span>←</span> Back
          </button>
          <h1 className="text-gradient">Settings</h1>
        </div>

        <div className="settings-content">
          {sections.map((section, idx) => (
            <div key={idx} className="settings-section">
              <h3 className="settings-section-title">{section.title}</h3>
              <div className="settings-list">
                {section.items.map((item, i) => (
                  <div key={i} className="settings-item" onClick={item.type === 'slider' ? undefined : item.action}>
                    <div className="settings-item-row-main">
                      <div className="settings-item-info">
                        <span className="settings-item-label">{item.label}</span>
                        {item.value && item.type !== 'slider' && <span className="settings-item-value">{item.value}</span>}
                      </div>

                      {/* Toggle UI */}
                      {item.type === 'toggle' && (
                        <div className={`settings-toggle ${item.checked ? 'on' : ''}`}>
                          <div className="settings-toggle-knob" />
                        </div>
                      )}

                      {/* Action Arrow */}
                      {!item.type && !item.value && (
                        <span className="settings-chevron">›</span>
                      )}
                    </div>

                    {/* Slider UI */}
                    {item.type === 'slider' && (
                      <div className="settings-slider-row">
                        {item.range ? (
                          // Age Range Dual Slider
                          <div className="range-slider-container" style={{ marginTop: 15, marginBottom: 5 }}>
                            <div className="pref-header" style={{ fontSize: '0.9rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                              <span>Min: {item.range[0]}</span>
                              <span>Max: {item.range[1]}</span>
                            </div>
                            <RangeSlider
                              min={item.min!}
                              max={item.max!}
                              value={item.range}
                              onChange={(val) => setAgeRange(val)}
                              onAfterChange={savePreferences}
                            />
                          </div>
                        ) : (
                          // Distance Single Slider
                          <div style={{ width: '100%', marginTop: 10 }}>
                            <div className="pref-header" style={{ fontSize: '0.9rem', marginBottom: 8, color: '#94a3b8' }}>
                              <span>Current: {item.value}</span>
                            </div>
                            <input
                              type="range"
                              min={item.min} max={item.max}
                              value={distance}
                              onChange={(e) => item.onChange?.(parseInt(e.target.value))}
                              className="range-input-single"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Footer Actions */}
          <div className="settings-section">
            <button className="settings-logout-btn" onClick={handleLogout}>
              Log out
            </button>
            <div className="settings-version">
              Version 1.0.0 • DateU
            </div>
            <button className="settings-delete-btn" onClick={() => setShowDeleteModal(true)}>
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="settings-modal-overlay">
            <div className="settings-modal-content">
              <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 12 }}>Delete Request</h2>
              <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 24, fontSize: '0.95rem', lineHeight: '1.5' }}>
                Please select a reason for leaving. Your account will be queued for permanent deletion in 30 days.
              </p>

              <div className="delete-reasons">
                {['Found a partner', 'Not interested', 'App issues', 'Other'].map(r => (
                  <div key={r} style={{ marginBottom: 10 }}>
                    <label className="qa-option" style={{ marginBottom: 0, justifyContent: 'flex-start', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <input
                        type="radio"
                        name="reason"
                        checked={deleteReason === r}
                        onChange={() => setDeleteReason(r)}
                        style={{ display: 'block', width: 'auto', marginRight: '10px' }}
                      />
                      <span style={{ color: '#fff' }}>{r}</span>
                    </label>
                    {r === 'Other' && deleteReason === 'Other' && (
                      <textarea
                        className="setup-textarea"
                        placeholder="Please specify..."
                        value={otherReason}
                        onChange={e => setOtherReason(e.target.value)}
                        style={{ marginTop: 8, fontSize: '0.9rem', padding: 12, width: '100%', height: 80, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
                <button className="btn-ghost" onClick={() => setShowDeleteModal(false)} style={{ width: '100%' }}>Cancel</button>
                <button className="btn-primary" disabled={isDeleting} onClick={handleDeleteRequest} style={{ width: '100%' }}>
                  {isDeleting ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blocked Users Modal */}
        {showBlockedModal && (
          <div className="settings-modal-overlay">
            <div className="settings-modal-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 20 }}>Blocked Users</h2>
              <button className="settings-close-modal-btn" onClick={() => setShowBlockedModal(false)}>×</button>

              {loadingBlocked ? (
                <LoadingSpinner />
              ) : blockedUsers.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No blocked users.</p>
              ) : (
                <div className="blocked-list">
                  {blockedUsers.map(u => (
                    <div key={u.uid} className="blocked-user-row">
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                      <button className="btn-unblock" onClick={() => unblockUser(u.uid)}>Unblock</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
