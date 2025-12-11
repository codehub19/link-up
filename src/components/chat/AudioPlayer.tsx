import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

export default function AudioPlayer({ src, mine, duration: propDuration }: { src: string, mine: boolean, duration?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(propDuration || 0)
  const [currentTime, setCurrentTime] = useState(0)

  // Generate stable random heights for the waveform bars
  const bars = useMemo(() => Array.from({ length: 24 }).map(() => Math.max(0.3, Math.random())), [])

  useEffect(() => {
    if (propDuration) {
      setDuration(propDuration)
    }
  }, [propDuration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      // Use propDuration if available, otherwise audio.duration
      const d = propDuration || audio.duration
      if (d && Number.isFinite(d)) {
        // Update internal duration state if we didn't have it
        if (!propDuration && d !== duration) setDuration(d)

        setProgress((audio.currentTime / d) * 100)
        setCurrentTime(audio.currentTime)
      } else {
        setProgress(0)
        setCurrentTime(audio.currentTime || 0)
      }
    }

    const onLoadedMetadata = () => {
      const d = propDuration || audio.duration
      if (Number.isFinite(d)) {
        setDuration(d)
      }
    }

    const onEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [duration, propDuration])

  // Fix infinite duration issue
  useEffect(() => {
    const audio = audioRef.current
    if (audio && !propDuration && Number.isFinite(audio.duration)) {
      setDuration(audio.duration)
    }
  })

  // ... (togglePlay and handleSeek remain mostly the same but use 'duration' state) ...
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const audio = audioRef.current
    // Use 'duration' state which is either prop or loaded
    if (!audio || !Number.isFinite(duration) || duration === 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))

    const time = percentage * duration
    audio.currentTime = time
    setProgress(percentage * 100)
  }

  const formatTime = (t: number) => {
    if (!Number.isFinite(t) || t < 0) return '0:00'
    const min = Math.floor(t / 60)
    const sec = Math.floor(t % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className={`audio-player-modern ${mine ? 'mine' : 'theirs'}`} onClick={(e) => e.stopPropagation()}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button className="play-btn" onClick={togglePlay} type="button">
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
            <path d="M5 3L19 12L5 21V3Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="waveform-container" onClick={handleSeek}>
        <div className="waveform">
          {bars.map((height, i) => {
            const barPercent = (i / bars.length) * 100
            const isFilled = barPercent <= progress

            return (
              <motion.div
                key={i}
                className={`bar ${isFilled ? 'filled' : ''}`}
                animate={{
                  height: isPlaying ? [12 * height, 24 * height, 12 * height] : 16 * height,
                  opacity: isFilled ? 1 : 0.5
                }}
                transition={{
                  duration: 0.8,
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: "reverse",
                  delay: i * 0.05,
                  ease: "easeInOut"
                }}
              />
            )
          })}
        </div>
        <div className="time-info">
          <span>{formatTime(currentTime)}</span>
          <span style={{ margin: '0 2px', opacity: 0.6 }}>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <style>{`
        .audio-player-modern {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 0;
          min-width: 160px;
          user-select: none;
        }

        .play-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(4px);
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .play-btn:active {
          transform: scale(0.95);
        }

        .waveform-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          cursor: pointer;
          height: 100%;
          position: relative;
          padding: 4px 0;
        }

        .waveform {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 28px;
        }

        .bar {
          width: 3px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.4);
          transition: background 0.2s;
        }

        .time-info {
           position: absolute;
           bottom: -14px;
           left: 0;
           font-size: 10px;
           opacity: 0.8;
           font-weight: 500;
           pointer-events: none;
        }

        /* Theming */
        .audio-player-modern.mine .play-btn {
          background: rgba(255, 255, 255, 0.25);
        }
        .audio-player-modern.mine .play-btn:hover {
          background: rgba(255, 255, 255, 0.35);
        }
        .audio-player-modern.mine .bar.filled {
          background: #fff;
        }
        .audio-player-modern.mine .bar {
          background: rgba(255, 255, 255, 0.4);
        }

        /* Theirs - Dark theme */
        .audio-player-modern.theirs .play-btn {
          background: rgba(255, 65, 108, 0.15);
          color: #ff416c;
        }
        .audio-player-modern.theirs .play-btn:hover {
          background: rgba(255, 65, 108, 0.25);
        }
        .audio-player-modern.theirs .bar.filled {
          background: #ff416c; /* Brand pink */
        }
        .audio-player-modern.theirs .bar {
          background: rgba(255, 255, 255, 0.15); 
        }
        .audio-player-modern.theirs .time-info {
          color: #a6a7bb;
        }
      `}</style>
    </div>
  )
}
