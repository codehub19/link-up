import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PageTransition from './PageTransition'

export default function AnimatedRoutesLayout() {
    const location = useLocation()

    // Use the pathname as the key to trigger transitions on route change
    // We can also use location.key but pathname checks for actual page changes
    const key = location.pathname

    React.useEffect(() => {
        window.scrollTo(0, 0)
    }, [key])

    return (
        <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={key}>
                <Outlet />
            </PageTransition>
        </AnimatePresence>
    )
}
