import { motion } from 'framer-motion'
import React from 'react'
import { useLocation } from 'react-router-dom'

const pageVariants = {
    initial: {
        opacity: 0,
        y: 10
    },
    in: {
        opacity: 1,
        y: 0
    },
    out: {
        opacity: 0,
        y: -10
    }
}

const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3
} as const

export default function PageTransition({ children }: { children: React.ReactNode }) {
    const { pathname } = useLocation()
    return (
        <motion.div
            key={pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    )
}
