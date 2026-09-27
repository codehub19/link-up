/**
 * Call tones made with Web Audio (no audio files to download).
 * Browsers may block sound until the user has interacted with the page; every
 * function here fails silently in that case.
 */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => { })
    return ctx
  } catch {
    return null
  }
}

function tone(ac: AudioContext, freqs: number[], start: number, dur: number, vol = 0.08, type: OscillatorType = 'sine') {
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(vol, start + 0.02)
  gain.gain.setValueAtTime(vol, start + dur - 0.04)
  gain.gain.linearRampToValueAtTime(0, start + dur)
  gain.connect(ac.destination)
  freqs.forEach((f) => {
    const o = ac.createOscillator()
    o.type = type
    o.frequency.value = f
    o.connect(gain)
    o.start(start)
    o.stop(start + dur + 0.05)
  })
}

/** Plays a pattern on repeat until the returned stop function is called. */
function loop(play: (ac: AudioContext, t: number) => void, everyMs: number) {
  let stopped = false
  let timer: number | undefined
  const tick = () => {
    if (stopped) return
    const ac = audio()
    if (ac) play(ac, ac.currentTime + 0.02)
    timer = window.setTimeout(tick, everyMs)
  }
  tick()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}

/** "Tring-tring" the caller hears while the other phone rings. */
export function startRingback() {
  return loop((ac, t) => {
    tone(ac, [400, 450], t, 0.4, 0.05)
    tone(ac, [400, 450], t + 0.6, 0.4, 0.05)
  }, 3000)
}

/** Ringtone (and vibration) for an incoming call. */
export function startRingtone() {
  const vibrate = (p: number[]) => { try { navigator.vibrate?.(p) } catch { } }
  const stop = loop((ac, t) => {
    const notes = [659.25, 783.99, 987.77, 783.99]
    notes.forEach((f, i) => tone(ac, [f], t + i * 0.16, 0.15, 0.07, 'triangle'))
    notes.forEach((f, i) => tone(ac, [f], t + 0.9 + i * 0.16, 0.15, 0.07, 'triangle'))
    vibrate([400, 200, 400])
  }, 2600)
  return () => {
    stop()
    vibrate([])
  }
}

/** Short tone when a call connects. */
export function playConnected() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + 0.02
  tone(ac, [660], t, 0.12, 0.06)
  tone(ac, [880], t + 0.14, 0.14, 0.06)
}

/** Short tone when a call ends. */
export function playEnded() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + 0.02
  tone(ac, [480], t, 0.18, 0.06)
  tone(ac, [360], t + 0.22, 0.24, 0.06)
}

/** Call from a click handler so later tones (ringing, connected) are allowed to play. */
export function unlockAudio() {
  audio()
}
