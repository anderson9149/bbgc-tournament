import { useLayoutEffect, useRef, useState } from 'react'

// The stage is a fixed 1920-wide canvas, so a speed in stage pixels reads the
// same on every TV. A phone has no such canvas, and the flat px/s this used to
// use crossed a 375px screen in under four seconds — far too fast to read. A
// phone's speed is set by the screen instead: one width every so many seconds,
// which comes out the same on a small handset and a large one.
const TV_SPEED = 110                 // stage px per second
const PHONE_SECONDS_PER_SCREEN = 10

// Scrolling news ticker. The message block is repeated enough times to be
// wider than the container, then that whole unit is rendered twice and
// scrolled by 50%, so the loop is seamless no matter how short the text is.
export function Ticker({ messages, tv }) {
  const wrapRef = useRef(null)
  const copyRef = useRef(null)
  const [layout, setLayout] = useState({ repeat: 1, duration: 30 })
  const text = (messages || []).filter(Boolean)
  const key = text.join('|')

  useLayoutEffect(() => {
    const wrap = wrapRef.current, copy = copyRef.current
    if (!wrap || !copy || !copy.offsetWidth) return
    const speed = tv ? TV_SPEED : Math.max(20, wrap.offsetWidth / PHONE_SECONDS_PER_SCREEN)
    const repeat = Math.max(1, Math.ceil(wrap.offsetWidth / copy.offsetWidth))
    setLayout({ repeat, duration: Math.max(10, (copy.offsetWidth * repeat) / speed) })
  }, [key, tv])

  if (!text.length) return null

  const block = (k, ref) => (
    <span className="ticker-copy" key={k} ref={ref}>
      {text.map((m, i) => (
        <span key={i}><span className="msg">{m}</span><span className="dot">•</span></span>
      ))}
    </span>
  )
  const unit = (prefix) => Array.from({ length: layout.repeat }, (_, i) => block(`${prefix}${i}`, prefix === 'a' && i === 0 ? copyRef : null))

  return (
    <div className="ticker" ref={wrapRef} aria-live="off">
      <div className="ticker-track" style={{ animationDuration: `${layout.duration}s` }}>
        {unit('a')}{unit('b')}
      </div>
    </div>
  )
}
