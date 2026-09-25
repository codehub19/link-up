import { motion } from 'framer-motion'
import React from 'react'

export type TransitionKind = 'forward' | 'back' | 'fade' | 'none'

// Enter-only animations (no waiting for the old page to animate out): screens appear
// immediately and settle in, like native navigation.
const INITIAL: Record<TransitionKind, Record<string, number>> = {
    forward: { opacity: 0, x: 28 },
    back: { opacity: 0, x: -28 },
    fade: { opacity: 0, y: 8 },
    none: { opacity: 1, x: 0 },
}

export default function PageTransition({ children, kind = 'fade' }: { children: React.ReactNode; kind?: TransitionKind }) {
    return (
        <motion.div
            initial={INITIAL[kind]}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ type: 'tween', ease: [0.2, 0.8, 0.2, 1], duration: kind === 'none' ? 0 : 0.22 }}
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    )
}
