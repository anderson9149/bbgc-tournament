import { useState } from 'react'
import { useResults } from './useResults.js'
import { useMediaQuery, useStageScale } from './hooks.js'
import { Pools } from './Pools.jsx'
import { Bracket } from './Bracket.jsx'
import { Ticker } from './Ticker.jsx'
import { Stats, useStats } from './Stats.jsx'
import { API_URL as CONFIGURED_URL } from './config.js'

const API_URL = new URLSearchParams(window.location.search).has('sample') ? '' : CONFIGURED_URL

const BASE = import.meta.env.BASE_URL

export default function App() {
  // ?year=2024 deep-links a past tournament; otherwise the latest year.
  const [year, setYear] = useState(() => new URLSearchParams(window.location.search).get('year'))
  const { data, error, fetchedAt, loading, refresh } = useResults(year)
  const [tab, setTab] = useState('group')
  const { stats, error: statsError } = useStats()

  const changeYear = (y) => {
    setYear(y)
    const url = new URL(window.location)
    url.searchParams.set('year', y)
    window.history.replaceState(null, '', url)
  }
  const years = data?.years?.length ? [...data.years].sort((a, b) => b - a) : null
  // TV / laptop: fixed 16:9 stage. Phone / portrait tablet: scrolling page.
  const isTV = useMediaQuery('(orientation: landscape) and (min-width: 900px)')
  const scale = useStageScale()

  const bg = `${BASE}bg/${tab}-${isTV ? 'landscape' : 'portrait'}.webp`

  const content = (
    <>
      <nav className="menu">
        <button className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>Group Stage</button>
        <button className={tab === 'knockout' ? 'active' : ''} onClick={() => setTab('knockout')}>Knockout Round</button>
        <button className={`refresh ${loading ? 'loading' : ''}`} onClick={refresh} disabled={loading || !API_URL}>
          <span className="icon">↻</span> Refresh
        </button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>All-Time</button>
        {years && (
          <select className="year" value={data.year} onChange={(e) => changeYear(e.target.value)} aria-label="Tournament year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </nav>

      {!data ? (
        <p className="status center">{error ? `Couldn't load results: ${error}` : 'Loading…'}</p>
      ) : tab === 'stats' ? (
        <Stats stats={stats} error={statsError} tv={isTV} />
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
      {data && <Ticker messages={data.ticker} />}
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
