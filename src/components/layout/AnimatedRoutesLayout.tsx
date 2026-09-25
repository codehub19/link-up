import React, { useRef } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import PageTransition, { TransitionKind } from './PageTransition'

// Top-level app tabs switch instantly, like a native tab bar
const TAB_ROOTS = [
    '/dashboard/male/rounds', '/dashboard/round', '/dashboard/random-call', '/dashboard/matches',
    '/dashboard/chat', '/dashboard/male/profile', '/dashboard/female/profile',
]

export default function AnimatedRoutesLayout() {
    const location = useLocation()
    const navType = useNavigationType()
    const prevPath = useRef(location.pathname)
    const key = location.pathname

    let kind: TransitionKind = 'fade'
    const isApp = key.startsWith('/dashboard') || key.startsWith('/setup') || key.startsWith('/pay') || key.startsWith('/profile')
    if (isApp) {
        if (TAB_ROOTS.includes(key) && TAB_ROOTS.includes(prevPath.current)) kind = 'none'
        else kind = navType === 'POP' ? 'back' : 'forward'
    }

    React.useEffect(() => {
        prevPath.current = key
        window.scrollTo(0, 0)
    }, [key])

    return (
        <PageTransition key={key} kind={kind}>
            <Outlet />
        </PageTransition>
    )
}
