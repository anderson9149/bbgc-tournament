import { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config.js'
import { fetchTournament, fetchGame, saveHole, finishGame, verifyPin } from './api.js'

const HOLES = 18
const POOLS = ['Orange', 'Red', 'Blue', 'Yellow']
const REMEMBER_KEY = 'bbgc-my-team'
const PIN_KEY = 'bbgc-pin'

export default function ScoreApp() {
  const [tour, setTour] = useState(null)
  const [error, setError] = useState(null)
  const [game, setGame] = useState(null) // null = setup screen

  useEffect(() => {
    if (!API_URL) { setError('API_URL is not configured'); return }
    fetchTournament().then(setTour).catch((e) => setError(e.message))
  }, [])

  return (
    <main className="score-app">
      <header className="top">
        <img className="logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="Barrington Bocce Golf Classic" />
        {game
          ? <button className="exit" onClick={() => setGame(null)}>Exit</button>
          : <div className="sub">Scorekeeper{tour?.year ? <><br />{tour.year}</> : ''}</div>}
      </header>
      {error && <p className="error">{error}</p>}
      {!tour && !error && <p className="muted center">Loading teams…</p>}
      {tour && !game && <Setup tour={tour} onStart={setGame} />}
      {game && <div className="page-title">Score Card</div>}
      {game && <Scoring initial={game} onExit={() => setGame(null)} />}
    </main>
  )
}

// ------------------------------------------------------------ setup

function Setup({ tour, onStart }) {
  const [a, setA] = useState(() => { try { return localStorage.getItem(REMEMBER_KEY) || '' } catch { return '' } })
  const [b, setB] = useState('')
  const [pin, setPin] = useState(() => { try { return localStorage.getItem(PIN_KEY) || '' } catch { return '' } })
  const [existing, setExisting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const teams = useMemo(() => {
    const out = []
    POOLS.forEach((p) => tour.pools[p]?.standings.forEach((r) => r.team && out.push({ team: r.team, pool: p })))
    return out
  }, [tour])
  const poolOf = (t) => teams.find((x) => x.team === t)?.pool

  // Opponents: everyone else in the pool, plus knockout opponents once seeded.
  const opponents = useMemo(() => {
    if (!a) return { pool: [], bracket: [] }
    const p = poolOf(a)
    const pool = teams.filter((x) => x.pool === p && x.team !== a).map((x) => x.team)
    const bracket = []
    tour.bracket.forEach((g) => {
      if (g.teamA === a && g.teamB) bracket.push(g.teamB)
      if (g.teamB === a && g.teamA) bracket.push(g.teamA)
    })
    return { pool, bracket: [...new Set(bracket)].filter((t) => !pool.includes(t)) }
  }, [a, teams, tour])

  useEffect(() => { if (b && ![...opponents.pool, ...opponents.bracket].includes(b)) setB('') }, [a]) // eslint-disable-line

  // Peek at the game so the button can say "Resume".
  useEffect(() => {
    setExisting(null); setErr(null)
    if (!a || !b) return
    let cancelled = false
    fetchGame(a, b).then((g) => { if (!cancelled) setExisting(g) }).catch((e) => { if (!cancelled) setErr(e.message) })
    return () => { cancelled = true }
  }, [a, b])

  const played = existing ? existing.holes.filter((h) => h !== null).length : 0
  const start = async () => {
    setBusy(true); setErr(null)
    try {
      const { ok } = await verifyPin(a, pin)
      if (!ok) throw new Error(`Wrong PIN for ${a}`)
      try { localStorage.setItem(REMEMBER_KEY, a); localStorage.setItem(PIN_KEY, pin) } catch {}
      onStart({ ...(existing || await fetchGame(a, b)), pin })
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <section className="card setup">
      <label>
        <span>Your team</span>
        <select value={a} onChange={(e) => setA(e.target.value)}>
          <option value="">Select team…</option>
          {POOLS.map((p) => (
            <optgroup key={p} label={`${p} pool`}>
              {teams.filter((x) => x.pool === p).map((x) => <option key={x.team} value={x.team}>{x.team}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="pin-row">
        <span>Team PIN</span>
        <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={3} autoComplete="off" placeholder="•••"
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} disabled={!a} />
      </label>
      <div className="vs">vs.</div>
      <label>
        <span>Opponent</span>
        <select value={b} onChange={(e) => setB(e.target.value)} disabled={!a}>
          <option value="">{a ? 'Select opponent…' : 'Pick your team first'}</option>
          {opponents.pool.length > 0 && (
            <optgroup label="Pool play">{opponents.pool.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
          )}
          {opponents.bracket.length > 0 && (
            <optgroup label="Knockout">{opponents.bracket.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
          )}
        </select>
      </label>
      {existing?.done && <p className="muted center">This game is already finished ({existing.scoreA}–{existing.scoreB}). You can still edit it.</p>}
      {err && <p className="error">{err}</p>}
      <button className="primary big" disabled={!a || !b || pin.length !== 3 || busy} onClick={start}>
        {busy ? 'Loading…' : played > 0 && played < HOLES ? `Resume Round (hole ${played + 1})` : played >= HOLES ? 'Review Round' : 'Start Round'}
      </button>
    </section>
  )
}

// ---------------------------------------------------------- scoring

function Scoring({ initial, onExit }) {  // onExit: used by the Final screen
  const [game, setGame] = useState(initial)
  const firstOpen = Math.max(0, game.holes.findIndex((h) => h === null))
  const [hole, setHole] = useState(game.done || firstOpen === -1 ? 1 : firstOpen + 1)
  const [points, setPoints] = useState(0)
  const [winner, setWinner] = useState(null) // 'A' | 'B' | null
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [finished, setFinished] = useState(null)

  // Load whatever is stored for this hole whenever we move to it.
  useEffect(() => {
    const v = game.holes[hole - 1]
    if (v === null || v === undefined) { setPoints(0); setWinner(null) }
    else { setPoints(Math.abs(v)); setWinner(v > 0 ? 'A' : v < 0 ? 'B' : null) }
    setErr(null)
  }, [hole]) // eslint-disable-line

  // Running score: saved holes, with this hole's pending entry substituted in.
  const pending = winner === 'A' ? points : winner === 'B' ? -points : 0
  let scoreA = 0, scoreB = 0
  game.holes.forEach((v, i) => {
    const x = i === hole - 1 ? pending : v
    if (x > 0) scoreA += x; else if (x < 0) scoreB += -x
  })

  const save = async () => {
    if (points > 0 && !winner) { setErr('Tap the team that scored this hole'); return false }
    setSaving(true); setErr(null)
    try {
      const value = winner === 'A' ? points : winner === 'B' ? -points : 0
      const g = await saveHole(game.teamA, game.teamB, hole, value, game.pin)
      setGame({ ...g, pin: game.pin })
      return true
    } catch (e) { setErr(`Couldn't save: ${e.message}`); return false } finally { setSaving(false) }
  }

  const next = async () => {
    if (!(await save())) return
    if (hole < HOLES) setHole(hole + 1)
    else {
      setSaving(true)
      try { setFinished(await finishGame(game.teamA, game.teamB, game.pin)) }
      catch (e) { setErr(`Saved hole 18 but couldn't finish: ${e.message}`) }
      finally { setSaving(false) }
    }
  }

  if (finished) {
    return (
      <section className="card done">
        <h2>Final</h2>
        <div className="teams">
          <div className={finished.scoreA > finished.scoreB ? 'win' : ''}><span className="name">{finished.teamA}</span><span className="pts">{finished.scoreA}</span></div>
          <div className={finished.scoreB > finished.scoreA ? 'win' : ''}><span className="name">{finished.teamB}</span><span className="pts">{finished.scoreB}</span></div>
        </div>
        <p className="muted center">
          {finished.recordedIn ? `Recorded in ${finished.recordedIn} — the results page will update.` : 'Saved. This matchup isn’t listed in PoolGames or BracketGames yet, so enter the final score there by hand.'}
        </p>
        <button className="primary big" onClick={onExit}>Score another game</button>
      </section>
    )
  }

  return (
    <section className="card scoring">
      <div className="hole-row">
        <img className="hole-sign" src={`${import.meta.env.BASE_URL}holes/${String(hole).padStart(2, '0')}.webp`} alt="" />
        <div className="hole-title">Hole {hole}</div>
      </div>
      <div className="teams">
        <div className={winner === 'A' ? 'active' : ''}><span className="name">{game.teamA}</span><span className="pts">{scoreA}</span></div>
        <div className={winner === 'B' ? 'active' : ''}><span className="name">{game.teamB}</span><span className="pts">{scoreB}</span></div>
      </div>

      <div className="points">{points}</div>
      <div className="steppers">
        <button className="circle" onClick={() => setPoints(Math.max(0, points - 1))} disabled={points === 0} aria-label="Minus one">−</button>
        <button className="circle" onClick={() => setPoints(points + 1)} aria-label="Plus one">+</button>
      </div>

      <div className="label">Select Hole Winner</div>
      <div className="toggles">
        <button className={winner === 'A' ? 'on' : ''} onClick={() => { setWinner(winner === 'A' ? null : 'A'); setErr(null) }}>{game.teamA}</button>
        <button className={winner === 'B' ? 'on' : ''} onClick={() => { setWinner(winner === 'B' ? null : 'B'); setErr(null) }}>{game.teamB}</button>
      </div>

      {err && <p className="error">{err}</p>}
      <div className="nav">
        <button onClick={() => setHole(hole - 1)} disabled={hole === 1 || saving}>Previous</button>
        <button className="primary" onClick={next} disabled={saving}>
          {saving ? 'Saving…' : hole < HOLES ? 'Next' : 'Finish Game'}
        </button>
      </div>
    </section>
  )
}
