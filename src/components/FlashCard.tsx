import React, { useEffect, useRef } from 'react'

type Props = {
  title: string
  subtitle?: string
  children: React.ReactNode
  onNext?: () => void
  onBack?: () => void
  nextLabel?: string
  backLabel?: string
  nextDisabled?: boolean
  footer?: React.ReactNode
}

export default function FlashCard({
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Next',
  backLabel = 'Back',
  nextDisabled,
  footer
}: Props){
  const ref = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const el = ref.current
    if(!el) return
    el.classList.add('fade-enter')
    requestAnimationFrame(()=>{
      el.classList.add('fade-enter-active')
      el.classList.remove('fade-enter')
    })
    return ()=> {
      el.classList.add('fade-exit')
      requestAnimationFrame(()=>{
        el?.classList.add('fade-exit-active')
      })
    }
  }, [])

  return (
    <div ref={ref} className="flash-card card">
      <div className="stack" style={{marginBottom: 6}}>
        <h2 style={{margin:0, fontSize:26}}>{title}</h2>
        {subtitle ? <p style={{margin:0, color:'var(--muted)'}}>{subtitle}</p> : null}
      </div>

      <div className="stack" style={{flex:1}}>
        {children}
      </div>

      <div className="row" style={{justifyContent:'space-between', marginTop:6}}>
        <div>
          {onBack ? <button className="btn btn-ghost" onClick={onBack}>{backLabel}</button> : <span/>}
        </div>
        <div className="row" style={{gap:10}}>
          {footer}
          {onNext ? <button className="btn btn-primary" disabled={nextDisabled} onClick={onNext}>{nextLabel}</button> : null}
        </div>
      </div>
    </div>
  )
}