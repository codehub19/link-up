import React, { useRef, useState, useEffect } from 'react'

interface RangeSliderProps {
    min: number
    max: number
    value: [number, number]
    onChange: (val: [number, number]) => void
    onAfterChange?: (val: [number, number]) => void
}

export default function RangeSlider({ min, max, value, onChange, onAfterChange }: RangeSliderProps) {
    const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null)
    const trackRef = useRef<HTMLDivElement>(null)

    const getPercent = (v: number) => ((v - min) / (max - min)) * 100

    const handleStart = (type: 'min' | 'max') => {
        setIsDragging(type)
    }

    const handleEnd = () => {
        setIsDragging(null)
        if (onAfterChange) onAfterChange(value)
    }

    const handleMove = (clientX: number) => {
        if (!isDragging || !trackRef.current) return
        const rect = trackRef.current.getBoundingClientRect()
        const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
        const val = Math.round(percent * (max - min) + min)

        if (isDragging === 'min') {
            const newVal = Math.min(val, value[1] - 1)
            onChange([newVal, value[1]])
        } else {
            const newVal = Math.max(val, value[0] + 1)
            onChange([value[0], newVal])
        }
    }

    useEffect(() => {
        const onMove = (e: MouseEvent) => handleMove(e.clientX)
        const onUp = () => handleEnd()

        // Touch support
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
    }, [isDragging, value, min, max])

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
            <div
                className="range-track-active"
                style={{
                    position: 'absolute',
                    left: `${getPercent(value[0])}%`,
                    width: `${getPercent(value[1]) - getPercent(value[0])}%`,
                    height: '6px',
                    background: 'linear-gradient(90deg, #ff5d7c 0%, #ff8da0 100%)',
                    borderRadius: '3px'
                }}
            />

            {/* Thumbs */}
            {['min', 'max'].map((type) => {
                const val = type === 'min' ? value[0] : value[1]
                return (
                    <div
                        key={type}
                        className="range-thumb"
                        onMouseDown={() => handleStart(type as 'min' | 'max')}
                        onTouchStart={() => handleStart(type as 'min' | 'max')}
                        style={{
                            position: 'absolute',
                            left: `calc(${getPercent(val)}% - 10px)`, // Center thumb
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                            cursor: 'grab',
                            transform: isDragging === type ? 'scale(1.1)' : 'scale(1)',
                            transition: 'transform 0.1s',
                            zIndex: 2
                        }}
                    />
                )
            })}
        </div>
    )
}
