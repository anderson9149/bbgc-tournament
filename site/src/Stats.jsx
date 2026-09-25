import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { API_URL } from './config.js'
import sampleStats from './sample-stats.json'
import rosters from '../../history/team-rosters.json'
import { Overlay } from './Overlay.jsx'

const params = new URLSearchParams(window.location.search)
const LIVE = params.has('sample') ? '' : API_URL
const BASE = import.meta.env.BASE_URL

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

// [2018,2019,2020,2021,2023,2024,2025] -> "2018–2021, 2023–2025"
function yearSpans(years) {
  if (!years?.length) return ''
  const ys = [...new Set(years)].sort((a, b) => a - b)
  const out = []
  let start = ys[0], end = ys[0]
  for (let i = 1; i <= ys.length; i++) {
    if (ys[i] === end + 1) { end = ys[i]; continue }
    out.push(start === end ? `${start}` : `${start}–${end}`)
    start = end = ys[i]
  }
  return out.join(', ')
}

// Head-to-head only counts games whose score was recorded. Some years came off
// a poster with records but no matchups, so say plainly what is behind it.
function h2hCoverage(stats) {
  const ko = yearSpans(stats.h2h?.ko || stats.years)
  const group = yearSpans(stats.h2h?.group || stats.years)
  const parts = []
  if (ko) parts.push(`knockout rounds ${ko}`)
  if (group) parts.push(`group play ${group}`)
  if (!parts.length) return null
  return `*Head to head counts only games with a recorded score — ${parts.join(', ')}.`
}

const TABS = [['all', 'All Time'], ['teams', 'Teams'], ['individual', 'Individual']]

// 2016 and 2017 were played but never written down, so their champions live in
// the roster file. They count towards trophies without pretending there are
// games behind them.
const earlyTitles = (team) => rosters[team]?.titles || []

function titleYearsFor(t) {
  const all = new Set([...(t.titleYears || []), ...earlyTitles(t.team)])
  return [...all].sort((a, b) => a - b)
}

// Champions from the all-time table, plus any pre-record winner missing from it.
function championsOf(teams) {
  const known = new Set(teams.map((t) => t.team))
  const extra = Object.keys(rosters)
    .filter((name) => !known.has(name) && earlyTitles(name).length)
    .map((name) => ({ team: name, titleYears: earlyTitles(name), w: 0, l: 0, t: 0 }))
  return [...teams, ...extra]
    .map((t) => ({ ...t, titleYears: titleYearsFor(t) }))
    .filter((t) => t.titleYears.length)
    .map((t) => ({ ...t, titles: t.titleYears.length }))
    .sort((a, b) => b.titles - a.titles || a.titleYears[0] - b.titleYears[0])
}

// Years that carry a trophy but no game record.
function unrecordedTitleYears(stats) {
  const recorded = new Set(stats.years || [])
  const out = new Set()
  Object.keys(rosters).forEach((name) => earlyTitles(name).forEach((y) => { if (!recorded.has(y)) out.add(y) }))
  return [...out].sort((a, b) => a - b)
}

export function Stats({ stats, error, tv }) {
  const [view, setView] = useState('all')
  const [story, setStory] = useState(null)   // the team whose full narrative is open
  const ranked = useMemo(() => (stats ? [...stats.teams].sort((a, b) => b.w - a.w || a.team.localeCompare(b.team)) : []), [stats])
  if (error) return <p className="status center">{error}</p>
  if (!stats) return <p className="status center">Loading all-time stats…</p>

  const span = stats.years?.length ? `${stats.years[0]}–${stats.years[stats.years.length - 1]}` : null
  const early = unrecordedTitleYears(stats)
  const note = span ? (
    <p className="stats-note">
      *Records only encompass BBGC modern era {span}
      {early.length ? `; ${early.join(' and ')} ${early.length > 1 ? 'were' : 'was'} played but never recorded, so only the trophy counts` : ''}
    </p>
  ) : null

  const tabs = (
    <nav className="stats-tabs">
      {TABS.map(([id, label]) => (
        <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{label}</button>
      ))}
    </nav>
  )

  return (
    <section className={`stats view-${view}`}>
      {tabs}
      {view === 'all' && <AllTime stats={stats} tv={tv} note={note} />}
      {view === 'teams' && <TeamList teams={ranked} h2hNote={h2hCoverage(stats)} onStory={setStory} />}
      {view === 'individual' && <Individuals players={stats.players} />}
      {story && (
        <Overlay title={story.team} subtitle="the write-up" onClose={() => setStory(null)} className="story">
          <p>{story.narrative}</p>
        </Overlay>
      )}
    </section>
  )
}

// ------------------------------------------------------------ all time

