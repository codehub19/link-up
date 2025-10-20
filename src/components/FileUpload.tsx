import React, { useState } from 'react'
import { compressImage } from '../utils/compressImage'

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

 const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files?.[0]
  if (f) {
    const compressed = await compressImage(f);
    setLocal(URL.createObjectURL(compressed));
    onFile(compressed);
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