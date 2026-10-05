import QRCode from 'qrcode'

/* Ready-to-share material for interns: messages and posters with their own QR code. */

export function promoMessages(link: string, code: string, college?: string | null) {
  const where = college ? ` at ${college}` : ''
  return [
    {
      id: 'whatsapp', label: 'WhatsApp (friends & hostel groups)',
      text: `Hey! 👋 Found an app made by an IIT Delhi student for making new friends from any college — find people for fests, treks, gym, study groups and events.\n\nIt's free. Join with my link and we both get Premium days 🎁\n${link}\n(or use code ${code} when you sign up)`,
    },
    {
      id: 'hinglish', label: 'WhatsApp (Hinglish)',
      text: `Guys ek mast app hai — DateU 🙌 Naye log milte hain apne aur dusre colleges se, fest/trek/gym/garba ke liye buddy mil jaata hai, groups mein plans banao.\n\nFree hai, mere link se join karo toh dono ko Premium milega 🎁\n${link}\nCode: ${code}`,
    },
    {
      id: 'instagram', label: 'Instagram story / caption',
      text: `Never skip a fest again because "koi saath nahi ja raha" 😤\nDateU = find buddies for events, treks, gym & study groups from every college.\n\nJoin with code ${code} 👉 link in bio / ${link}\n#DateU #CollegeLife #MakeNewFriends`,
    },
    {
      id: 'club', label: 'Club / society announcement',
      text: `Hi everyone! We're partnering with DateU — a free app to find people for events and plans across colleges${where}. You can find a buddy for our upcoming events, join interest groups and meet people beyond your own circle.\n\nSign up here: ${link} (code ${code})`,
    },
    {
      id: 'linkedin', label: 'LinkedIn',
      text: `I've joined DateU as a Business Development intern 🚀\n\nDateU helps college students make new friends beyond their own circle — find buddies for fests and events, join interest groups and plan things together, with safety built in (18+, ID verification, photo checks).\n\nIf you're a student, try it out: ${link}\n\n#Internship #StartUp #StudentCommunity`,
    },
  ]
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** A shareable poster (feed 1080×1350 or story 1080×1920) with the intern's QR code. */
export async function makePoster(kind: 'feed' | 'story', link: string, code: string): Promise<string> {
  const W = 1080, H = kind === 'story' ? 1920 : 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#1a0f2e'); g.addColorStop(0.55, '#3b0f2a'); g.addColorStop(1, '#ff416c')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // soft glow
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.15, 10, W * 0.8, H * 0.15, 520)
  glow.addColorStop(0, 'rgba(255,75,43,.45)'); glow.addColorStop(1, 'rgba(255,75,43,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  const top = kind === 'story' ? 220 : 90
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'
  ctx.font = '800 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.fillText('DateU', 90, top)
  ctx.font = '800 88px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  const lines = ['Make new friends', 'from every college.']
  lines.forEach((l, i) => ctx.fillText(l, 90, top + 110 + i * 104))
  ctx.font = '500 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,.85)'
  const bullets = ['🎉  Find a buddy for fests & events', '🏸  Groups for gym, treks, study & more', '📞  Voice calls & chats, safely', '🔒  18+, ID-verified students']
  bullets.forEach((b, i) => ctx.fillText(b, 90, top + 340 + i * 62))

  // QR card
  const qrSize = kind === 'story' ? 420 : 340, cardW = qrSize + 80, cardH = qrSize + 170
  const cx = (W - cardW) / 2, cy = kind === 'story' ? H - cardH - 300 : H - cardH - 70
  ctx.fillStyle = '#fff'; roundRect(ctx, cx, cy, cardW, cardH, 40); ctx.fill()
  const qr = await QRCode.toDataURL(link, { width: qrSize, margin: 1, color: { dark: '#15131c', light: '#ffffff' } })
  const img = new Image(); img.src = qr
  await new Promise((r) => { img.onload = r })
  ctx.drawImage(img, cx + 40, cy + 40, qrSize, qrSize)
  ctx.fillStyle = '#15131c'; ctx.textAlign = 'center'
  ctx.font = '700 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.fillText('Scan to join free', W / 2, cy + qrSize + 56)
  ctx.font = '800 38px ui-monospace, Menlo, monospace'
  ctx.fillStyle = '#ff416c'
  ctx.fillText(`Code: ${code}`, W / 2, cy + qrSize + 102)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '500 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.fillText('dateu.in', 90, H - 70)
  return c.toDataURL('image/png')
}

export async function qrDataUrl(link: string) {
  return QRCode.toDataURL(link, { width: 480, margin: 1 })
}
