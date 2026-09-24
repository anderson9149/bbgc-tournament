import { useEffect, useState } from 'react'
import { API_URL } from './config.js'
import PINS from './map-pins.json'
import sampleHoles from './sample-holes.json'

const BASE = import.meta.env.BASE_URL
const params = new URLSearchParams(window.location.search)
const LIVE = params.has('sample') ? '' : API_URL
const pad = (n) => String(n).padStart(2, '0')

// Hole names + narratives come from the BBGC_CourseGuide sheet; the bundled
// copy keeps the page working before that sheet has been built.
export function useHoles() {
  const [holes, setHoles] = useState(LIVE ? null : sampleHoles.holes)
  useEffect(() => {
    if (!LIVE) return
    let cancelled = false
    fetch(`${LIVE}?action=holes`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.holes)) setHoles(d.holes) })
      .catch(() => { if (!cancelled) setHoles(sampleHoles.holes) })
    return () => { cancelled = true }
  }, [])
  return holes
}

export function CourseMap({ holes, tv }) {
  const [sel, setSel] = useState(1)
  const list = holes || sampleHoles.holes
  const hole = list.find((h) => h.hole === sel) || list[0]

  const map = (
    <div className="map">
      <img src={`${BASE}course-map.webp`} alt="Lagoni National B.G.C course map" />
      {tv && PINS.map((p) => (
        <button key={p.hole} className={`pin ${p.hole === sel ? 'on' : ''}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          onClick={() => setSel(p.hole)} aria-label={`Hole ${p.hole}`}>
          {p.hole}
        </button>
      ))}
    </div>
  )

  const panel = (
    <div className="hole-panel">
      <img className="hole-sign" src={`${BASE}holes/${pad(hole.hole)}.webp`} alt={`Hole ${hole.hole}, ${hole.name}`} />
      {hole.photos?.[0] && (
        <figure className="hole-photo"><img src={`${BASE}course/${hole.photos[0]}`} alt={`Hole ${hole.hole}`} /></figure>
      )}
      <p className="hole-text">{hole.narrative || 'No description for this hole yet.'}</p>
    </div>
  )

  if (tv) return <section className="coursemap-tv">{map}{panel}</section>

  return (
    <section className="coursemap-mobile">
      {map}
      <div className="hole-grid">
        {list.map((h) => (
          <button key={h.hole} className={h.hole === sel ? 'on' : ''} onClick={() => setSel(h.hole)}>
            <img src={`${BASE}holes/${pad(h.hole)}.webp`} alt={`Hole ${h.hole}, ${h.name}`} />
          </button>
        ))}
      </div>
      {panel}
    </section>
  )
}
