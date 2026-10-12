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

  // Measured once, this went wrong whenever the width it read was not the
  // width that ended up on screen — a font swapping in late, the phone turning,
  // the mobile class landing after the first paint. The duration stayed put
  // while the track got wider, and the ticker ran at whatever multiple of the
  // intended speed that worked out to. So it re-measures whenever the rendered
  // width actually changes, from any cause.
  useLayoutEffect(() => {
    const wrap = wrapRef.current, copy = copyRef.current
    if (!wrap || !copy) return
    const measure = () => {
      const copyW = copy.offsetWidth, boxW = wrap.offsetWidth
      if (!copyW || !boxW) return
      const speed = tv ? TV_SPEED : Math.max(20, boxW / PHONE_SECONDS_PER_SCREEN)
      const repeat = Math.max(1, Math.ceil(boxW / copyW))
      const duration = Math.max(10, (copyW * repeat) / speed)
      // Bail out when nothing moved: changing repeat re-renders the track,
      // which would otherwise set the observer off again forever.
      setLayout((prev) => (prev.repeat === repeat && Math.abs(prev.duration - duration) < 0.5
        ? prev : { repeat, duration }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(copy)
    ro.observe(wrap)
    return () => ro.disconnect()
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
