import { useEffect, useState } from 'react'

export function Pools({ pools, order, tv }) {
  const [open, setOpen] = useState(null)
  return (
    <>
      <section className="pools">
        {order.map((name) => <Pool key={name} name={name} pool={pools[name]} tv={tv} onDetails={() => setOpen(name)} />)}
      </section>
      {open && pools[open] && <PoolDetails name={open} pool={pools[open]} onClose={() => setOpen(null)} />}
    </>
  )
}

// A round robin of n teams is n(n-1)/2 games, so the schedule says how many
// slots a pool holds even before anyone is entered.
function poolSize(total) {
  const n = (1 + Math.sqrt(1 + 8 * (total || 0))) / 2
  return Number.isInteger(n) && n > 1 ? n : 6
}

function Pool({ name, pool, tv, onDetails }) {
  if (!pool) return null
  // Older deployments don't send ties; derive them from the games list.
  const ties = {}
  pool.games.forEach((g) => {
    if (g.scoreA != null && g.scoreB != null && g.scoreA === g.scoreB) {
      ties[g.teamA] = (ties[g.teamA] || 0) + 1
      ties[g.teamB] = (ties[g.teamB] || 0) + 1
    }
  })

  // Before a ball is thrown the sheet may hold no teams at all, or only some of
  // them. Fill the rest of the card with TBD so an empty group reads as "not
  // drawn yet" rather than a broken box. Once a game is played the table shows
  // exactly what is there — a group that really ran short stays short.
  const rows = [...pool.standings]
  if (pool.played === 0) {
    for (let i = rows.length; i < poolSize(pool.total); i++) {
      rows.push({ team: '', seed: i + 1, w: 0, l: 0, t: 0, diff: 0, placeholder: true })
    }
  }

  return (
    <article className={`pool pool-${name.toLowerCase()}`}>
      <header>
        <h2>{name} <span className="progress">({pool.complete ? 'Final' : `${pool.played}/${pool.total}`})</span></h2>
        {tv && <button className="details-btn" onClick={onDetails}>Details…</button>}
      </header>
      <table>
        <thead>
          <tr><th>#</th><th className="team">Team</th><th>W</th><th>L</th><th>T</th><th>+/−</th></tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const t = row.t ?? ties[row.team] ?? 0
            return (
              <tr key={row.team || `tbd-${i}`} className={row.seed <= 3 && !row.placeholder ? 'advancing' : ''}>
                <td>{row.seed}</td>
                <td className="team">{row.team || <em>TBD</em>}{row.override ? <span className="override" title="Seed set manually">*</span> : null}</td>
                <td>{row.placeholder ? '' : row.w}</td>
                <td>{row.placeholder ? '' : row.l}</td>
                <td>{row.placeholder ? '' : t}</td>
                <td title={row.recordOverride ? 'Game scores were not recorded' : undefined}>
                  {row.placeholder ? '' : row.recordOverride ? '—' : row.diff > 0 ? `+${row.diff}` : row.diff}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {!tv && (
        <details className="games">
          <summary>Games</summary>
          <GameList games={pool.games} />
        </details>
      )}
    </article>
  )
}

function GameList({ games }) {
  const rounds = [...new Set(games.map((g) => g.round))]
  return rounds.map((r) => (
    <div key={r} className="round">
      <h3>Round {r}</h3>
      {games.filter((g) => g.round === r).map((g, i) => <Game key={i} g={g} />)}
    </div>
  ))
}

function Game({ g }) {
  const played = g.scoreA != null && g.scoreB != null
  const aWins = played && g.scoreA > g.scoreB
  const bWins = played && g.scoreB > g.scoreA
  return (
    <div className={`game ${played ? 'played' : ''}`}>
      <span className={`name ${aWins ? 'win' : ''}`}>{g.teamA || '—'}</span>
      <span className="score">{played ? `${g.scoreA} – ${g.scoreB}` : 'vs'}</span>
      <span className={`name right ${bWins ? 'win' : ''}`}>{g.teamB || '—'}</span>
    </div>
  )
}

// Popup with every game in the pool (TV layout). Esc, ✕ or the backdrop closes it.
function PoolDetails({ name, pool, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal pool-${name.toLowerCase()}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${name} results`}>
        <header>
          <h2>{name} — Results</h2>
          <span className="progress">{pool.complete ? 'FINAL' : `${pool.played}/${pool.total}`}</span>
          <button className="close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="modal-body">
          <GameList games={pool.games} />
        </div>
      </div>
    </div>
  )
}
