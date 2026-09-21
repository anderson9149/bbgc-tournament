const ROUNDS = ['Round 1', 'Quarterfinal', 'Semifinal', 'Final']

export function Bracket({ games, seeded, tv }) {
  const champion = games.find((g) => g.round === 'Final')?.winner
  return (
    <section className="bracket">
      {!seeded && <p className="notice">Bracket will be filled in once the group stage is complete.</p>}
      {champion && !tv && <p className="champion-banner">🏆 {champion}</p>}
      {ROUNDS.map((round) => (
        <div key={round} className={`column col-${round.toLowerCase().replace(' ', '')}`}>
          <h2>{round}</h2>
          <div className="matches">
            {games.filter((g) => g.round === round).map((g) => <Match key={g.game} g={g} />)}
          </div>
        </div>
      ))}
      {champion && tv && <div className="plaque">{champion}</div>}
    </section>
  )
}

function Match({ g }) {
  const played = g.scoreA != null && g.scoreB != null
  return (
    <div className="match">
      <Slot team={g.teamA} score={g.scoreA} win={played && g.scoreA > g.scoreB} bye={g.round === 'Quarterfinal'} />
      <Slot team={g.teamB} score={g.scoreB} win={played && g.scoreB > g.scoreA} />
    </div>
  )
}

function Slot({ team, score, win, bye }) {
  return (
    <div className={`slot ${win ? 'win' : ''} ${team ? '' : 'empty'}`}>
      <span className="name">{team || 'TBD'}</span>
      <span className="score">{score ?? (bye && team ? <small>bye</small> : '')}</span>
    </div>
  )
}
