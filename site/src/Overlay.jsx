import { useEffect } from 'react'

// Popup that floats over whatever page is showing. It lives in App, so it
// survives switching between Group Stage and Knockout Round.
export function Overlay({ title, subtitle, onClose, className = '', children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={`overlay ${className}`} role="dialog" aria-label={title}>
      <header>
        <h2>{title}{subtitle ? <small>{subtitle}</small> : null}</h2>
        <button className="close" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="overlay-body">{children}</div>
    </div>
  )
}

export function Story({ year, messages, onClose }) {
  return (
    <Overlay title={`${year} Story`} subtitle="how it happened" onClose={onClose} className="story">
      {messages?.length
        ? <ol>{messages.map((m, i) => <li key={i}>{m}</li>)}</ol>
        : <p className="muted center">No story has been written for {year} yet.</p>}
    </Overlay>
  )
}
