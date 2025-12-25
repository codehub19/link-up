import React, { useRef, useState, useEffect } from 'react'

interface HeightSliderProps {
    value: string // e.g., "5'10"
    onChange: (val: string) => void
}

export default function HeightSlider({ value, onChange }: HeightSliderProps) {
    // Min 4'0" = 48 inches, Max 7'0" = 84 inches
    const MIN_INCHES = 48
    const MAX_INCHES = 84

    // Parse "5'10" -> 70
    const parseHeight = (str: string): number => {
        if (!str) return 70 // default 5'10"
        const parts = str.split("'")
        if (parts.length < 1) return 70
        const ft = parseInt(parts[0]) || 0
        const inch = parseInt(parts[1]) || 0
        return (ft * 12) + inch
    }

    // Format 70 -> "5'10"
    const formatHeight = (inches: number): string => {
        const ft = Math.floor(inches / 12)
        const inch = inches % 12
        return `${ft}'${inch}`
    }

    // Format for display -> "5' 10""
    const displayHeight = (inches: number): string => {
        const ft = Math.floor(inches / 12)
        const inch = inches % 12
        return `${ft}' ${inch}"`
    }

    const [currentInches, setCurrentInches] = useState(parseHeight(value))
    const [isDragging, setIsDragging] = useState(false)
    const trackRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setCurrentInches(parseHeight(value))
    }, [value])

    const getPercent = (v: number) => ((v - MIN_INCHES) / (MAX_INCHES - MIN_INCHES)) * 100

    const handleMove = (clientX: number) => {
        if (!trackRef.current) return
        const rect = trackRef.current.getBoundingClientRect()
        const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
        const val = Math.round(percent * (MAX_INCHES - MIN_INCHES) + MIN_INCHES)

        if (val !== currentInches) {
            setCurrentInches(val)
            onChange(formatHeight(val))
        }
    }

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (isDragging) handleMove(e.clientX)
        }
        const onUp = () => {
            setIsDragging(false)
        }
        const onTouchMove = (e: TouchEvent) => {
            if (isDragging) handleMove(e.touches[0].clientX)
        }

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
    }, [isDragging, currentInches])

    return (
        <div
            className="height-slider-root"
            style={{
                position: 'relative',
                width: '100%',
                height: '50px', // More vertical space for label
                display: 'flex',
                alignItems: 'center',
                touchAction: 'none',
                marginTop: '10px'
            }}
            onMouseDown={(e) => {
                setIsDragging(true)
                handleMove(e.clientX)
            }}
            onTouchStart={(e) => {
                setIsDragging(true)
                handleMove(e.touches[0].clientX)
            }}
        >
            {/* Track Background */}
            <div
                ref={trackRef}
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px',
                    pointerEvents: 'none'
                }}
            />

            {/* Active Track */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    width: `${getPercent(currentInches)}%`,
                    height: '6px',
                    background: 'linear-gradient(90deg, #ff5d7c 0%, #ff8da0 100%)',
                    borderRadius: '3px',
                    pointerEvents: 'none'
                }}
            />

            {/* Thumb */}
            <div
                style={{
                    position: 'absolute',
                    left: `calc(${getPercent(currentInches)}% - 12px)`,
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    cursor: 'grab',
                    transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.1s',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div style={{ width: '6px', height: '6px', background: '#ff5d7c', borderRadius: '50%' }} />
            </div>

            {/* Floating Label */}
            <div
                style={{
                    position: 'absolute',
                    left: `calc(${getPercent(currentInches)}% - 30px)`,
                    top: '-25px',
                    width: '60px',
                    textAlign: 'center',
                    background: '#ff5d7c',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    pointerEvents: 'none',
                    opacity: 1,
                    transition: 'left 0.1s linear'
                }}
            >
                {displayHeight(currentInches)}
            </div>
        </div>
    )
}
