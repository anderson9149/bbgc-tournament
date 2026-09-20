const ROUNDS = ['Round 1', 'Quarterfinal', 'Semifinal', 'Final']

export function Bracket({ games, seeded }) {
  const champion = games.find((g) => g.round === 'Final')?.winner
  return (
    <section className="bracket-wrap">
      {!seeded && <p className="notice">Bracket will be filled in once pool play is complete.</p>}
      {champion && <p className="champion">🏆 {champion}</p>}
      <div className="bracket">
        {ROUNDS.map((round) => (
          <div key={round} className="column">
            <h2>{round}</h2>
            <div className="matches">
              {games.filter((g) => g.round === round).map((g) => <Match key={g.game} g={g} />)}
            </div>
          </div>
        ))}
      </div>
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
      <span className="name">{team || 'TBD'}{bye && team ? <small> (bye)</small> : null}</span>
      <span className="score">{score ?? ''}</span>
    </div>
  )
}
