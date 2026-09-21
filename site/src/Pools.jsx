export function Pools({ pools, order, tv }) {
  return (
    <section className="pools">
      {order.map((name) => <Pool key={name} name={name} pool={pools[name]} tv={tv} />)}
    </section>
  )
}

function Pool({ name, pool, tv }) {
  if (!pool) return null
  // Ties aren't counted server-side; derive them from the games list.
  const ties = {}
  pool.games.forEach((g) => {
    if (g.scoreA != null && g.scoreB != null && g.scoreA === g.scoreB) {
      ties[g.teamA] = (ties[g.teamA] || 0) + 1
      ties[g.teamB] = (ties[g.teamB] || 0) + 1
    }
  })
  const rounds = [...new Set(pool.games.map((g) => g.round))]

  return (
    <article className={`pool pool-${name.toLowerCase()}`}>
      <header>
        <h2>{name}</h2>
        <span className="progress">{pool.complete ? 'FINAL' : `${pool.played}/${pool.total}`}</span>
      </header>
      <table>
        <thead>
          <tr><th>#</th><th className="team">Team</th><th>W</th><th>L</th><th>T</th><th>+/−</th></tr>
        </thead>
        <tbody>
          {pool.standings.map((row) => {
            const t = ties[row.team] || 0
            return (
              <tr key={row.team} className={row.seed <= 3 ? 'advancing' : ''}>
                <td>{row.seed}</td>
                <td className="team">{row.team || <em>TBD</em>}{row.override ? <span className="override" title="Seed set manually">*</span> : null}</td>
                <td>{row.w}</td>
                <td>{row.l}</td>
                <td>{t}</td>
                <td>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {!tv && (
        <details className="games">
          <summary>Games</summary>
          {rounds.map((r) => (
            <div key={r} className="round">
              <h3>Round {r}</h3>
              {pool.games.filter((g) => g.round === r).map((g, i) => <Game key={i} g={g} />)}
            </div>
          ))}
        </details>
      )}
    </article>
  )
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
