import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../config.js'
import { fetchGame, saveHole, finishGame, login } from './api.js'

const HOLES = 18
const PIN_KEY = 'bbgc-pin'
const BASE = import.meta.env.BASE_URL

export default function ScoreApp() {
  const [game, setGame] = useState(null) // null = setup screen
  const [year, setYear] = useState(null)

  return (
    <main className="score-app">
      <header className="top">
        <img className="logo" src={`${BASE}logo.png`} alt="Barrington Bocce Golf Classic" />
        {game
          ? <button className="exit" onClick={() => setGame(null)}>Exit</button>
          : <div className="sub">Scorekeeper{year ? <><br />{year}</> : ''}</div>}
      </header>
      {!API_URL && <p className="error">API_URL is not configured</p>}
      {!game && <Setup onStart={setGame} onYear={setYear} />}
      {game && <div className="page-title">Score Card</div>}
      {game && <Scoring initial={game} onExit={() => setGame(null)} />}
    </main>
  )
}

// ------------------------------------------------------------ setup

function Setup({ onStart, onYear }) {
  const [pin, setPin] = useState(() => { try { return localStorage.getItem(PIN_KEY) || '' } catch { return '' } })
  const [me, setMe] = useState(null)      // { team, pool, opponents } once the PIN checks out
  const [b, setB] = useState('')
  const [existing, setExisting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const a = me?.team || ''

  // PIN -> team + opponents. Runs once 4 digits are in (and on load if remembered).
  useEffect(() => {
    setMe(null); setB(''); setErr(null)
    if (pin.length !== 4) return
    let cancelled = false
    setBusy(true)
    login(pin)
      .then((who) => {
        if (cancelled) return
        setMe(who); onYear(who.year)
        try { localStorage.setItem(PIN_KEY, pin) } catch {}
      })
      .catch((e) => { if (!cancelled) setErr(e.message) })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [pin]) // eslint-disable-line

  // Peek at the game so the button can say "Resume".
  useEffect(() => {
    setExisting(null)
    if (!a || !b) return
    let cancelled = false
    fetchGame(a, b).then((g) => { if (!cancelled) setExisting(g) }).catch((e) => { if (!cancelled) setErr(e.message) })
    return () => { cancelled = true }
  }, [a, b])

  const played = existing ? existing.holes.filter((h) => h !== null).length : 0
  const start = async () => {
    setBusy(true); setErr(null)
    try { onStart({ ...(existing || await fetchGame(a, b)), pin }) }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const forget = () => { setPin(''); try { localStorage.removeItem(PIN_KEY) } catch {} }
  const opp = me?.opponents || { pool: [], bracket: [] }

  return (
    <section className="card setup">
      <label className="pin-row">
        <span>Enter your team PIN</span>
        <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" placeholder="••••" autoFocus={!pin}
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} disabled={!!me} />
      </label>
      {busy && !me && <p className="muted center">Checking…</p>}

      {me && (
        <>
          <div className="me">
            <span className="muted">Your team</span>
            <strong>{me.team}</strong>
            <span className="muted">{me.pool} pool</span>
            <button className="link inline" onClick={forget}>Not you?</button>
          </div>
          <div className="vs">vs.</div>
          <label>
            <span>Opponent</span>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">Select opponent…</option>
              {opp.pool.length > 0 && (
                <optgroup label="Pool play">{opp.pool.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
              )}
              {opp.bracket.length > 0 && (
                <optgroup label="Knockout">{opp.bracket.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
              )}
            </select>
          </label>
          {existing?.done && <p className="muted center">This game is already finished ({existing.scoreA}–{existing.scoreB}). You can still edit it.</p>}
        </>
      )}

      {err && <p className="error">{err}</p>}
      {me && (
        <button className="primary big" disabled={!b || busy} onClick={start}>
          {busy ? 'Loading…' : played > 0 && played < HOLES ? `Resume Round (hole ${played + 1})` : played >= HOLES ? 'Review Round' : 'Start Round'}
        </button>
      )}
    </section>
  )
}

// ---------------------------------------------------------- scoring

function Scoring({ initial, onExit }) {
  const [holes, setHoles] = useState(initial.holes)   // local copy is the source of truth
  const firstOpen = holes.findIndex((h) => h === null)
  const [hole, setHole] = useState(initial.done || firstOpen === -1 ? 1 : firstOpen + 1)
  const [points, setPoints] = useState(0)
  const [winner, setWinner] = useState(null) // 'A' | 'B' | null
  const [err, setErr] = useState(null)
  const [finished, setFinished] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [pending, setPending] = useState(0)     // saves in flight
  const [failed, setFailed] = useState({})      // hole -> value that didn't save
  const inflight = useRef([])
  const { teamA, teamB, pin } = initial

  // Load whatever is stored for this hole whenever we move to it.
  useEffect(() => {
    const v = holes[hole - 1]
    if (v === null || v === undefined) { setPoints(0); setWinner(null) }
    else { setPoints(Math.abs(v)); setWinner(v > 0 ? 'A' : v < 0 ? 'B' : null) }
    setErr(null)
  }, [hole]) // eslint-disable-line

  // Running score: saved holes, with this hole's pending entry substituted in.
  const current = winner === 'A' ? points : winner === 'B' ? -points : 0
  let scoreA = 0, scoreB = 0
  holes.forEach((v, i) => {
    const x = i === hole - 1 ? current : v
    if (x > 0) scoreA += x; else if (x < 0) scoreB += -x
  })

  // Optimistic: update locally, write in the background, remember failures.
  const save = (h, value) => {
    setHoles((prev) => prev.map((v, i) => (i === h - 1 ? value : v)))
    setFailed((f) => { const n = { ...f }; delete n[h]; return n })
    setPending((n) => n + 1)
    const p = saveHole(teamA, teamB, h, value, pin)
      .catch(() => setFailed((f) => ({ ...f, [h]: value })))
      .finally(() => { setPending((n) => n - 1); inflight.current = inflight.current.filter((x) => x !== p) })
    inflight.current.push(p)
  }

  const next = async () => {
    if (points > 0 && !winner) { setErr('Tap the team that scored this hole'); return }
    save(hole, current)
    if (hole < HOLES) { setHole(hole + 1); return }
    setFinishing(true); setErr(null)
    try {
      await Promise.all(inflight.current)
      if (Object.keys(failed).length) throw new Error('Some holes did not save — retry them first')
      setFinished(await finishGame(teamA, teamB, pin))
    } catch (e) { setErr(`Couldn't finish: ${e.message}`) } finally { setFinishing(false) }
  }

  const failedHoles = Object.keys(failed).map(Number).sort((x, y) => x - y)

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
        <img className="hole-sign" src={`${BASE}holes/${String(hole).padStart(2, '0')}.webp`} alt="" />
        <div className="hole-title">Hole {hole}</div>
      </div>
      <div className="teams">
        <div className={winner === 'A' ? 'active' : ''}><span className="name">{teamA}</span><span className="pts">{scoreA}</span></div>
        <div className={winner === 'B' ? 'active' : ''}><span className="name">{teamB}</span><span className="pts">{scoreB}</span></div>
      </div>

      <div className="points">{points}</div>
      <div className="steppers">
        <button className="circle" onClick={() => setPoints(Math.max(0, points - 1))} disabled={points === 0} aria-label="Minus one">−</button>
        <button className="circle" onClick={() => setPoints(points + 1)} aria-label="Plus one">+</button>
      </div>

      <div className="label">Select Hole Winner</div>
      <div className="toggles">
        <button className={winner === 'A' ? 'on' : ''} onClick={() => { setWinner(winner === 'A' ? null : 'A'); setErr(null) }}>{teamA}</button>
        <button className={winner === 'B' ? 'on' : ''} onClick={() => { setWinner(winner === 'B' ? null : 'B'); setErr(null) }}>{teamB}</button>
      </div>

      {err && <p className="error">{err}</p>}
      {failedHoles.length > 0 && (
        <p className="error">
          Hole {failedHoles.join(', ')} didn't save.{' '}
          <button className="retry" onClick={() => failedHoles.forEach((h) => save(h, failed[h]))}>Retry</button>
        </p>
      )}
      <div className="nav">
        <button onClick={() => setHole(hole - 1)} disabled={hole === 1 || finishing}>Previous</button>
        <button className="primary" onClick={next} disabled={finishing}>
          {finishing ? 'Finishing…' : hole < HOLES ? 'Next' : 'Finish Game'}
        </button>
      </div>
      <div className={`sync ${pending ? 'on' : ''}`}>{pending ? 'Saving…' : 'Saved'}</div>
    </section>
  )
}