function AllTime({ stats, tv, note }) {
  const teams = stats.teams
  const champs = championsOf(teams)
  const top = (cmp, filter) => [...(filter ? teams.filter(filter) : teams)].sort(cmp).slice(0, tv ? 6 : 8)

  const boards = [
    { title: 'Most Wins', note: 'group + knockout',
      rows: top((a, b) => b.w - a.w || b.pct - a.pct),
      value: (t) => `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}` },
    { title: 'Best Win %', note: `${MIN_GAMES}+ games`,
      rows: top((a, b) => b.pct - a.pct || b.w - a.w, (t) => t.w + t.l + t.t >= MIN_GAMES),
      value: (t) => t.pct.toFixed(3).replace(/^0/, '') },
    { title: 'Knockout Appearances', note: 'years reaching the bracket',
      rows: top((a, b) => b.koYears - a.koYears || b.w - a.w),
      value: (t) => `${t.koYears} of ${t.tournaments}` },
    { title: 'Knockout Record', note: 'bracket games only',
      rows: top((a, b) => b.koW - a.koW || a.koL - b.koL),
      value: (t) => `${t.koW}-${t.koL}` },
    { title: 'Tournaments Played', note: 'years in the field',
      rows: top((a, b) => b.tournaments - a.tournaments || b.w - a.w),
      value: (t) => `${t.tournaments}` },
    { title: 'Group Titles', note: 'finished 1st in group',
      rows: top((a, b) => b.groupTitles - a.groupTitles || b.w - a.w),
      value: (t) => `${t.groupTitles}` },
  ]

  return (
    <>
      <div className="cabinet">
        <h2>Champions</h2>
        <div className="cups">
          {champs.map((c) => (
            <div key={c.team} className={`cup ${c.titles > 1 ? 'multi' : ''}`}>
              {c.titles > 1 && <span className="n">×{c.titles}</span>}
              {c.titles === 1 && <span className="n">🏆</span>}
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
                <li key={t.team}><span className="rank">{i + 1}</span><span className="team">{t.team}</span><span className="val">{b.value(t)}</span></li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      {note}
    </>
  )
}

// -------------------------------------------------------- individual

// Every column is a total of the teams the player has played for, so the
// headings match the Teams view. Written by BBGC > Rebuild all-time stats.
const PLAYER_COLS = [
  ['Record', (p) => `${p.w}-${p.l}${p.t ? `-${p.t}` : ''}`, 'num'],
  ['Win %', (p) => p.pct.toFixed(3).replace(/^0/, ''), 'num'],
  ['Played', (p) => p.tournaments, 'num'],
  ['Titles', (p) => p.titles || '—', 'num'],
  ['Group Titles', (p) => p.groupTitles, 'num'],
  ['KO Years', (p) => p.koYears, 'num'],
  ['KO Record', (p) => `${p.koW}-${p.koL}`, 'num'],
]

function Individuals({ players }) {
  if (!players?.length) {
    return <p className="status center">No individual records yet — run BBGC &gt; Rebuild all-time stats.</p>
  }
  return (
    <div className="player-grid">
      <div className="pg-row pg-head">
        <span className="pg-name">Player</span>
        {PLAYER_COLS.map(([label]) => <span key={label} className="num">{label}</span>)}
      </div>
      {players.map((p) => (
        <div className="pg-row" key={p.player}>
          <span className="pg-name">
            <strong>{p.player}</strong>
            <small>{p.teams.join(' · ')}</small>
          </span>
          {PLAYER_COLS.map(([label, val]) => (
            <span key={label} className="num" data-label={label}>{val(p)}</span>
          ))}
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------- teams

function TeamList({ teams, h2hNote, onStory }) {
  return (
    <div className="team-list">
      {teams.map((t) => <TeamRow key={t.team} t={t} h2hNote={h2hNote} onStory={onStory} />)}
    </div>
  )
}

function TeamRow({ t, h2hNote, onStory }) {
  const rec = `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}`
  const photo = rosters[t.team]?.photo
  const players = rosters[t.team]?.players?.filter(Boolean) || []
  const titleYears = titleYearsFor(t)
  const stats = [
    ['Record', rec],
    ['Win %', t.pct.toFixed(3).replace(/^0/, '')],
    ['Played', `${t.tournaments}`],
    ['Group Titles', `${t.groupTitles}`],
    ['KO Years', `${t.koYears}`],
    ['KO Record', `${t.koW}-${t.koL}`],
  ]
  const h2h = [['Faced Most', t.facedMost], ['Beaten Most', t.beatMost], ['Lost To Most', t.lostMost]]

  return (
    <article className="team-row">
      <header className="tr-head">
        <span className="tname">{t.team}</span>
        {players.length > 0 && <span className="who">({players.join(' and ')})</span>}
        {titleYears.length > 0 && (
          <span className="titles">{'🏆'.repeat(Math.min(titleYears.length, 3))} {titleYears.join(' · ')}</span>
        )}
        <span className="span">{t.years.join(' · ')}</span>
      </header>

      <div className="tr-main">
        <div className="tr-photo-wrap">
          {photo
            ? <img className="tr-photo" src={`${BASE}teams/${photo}`} alt={t.team} loading="lazy" />
            : <div className="tr-photo empty" aria-label="No photo yet" />}
        </div>

        <div className="tr-stats">
          {stats.map(([k, v]) => <div className="tr-stat" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>)}
        </div>

        <div className="tr-body">
        <article className="board h2h">
          <header><h3>Head to Head</h3><span>recorded games</span></header>
          <ol>{h2h.map(([k, v]) => (
            <li key={k}><span className="team">{k}</span><span className="val">{v || '—'}</span></li>
          ))}</ol>
          {h2hNote && <p className="h2h-note">{h2hNote}</p>}
        </article>
        <Narrative text={t.narrative} onMore={() => onStory(t)} />
        </div>
      </div>
    </article>
  )
}

// Clamped write-up. "more…" only appears when the text is actually cut off,
// which depends on the box it lands in, so it is measured rather than guessed.
function Narrative({ text, onMore }) {
  const ref = useRef(null)
  const [clipped, setClipped] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setClipped(el.scrollHeight - el.clientHeight > 2)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])
  if (!text) return null
  return (
    <div className="tr-narr">
      <p ref={ref}>{text}</p>
      {clipped && <button className="more" onClick={onMore}>more…</button>}
    </div>
  )
}
