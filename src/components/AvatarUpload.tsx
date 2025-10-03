import React, { useEffect, useMemo, useRef, useState } from 'react'

export default function AvatarUpload({
  previewUrl,
  onFile,
  size = 144,
  ariaLabel = 'Change profile photo',
}: {
  previewUrl?: string
  onFile: (file: File) => void
  size?: number
  ariaLabel?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localUrl, setLocalUrl] = useState<string | undefined>()

  const src = useMemo(() => localUrl || previewUrl, [localUrl, previewUrl])

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl)
    }
  }, [localUrl])

  const pick = () => inputRef.current?.click()

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      const url = URL.createObjectURL(f)
      setLocalUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      onFile(f)
    }
    // reset value so picking same file again still triggers change
    e.currentTarget.value = ''
  }

  return (
    <div className="avatar-upload" style={{ width: size, height: size }}>
      <div
        className="avatar-circle"
        role="img"
        aria-label="Profile photo"
        style={{ width: size, height: size, backgroundImage: src ? `url(${src})` : undefined }}
      >
        {!src ? <div className="avatar-fallback">👤</div> : null}
      </div>

      <button type="button" className="avatar-edit-badge" onClick={pick} aria-label={ariaLabel}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
          <path d="M20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="currentColor"/>
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onChange}
      />
    </div>
  )
}