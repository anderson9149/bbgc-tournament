import { useEffect, useMemo, useState } from 'react'
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
  const [who, setWho] = useState('')          // '' = All Time, otherwise a team name
  const ranked = useMemo(() => (stats ? [...stats.teams].sort((a, b) => b.w - a.w || a.team.localeCompare(b.team)) : []), [stats])
  if (error) return <p className="status center">{error}</p>
  if (!stats) return <p className="status center">Loading all-time stats…</p>

  const span = stats.years?.length ? `${stats.years[0]}–${stats.years[stats.years.length - 1]}` : null
  const picker = (
    <select className="team-pick" value={who} onChange={(e) => setWho(e.target.value)} aria-label="All-time view">
      <option value="">All Time</option>
      {ranked.map((t) => <option key={t.team} value={t.team}>{t.team}</option>)}
    </select>
  )
  if (who) {
    const t = ranked.find((x) => x.team === who)
    return t ? <TeamCard t={t} picker={picker} span={span} /> : null
  }

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
        <h2>Champions {span && <span className="span">{span}</span>} {picker}</h2>
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

function TeamCard({ t, picker, span }) {
  const rec = `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}`
  const cells = [
    ['Team Record', rec],
    ['Win Percentage', t.pct.toFixed(3).replace(/^0/, '')],
    ['Tournaments Played', `${t.tournaments}`],
    ['Group Titles', `${t.groupTitles}`],
    ['Knockout Appearances', `${t.koYears}`],
    ['Knockout Record', `${t.koW}-${t.koL}`],
  ]
  const h2h = [['Faced Most', t.facedMost], ['Beaten Most', t.beatMost], ['Lost To Most', t.lostMost]]
  return (
    <section className="stats team-view">
      <div className="cabinet team-head">
        <h2>
          <span className="tname">{t.team}</span>
          {t.titles > 0 && <span className="titles">{'🏆'.repeat(Math.min(t.titles, 3))} {t.titleYears.join(' · ')}</span>}
          {picker}
        </h2>
        <span className="span">{t.years.join(' · ')}{span ? ` — all-time ${span}` : ''}</span>
      </div>
      <div className="team-grid">
        <div className="tiles">
          {cells.map(([k, v]) => <div className="tile" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>)}
        </div>
        <article className="board h2h">
          <header><h3>Head to Head</h3><span>recorded games</span></header>
          <ol>{h2h.map(([k, v]) => (
            <li key={k}><span className="team">{k}</span><span className="val">{v || '—'}</span></li>
          ))}</ol>
        </article>
      </div>
      {t.narrative && <div className="narrative"><p>{t.narrative}</p></div>}
    </section>
  )
}
