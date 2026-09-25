import { useEffect, useRef, useState } from 'react'
import { API_URL } from './config.js'
import sampleLive from './sample-live.json'

const params = new URLSearchParams(window.location.search)
const LIVE = params.has('sample') ? '' : API_URL
const HOLES = Array.from({ length: 18 }, (_, i) => i + 1)
const FLASH_MS = 6000   // 500ms in, 5s held, 500ms out

// Polls the HoleScores tab while the tournament is being played.
export function useLive(active) {
  const [data, setData] = useState(LIVE ? null : sampleLive)
  useEffect(() => {
    if (!LIVE || !active) return
    let cancelled = false
    const load = () => fetch(`${LIVE}?action=live`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.games)) setData(d) })
      .catch(() => {})
    load()
    const id = setInterval(load, 20000)
    return () => { cancelled = true; clearInterval(id) }
  }, [active])
  return data
}

const gameKey = (g) => `${g.teamA}|${g.teamB}`

// Which cells changed between two polls. Returns 'teamA|teamB:holeIndex' keys.
// A game seen for the first time counts as nothing: on the first load every
// hole would "change", and the whole board would light up at once.
export function changedCells(before, after) {
  const out = []
  if (!before) return out
  after.forEach((g) => {
    const was = before[gameKey(g)]
    if (!was) return
    g.holes.forEach((v, i) => { if (v !== was[i]) out.push(`${gameKey(g)}:${i}`) })
  })
  return out
}

const snapshot = (games) => {
  const m = {}
  games.forEach((g) => { m[gameKey(g)] = g.holes })
  return m
}

export function Live({ data }) {
  const [view, setView] = useState('active')
  const prev = useRef(null)
  const timers = useRef([])
  const [flash, setFlash] = useState({})

  // Each changed cell gets a fresh token; rendering it as part of the React key
  // remounts the span, which restarts the animation even if that same cell was
  // still glowing from the poll before.
  useEffect(() => {
    if (!data) return
    const games = data.games || []
    const hits = changedCells(prev.current, games)
    prev.current = snapshot(games)
    if (!hits.length) return
    const token = Date.now()
    setFlash((f) => {
      const next = { ...f }
      hits.forEach((k) => { next[k] = token })
      return next
    })
    // Each batch expires on its own timer. Cancelling it when the next poll
    // arrives would strand the class on the cell forever whenever two polls
    // land inside the 6s window, so the timers are only cleared on unmount.
    timers.current.push(setTimeout(() => {
      setFlash((f) => {
        const next = {}
        Object.keys(f).forEach((k) => { if (f[k] !== token) next[k] = f[k] })
        return next
      })
    }, FLASH_MS))
  }, [data])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  if (!data) return <p className="status center">Loading live scores…</p>

  const games = data.games || []
  const shown = games.filter((g) => (view === 'active' ? !g.done : g.done))
  const counts = { active: games.filter((g) => !g.done).length, done: games.filter((g) => g.done).length }

  return (
    <section className="live">
      <nav className="live-tabs">
        <button className={view === 'active' ? 'on' : ''} onClick={() => setView('active')}>
          Active <span className="pill">{counts.active}</span>
        </button>
        <button className={view === 'done' ? 'on' : ''} onClick={() => setView('done')}>
          Complete <span className="pill">{counts.done}</span>
        </button>
      </nav>

      <div className="live-scroll">
        <div className="live-head">
          <span className="who" />
          {HOLES.map((h) => <span key={h} className="cell">{h}</span>)}
          <span className="tot">TOT</span>
        </div>

        {shown.length === 0 && (
          <p className="status center">{view === 'active' ? 'No games in progress.' : 'No completed games yet.'}</p>
        )}

        {shown.map((g, i) => {
          // a hole's value is positive when team A scored it, negative for team B
          const side = (h, isA) => (h === null ? '' : isA ? (h > 0 ? h : 0) : (h < 0 ? -h : 0))
          const key = gameKey(g)
          const row = (name, isA, total, won) => (
            <div className={`live-row ${won ? 'win' : ''}`}>
              <span className="who">{name}</span>
              {g.holes.map((h, j) => {
                const lit = flash[`${key}:${j}`]
                return (
                  <span key={lit ? `${j}-${lit}` : j}
                        className={`cell ${h === null ? 'unplayed' : side(h, isA) ? 'scored' : 'zero'}${lit ? ' flash' : ''}`}>
                    {h === null ? '–' : side(h, isA)}
                  </span>
                )
              })}
              <span className="tot">{total}</span>
            </div>
          )
          return (
            <article className="live-game" key={i}>
              {row(g.teamA, true, g.scoreA, g.done && g.scoreA > g.scoreB)}
              {row(g.teamB, false, g.scoreB, g.done && g.scoreB > g.scoreA)}
              {!g.done && <span className="thru">thru {g.played}</span>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
