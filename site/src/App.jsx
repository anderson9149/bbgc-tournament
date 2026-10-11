import { useEffect, useRef, useState } from 'react'
import { useResults } from './useResults.js'
import { useMediaQuery, useStageScale } from './hooks.js'
import { Pools } from './Pools.jsx'
import { Bracket } from './Bracket.jsx'
import { Ticker } from './Ticker.jsx'
import { Stats, useStats } from './Stats.jsx'
import { Overlay, Story } from './Overlay.jsx'
import { CourseMap, useHoles } from './CourseMap.jsx'
import { Live, useLive } from './Live.jsx'
import { Hype, hasHype } from './Hype.jsx'
import { Poem } from './Poem.jsx'
import { Preview } from './Preview.jsx'
import { API_URL as CONFIGURED_URL, IS_WALL, LIVE_YEAR, NEWEST_YEAR, PREVIEW_YEAR, REFRESH_SECONDS } from './config.js'

const API_URL = new URLSearchParams(window.location.search).has('sample') ? '' : CONFIGURED_URL

const BASE = import.meta.env.BASE_URL

// Which tab a year opens on. The bracket, for every year: it carries the
// champion and the trophy photo. The one exception is the year being played
// right now, where the bracket is still empty and the group stage is where
// the movement is — and that exception is per-year, so during a tournament
// the past years still open on their brackets.
const defaultTab = (y) => (LIVE_YEAR !== null && Number(y) === LIVE_YEAR ? 'group' : 'knockout')

export default function App() {
  // ?year=2024 deep-links a past tournament; otherwise the latest year.
  const [year, setYear] = useState(() => new URLSearchParams(window.location.search).get('year'))
  const { data, error, fetchedAt, loading, refresh } = useResults(year)
  const [tab, setTab] = useState(() => defaultTab(year ?? NEWEST_YEAR))
  const [popup, setPopup] = useState(null)   // 'story' | 'map' | null
  const { stats, error: statsError } = useStats()
  const holes = useHoles()
  const live = useLive(tab === 'live')

  const changeYear = (y) => {
    setYear(y)
    const url = new URL(window.location)
    url.searchParams.set('year', y)
    window.history.replaceState(null, '', url)
  }
  // Keep the year list across a reload, so the picker does not vanish while a
  // newly chosen year is still on its way from the sheet.
  const yearsRef = useRef(null)
  if (data?.years?.length) yearsRef.current = [...data.years].sort((a, b) => b - a)
  // The preview year has no sheet, so nothing upstream lists it; it is added here.
  const years = yearsRef.current && (PREVIEW_YEAR === null || yearsRef.current.includes(PREVIEW_YEAR)
    ? yearsRef.current : [PREVIEW_YEAR, ...yearsRef.current])
  // The year on screen: the loaded one, or the one being fetched.
  const shownYear = data?.year ?? (year ? Number(year) : years?.[0])
  const isPreview = PREVIEW_YEAR !== null && shownYear === PREVIEW_YEAR
  const isCurrentYear = !isPreview && (!years || shownYear === years[0] || shownYear === NEWEST_YEAR)

  // Past years have no Stats or Course Map tab; bounce back to the group stage.
  useEffect(() => {
    if (!isCurrentYear && (tab === 'stats' || tab === 'coursemap' || tab === 'live' || tab === 'poem')) setTab(defaultTab(shownYear))
    if (tab === 'hype' && (isCurrentYear || !hasHype(shownYear))) setTab(defaultTab(shownYear))
  }, [isCurrentYear, tab, shownYear])
  // TV / laptop: fixed 16:9 stage. Phone / portrait tablet: scrolling page.
  const isTV = useMediaQuery('(orientation: landscape) and (min-width: 900px)')
  const scale = useStageScale()

  const bg = `${BASE}bg/${isPreview ? 'preview' : tab}-${isTV ? 'landscape' : 'portrait'}.webp`

  const content = (
    <>
      {/* The logo is painted into the background art, so it cannot carry a link
          of its own. This sits invisibly on top of it and goes home. */}
      <a className="home-hit" href={BASE} aria-label="Barrington Bocce Golf Classic — home" />

      <nav className="menu">
        {!isPreview && <>
        {/* Knockout first: it is the tab a year opens on. */}
        <button className={tab === 'knockout' ? 'active' : ''} onClick={() => setTab('knockout')}>Knockout Round</button>
        <button className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>Group Stage</button>
        {isCurrentYear ? (
          <>
            <button className={`refresh ${loading ? 'loading' : ''}`} onClick={refresh} disabled={loading || !API_URL}>
              <span className="icon">↻</span> Refresh
            </button>
            <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Stats</button>
            <button className={tab === 'coursemap' ? 'active' : ''} onClick={() => setTab('coursemap')}>Course Map</button>
            <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>Live</button>
            <button className={tab === 'poem' ? 'active' : ''} onClick={() => setTab('poem')}>Poem</button>
          </>
        ) : (
          <>
            <button className={popup === 'story' ? 'active' : ''} onClick={() => setPopup(popup === 'story' ? null : 'story')}>
              <span className="year-word">{shownYear} </span>Story
            </button>
            {hasHype(shownYear) && (
              <button className={tab === 'hype' ? 'active' : ''} onClick={() => setTab('hype')}>Hype Video</button>
            )}
          </>
        )}
        </>}
        {years && (
          <select className="year" value={shownYear ?? ''} onChange={(e) => changeYear(e.target.value)} aria-label="Tournament year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </nav>

      {/* Stats, the course map and the live board carry their own data, so they
          stay usable while the year payload is still on its way — the sheet can
          take a while when a crowd is on it, and there is no reason for that to
          hold up pages that never needed it. */}
      {isPreview ? (
        <Preview year={shownYear} />
      ) : tab === 'poem' ? (
        <Poem tv={isTV} />
      ) : tab === 'live' ? (
        <Live data={live} />
      ) : tab === 'coursemap' ? (
        <CourseMap holes={holes} tv={isTV} />
      ) : tab === 'stats' ? (
        <Stats stats={stats} error={statsError} tv={isTV} />
      ) : !data ? (
        <p className="status center">{error ? `Couldn't load results: ${error}` : `Loading ${shownYear || ''}…`}</p>
      ) : tab === 'hype' ? (
        <Hype year={data.year} />
      ) : tab === 'group' ? (
        <Pools pools={data.pools} order={Object.keys(data.pools)} tv={isTV} />
      ) : (
        <Bracket games={data.bracket} pools={data.pools} tv={isTV} year={data.year} />
      )}

      <footer className="status">
        {isPreview && <span>Nothing to report yet</span>}
        {!isPreview && !API_URL && <span>Sample data · </span>}
        {!isPreview && error && <span>Refresh failed · </span>}
        {!isPreview && fetchedAt && <span>Updated {fetchedAt.toLocaleTimeString()}</span>}
        {IS_WALL && <span> · wall {REFRESH_SECONDS}s</span>}
      </footer>
      {popup === 'story' && <Story year={shownYear} onClose={() => setPopup(null)} />}
      {data && !isPreview && <Ticker key={data.year} messages={data.ticker} tv={isTV} />}
    </>
  )

  if (isTV) {
    return (
      <div className="tv">
        <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})`, backgroundImage: `url(${bg})` }}>
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className={`mobile tab-${isPreview ? 'preview' : tab}`}>
      <div className="mobile-bg" style={{ backgroundImage: `url(${bg})` }} />
      {content}
    </div>
  )
}
