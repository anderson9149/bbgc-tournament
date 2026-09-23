import { useEffect, useState } from 'react'
import { API_URL, REFRESH_SECONDS } from './config.js'
import sampleStats from './sample-stats.json'

const params = new URLSearchParams(window.location.search)
const LIVE = params.has('sample') ? '' : API_URL

// All-time table, built by BBGC > Rebuild all-time stats and cached by the script.
export function useStats() {
  const [state, setState] = useState({ stats: LIVE ? null : sampleStats, error: null })
  useEffect(() => {
    if (!LIVE) return
    let cancelled = false
    fetch(`${LIVE}?action=stats`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) d.error ? setState({ stats: null, error: d.error }) : setState({ stats: d, error: null }) })
      .catch((e) => { if (!cancelled) setState({ stats: null, error: e.message }) })
    return () => { cancelled = true }
  }, [])
  return state
}

const MIN_GAMES = 15   // keep one-off teams out of the percentage table

export function Stats({ stats, error, tv }) {
  if (error) return <p className="status center">{error}</p>
  if (!stats) return <p className="status center">Loading all-time stats…</p>

  const teams = stats.teams
  const champs = teams.filter((t) => t.titles > 0).sort((a, b) => b.titles - a.titles || a.titleYears[0] - b.titleYears[0])
  const top = (key, cmp, filter) => [...(filter ? teams.filter(filter) : teams)].sort(cmp).slice(0, tv ? 6 : 8)

  const boards = [
    { title: 'Most Wins', note: 'group + knockout',
      rows: top('w', (a, b) => b.w - a.w || b.pct - a.pct),
      value: (t) => `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}` },
    { title: 'Best Win %', note: `${MIN_GAMES}+ games`,
      rows: top('pct', (a, b) => b.pct - a.pct || b.w - a.w, (t) => t.w + t.l + t.t >= MIN_GAMES),
      value: (t) => t.pct.toFixed(3).replace(/^0/, '') },
    { title: 'Knockout Appearances', note: 'years reaching the bracket',
      rows: top('koYears', (a, b) => b.koYears - a.koYears || b.w - a.w),
      value: (t) => `${t.koYears} of ${t.tournaments}` },
    { title: 'Knockout Record', note: 'bracket games only',
      rows: top('koW', (a, b) => b.koW - a.koW || a.koL - b.koL),
      value: (t) => `${t.koW}-${t.koL}` },
    { title: 'Tournaments Played', note: 'years in the field',
      rows: top('tournaments', (a, b) => b.tournaments - a.tournaments || b.w - a.w),
      value: (t) => `${t.tournaments}` },
    { title: 'Group Titles', note: 'finished 1st in group',
      rows: top('groupTitles', (a, b) => b.groupTitles - a.groupTitles || b.w - a.w),
      value: (t) => `${t.groupTitles}` },
  ]

  return (
    <section className="stats">
      <div className="cabinet">
        <h2>Champions</h2>
        <div className="cups">
          {champs.map((c) => (
            <div key={c.team} className={`cup ${c.titles > 1 ? 'multi' : ''}`}>
              <span className="n">{c.titles > 1 ? `×${c.titles}` : '🏆'}</span>
              <span className="who">{c.team}</span>
              <span className="when">{c.titleYears.join(' · ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="boards">
        {boards.map((b) => (
          <article className="board" key={b.title}>
            <header><h3>{b.title}</h3><span>{b.note}</span></header>
            <ol>
              {b.rows.map((t, i) => (
                <li key={t.team}>
                  <span className="rank">{i + 1}</span>
                  <span className="team">{t.team}</span>
                  <span className="val">{b.value(t)}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  )
}
