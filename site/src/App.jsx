import { useState } from 'react'
import { useResults } from './useResults.js'
import { Pools } from './Pools.jsx'
import { Bracket } from './Bracket.jsx'
import { API_URL } from './config.js'

const POOLS = ['Orange', 'Red', 'Blue', 'Yellow']

export default function App() {
  const { data, error, fetchedAt } = useResults()
  const [tab, setTab] = useState('pools')

  if (!data) {
    return (
      <main className="app">
        <header className="topbar"><h1>BBGC</h1></header>
        <p className="status">{error ? `Couldn't load results: ${error}` : 'Loading…'}</p>
      </main>
    )
  }

  const poolsDone = POOLS.filter((p) => data.pools[p]?.complete).length

  return (
    <main className="app">
      <header className="topbar">
        <h1>BBGC</h1>
        <nav className="tabs">
          <button className={tab === 'pools' ? 'active' : ''} onClick={() => setTab('pools')}>
            Pool Play <span className="pill">{poolsDone}/4</span>
          </button>
          <button className={tab === 'bracket' ? 'active' : ''} onClick={() => setTab('bracket')}>
            Bracket
          </button>
        </nav>
      </header>

      {tab === 'pools' ? <Pools pools={data.pools} order={POOLS} /> : <Bracket games={data.bracket} seeded={data.bracketSeeded} />}

      <footer className="status">
        {!API_URL && <span className="warn">Sample data — set API_URL in config.js. </span>}
        {error && <span className="warn">Refresh failed ({error}) — showing last good data. </span>}
        {fetchedAt && <span>Updated {fetchedAt.toLocaleTimeString()}</span>}
      </footer>
    </main>
  )
}
