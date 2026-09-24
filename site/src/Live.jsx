import { useEffect, useState } from 'react'
import { API_URL } from './config.js'
import sampleLive from './sample-live.json'

const params = new URLSearchParams(window.location.search)
const LIVE = params.has('sample') ? '' : API_URL
const HOLES = Array.from({ length: 18 }, (_, i) => i + 1)

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

export function Live({ data }) {
  const [view, setView] = useState('active')
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
          const row = (name, isA, total, won) => (
            <div className={`live-row ${won ? 'win' : ''}`}>
              <span className="who">{name}</span>
              {g.holes.map((h, j) => (
                <span key={j} className={`cell ${h === null ? 'blank' : side(h, isA) ? 'scored' : 'zero'}`}>
                  {side(h, isA)}
                </span>
              ))}
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
