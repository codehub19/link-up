import React, { useState } from 'react'

export default function FileUpload({
  onFile,
  accept = 'image/*',
  previewUrl,
}: {
  onFile: (file: File) => void
  accept?: string
  previewUrl?: string
}) {
  const [local, setLocal] = useState<string | undefined>(previewUrl)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setLocal(URL.createObjectURL(f))
      onFile(f)
    }
  }

  return (
    <div className="upload">
      <div className="upload-box">
        {local ? <img src={local} alt="preview" className="preview" /> : <div className="upload-placeholder">Upload a photo</div>}
      </div>
      <input type="file" accept={accept} onChange={handle} />
    </div>
  )
}