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
import { API_URL as CONFIGURED_URL } from './config.js'

const API_URL = new URLSearchParams(window.location.search).has('sample') ? '' : CONFIGURED_URL

const BASE = import.meta.env.BASE_URL

export default function App() {
  // ?year=2024 deep-links a past tournament; otherwise the latest year.
  const [year, setYear] = useState(() => new URLSearchParams(window.location.search).get('year'))
  const { data, error, fetchedAt, loading, refresh } = useResults(year)
  const [tab, setTab] = useState('group')
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
  const years = yearsRef.current
  // The year on screen: the loaded one, or the one being fetched.
  const shownYear = data?.year ?? (year ? Number(year) : years?.[0])
  const isCurrentYear = !years || shownYear === years[0]

  // Past years have no Stats or Course Map tab; bounce back to the group stage.
  useEffect(() => {
    if (!isCurrentYear && (tab === 'stats' || tab === 'coursemap' || tab === 'live')) setTab('group')
    if (tab === 'hype' && (isCurrentYear || !hasHype(shownYear))) setTab('group')
  }, [isCurrentYear, tab, shownYear])
  // TV / laptop: fixed 16:9 stage. Phone / portrait tablet: scrolling page.
  const isTV = useMediaQuery('(orientation: landscape) and (min-width: 900px)')
  const scale = useStageScale()

  const bg = `${BASE}bg/${tab}-${isTV ? 'landscape' : 'portrait'}.webp`

  const content = (
    <>
      <nav className="menu">
        <button className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>Group Stage</button>
        <button className={tab === 'knockout' ? 'active' : ''} onClick={() => setTab('knockout')}>Knockout Round</button>
        {isCurrentYear ? (
          <>
            <button className={`refresh ${loading ? 'loading' : ''}`} onClick={refresh} disabled={loading || !API_URL}>
              <span className="icon">↻</span> Refresh
            </button>
            <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Stats</button>
            <button className={tab === 'coursemap' ? 'active' : ''} onClick={() => setTab('coursemap')}>Course Map</button>
            <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>Live</button>
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
      {tab === 'live' ? (
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
        {!API_URL && <span>Sample data · </span>}
        {error && <span>Refresh failed · </span>}
        {fetchedAt && <span>Updated {fetchedAt.toLocaleTimeString()}</span>}
      </footer>
      {popup === 'story' && <Story year={shownYear} messages={data?.ticker} onClose={() => setPopup(null)} />}
      {data && <Ticker key={data.year} messages={data.ticker} tv={isTV} />}
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
    <div className={`mobile tab-${tab}`}>
      <div className="mobile-bg" style={{ backgroundImage: `url(${bg})` }} />
      {content}
    </div>
  )
}
