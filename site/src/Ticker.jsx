import { useLayoutEffect, useRef, useState } from 'react'

const SPEED = 110 // px per second (in stage units on TV)

// Scrolling news ticker. The text is rendered twice so the loop is seamless.
export function Ticker({ messages }) {
  const ref = useRef(null)
  const [duration, setDuration] = useState(30)
  const text = (messages || []).filter(Boolean)

  useLayoutEffect(() => {
    if (ref.current) setDuration(Math.max(10, ref.current.offsetWidth / SPEED))
  }, [text.join('|')])

  if (!text.length) return null
  const copy = (key) => (
    <span className="ticker-copy" key={key} ref={key === 'a' ? ref : null}>
      {text.map((m, i) => (
        <span key={i}><span className="msg">{m}</span><span className="dot">•</span></span>
      ))}
    </span>
  )
  return (
    <div className="ticker" aria-live="off">
      <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
        {copy('a')}{copy('b')}
      </div>
    </div>
  )
}
