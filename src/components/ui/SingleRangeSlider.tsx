import React, { useRef, useState, useEffect } from 'react'

interface SingleRangeSliderProps {
    min: number
    max: number
    value: number
    onChange: (val: number) => void
    onAfterChange?: (val: number) => void
}

export default function SingleRangeSlider({ min, max, value, onChange, onAfterChange }: SingleRangeSliderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const trackRef = useRef<HTMLDivElement>(null)

    const getPercent = (v: number) => ((v - min) / (max - min)) * 100

    const handleStart = () => {
        setIsDragging(true)
    }

    const handleEnd = () => {
        setIsDragging(false)
        if (onAfterChange) onAfterChange(value)
    }

    const handleMove = (clientX: number) => {
        if (!isDragging || !trackRef.current) return
        const rect = trackRef.current.getBoundingClientRect()
        const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
        const val = Math.round(percent * (max - min) + min)
        onChange(val)
    }

    useEffect(() => {
        const onMove = (e: MouseEvent) => handleMove(e.clientX)
        const onUp = () => handleEnd()
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX)

        if (isDragging) {
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
            window.addEventListener('touchmove', onTouchMove)
            window.addEventListener('touchend', onUp)
        }
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            window.removeEventListener('touchmove', onTouchMove)
            window.removeEventListener('touchend', onUp)
        }
    }, [isDragging, min, max])

    return (
        <div className="range-slider-root" style={{
            position: 'relative',
            width: '100%',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            touchAction: 'none'
        }}>
            <div
                ref={trackRef}
                className="range-track-bg"
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px'
                }}
            />
            {/* Active Track (Left to Thumb) */}
            <div
                className="range-track-active"
                style={{
                    position: 'absolute',
                    left: '0%',
                    width: `${getPercent(value)}%`,
                    height: '6px',
                    background: 'linear-gradient(90deg, #ff5d7c 0%, #ff8da0 100%)',
                    borderRadius: '3px'
                }}
            />

            {/* Thumb */}
            <div
                className="range-thumb"
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                style={{
                    position: 'absolute',
                    left: `calc(${getPercent(value)}% - 10px)`, // Center thumb
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    cursor: 'grab',
                    transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.1s',
                    zIndex: 2
                }}
            />
        </div>
    )
}
