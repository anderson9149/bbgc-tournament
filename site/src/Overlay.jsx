import { useEffect, useState } from 'react'

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

// The stories live in one file in the repo rather than in each year's Ticker
// tab, which holds the slogans that scroll during the event. The menu needs to
// know which years have one before anything is opened, so the fetch lives in a
// hook; it is one small file and the result is shared.
let storiesCache = null

export function useStories() {
  const [stories, setStories] = useState(storiesCache)
  useEffect(() => {
    if (storiesCache) return
    let live = true
    fetch(`${import.meta.env.BASE_URL}data/stories.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((d) => { storiesCache = d; if (live) setStories(d) })
    return () => { live = false }
  }, [])
  return stories
}

export function Story({ year, stories, onClose }) {
  const story = stories?.[String(year)]
  return (
    <Overlay title={`${year} Story`} subtitle="how it happened" onClose={onClose} className="story">
      {!stories
        ? <p className="muted center">Loading…</p>
        : story?.length
          ? <ol>{story.map((m, i) => <li key={i}>{m}</li>)}</ol>
          : <p className="muted center">No story has been written for {year} yet.</p>}
    </Overlay>
  )
}
