import React, { useState, useRef, useEffect } from 'react'

export default function AudioPlayer({ src, mine }: { src: string, mine: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onTimeUpdate = () => {
            if (audio.duration && Number.isFinite(audio.duration)) {
                setProgress((audio.currentTime / audio.duration) * 100)
                setCurrentTime(audio.currentTime)
            } else {
                setProgress(0)
                setCurrentTime(audio.currentTime || 0)
            }
        }

        const onLoadedMetadata = () => {
            if (Number.isFinite(audio.duration)) {
                setDuration(audio.duration)
            } else {
                // If duration is Infinity (streaming/loading), we might not be able to set it yet.
                // But for static files it usually loads.
                setDuration(0)
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
    }, [])

    // Fallback if duration is Infinity on some browsers until played
    useEffect(() => {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.duration)) {
            setDuration(audio.duration);
        }
    })

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current
        if (!audio || !Number.isFinite(duration) || duration === 0) return
        const val = Number(e.target.value)
        const time = (val / 100) * duration
        audio.currentTime = time
        setProgress(val)
    }

    const formatTime = (t: number) => {
        if (!Number.isFinite(t) || t < 0) return '0:00'
        const min = Math.floor(t / 60)
        const sec = Math.floor(t % 60)
        return `${min}:${sec.toString().padStart(2, '0')}`
    }

    return (
        <div className={`audio-player ${mine ? 'mine' : 'theirs'}`}>
            <audio ref={audioRef} src={src} preload="metadata" />

            <button className="play-btn" onClick={togglePlay} type="button">
                {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                )}
            </button>

            <div className="track-container">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="seek-slider"
                    style={{
                        backgroundSize: `${progress}% 100%`
                    }}
                />
                <div className="time-info">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <style>{`
        .audio-player {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 180px; /* Reduced min-width */
          width: 100%;
          padding: 6px 0;
        }
        .play-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          background: ${mine ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'};
          color: white;
          transition: background 0.2s;
        }
        .play-btn:hover {
          background: ${mine ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'};
        }
        .track-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0; /* Important for flex child to shrink */
        }
        .seek-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: ${mine ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'};
          outline: none;
          cursor: pointer;
          position: relative;
        }
        /* Progress Fill Trace */
        .seek-slider::-webkit-slider-runnable-track {
            background: transparent;
        }
        .seek-slider::-moz-range-track {
            background: transparent;
        }
        
        .seek-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          margin-top: -3px; /* Center thumb on track */
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .time-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: rgba(255,255,255,0.8);
          font-family: monospace;
          line-height: 1;
          pointer-events: none;
        }
      `}</style>
        </div>
    )
}
