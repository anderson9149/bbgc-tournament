const ROUNDS = ['Round 1', 'Quarterfinal', 'Semifinal', 'Final']
const POOL_LETTER = { Orange: 'O', Red: 'R', Blue: 'B', Yellow: 'Y' }

// TV layout, in 1920x1080 stage units relative to the bracket box.
const COL_X = [0, 335, 670, 1005]
const CARD_W = 320
const CARD_H = 150
const AREA_H = 700
const CENTERS = {
  'Round 1': [1, 3, 5, 7].map((n) => (AREA_H / 8) * n),
  'Quarterfinal': [1, 3, 5, 7].map((n) => (AREA_H / 8) * n),
  'Semifinal': [2, 6].map((n) => (AREA_H / 8) * n),
  'Final': [AREA_H / 2],
}

export function Bracket({ games, tv }) {
  const champion = games.find((g) => g.round === 'Final')?.winner

  // "O2", "R3"… from the slot a team was seeded into, so later rounds can show it.
  const seedOf = {}
  games.forEach((g) => {
    if (g.slotA && !g.slotA.startsWith('W') && g.teamA) seedOf[g.teamA] = shortSeed(g.slotA)
    if (g.slotB && !g.slotB.startsWith('W') && g.teamB) seedOf[g.teamB] = shortSeed(g.slotB)
  })

  return (
    <section className="bracket">
      {champion && !tv && <p className="champion-banner">🏆 {champion}</p>}
      {tv && <Connectors />}
      {ROUNDS.map((round, ci) => (
        <div key={round} className={`column col-${round.toLowerCase().replace(' ', '')}`} style={tv ? { left: COL_X[ci] } : undefined}>
          <div className="matches">
            {games.filter((g) => g.round === round).map((g, i) => (
              <Match key={g.game} g={g} seedOf={seedOf}
                style={tv ? { top: CENTERS[round][i] - CARD_H / 2 } : undefined} />
            ))}
          </div>
        </div>
      ))}
      {champion && tv && <div className="plaque">{champion}</div>}
    </section>
  )
}

function shortSeed(slot) {
  const [pool, n] = slot.split('#')
  return (POOL_LETTER[pool] || pool[0]) + n
}

function Match({ g, seedOf, style }) {
  const played = g.scoreA != null && g.scoreB != null
  return (
    <div className="match" style={style}>
      <div className="match-head">
        <span>{g.round}</span>
        <span className="game">Game {g.game}</span>
      </div>
      <Slot team={g.teamA} seed={seedOf[g.teamA]} score={g.scoreA} played={played} win={played && g.scoreA > g.scoreB} bye={g.round === 'Quarterfinal'} />
      <Slot team={g.teamB} seed={seedOf[g.teamB]} score={g.scoreB} played={played} win={played && g.scoreB > g.scoreA} />
    </div>
  )
}

function Slot({ team, seed, score, played, win, bye }) {
  const cls = ['slot', team ? '' : 'empty', played ? (win ? 'win' : 'lose') : ''].join(' ')
  return (
    <div className={cls}>
      <span className="seed">{team ? seed || '' : ''}</span>
      <span className="name">{team || 'TBD'}</span>
      {bye && team && !played ? <span className="bye">Bye</span> : <span className="score">{score ?? ''}</span>}
    </div>
  )
}

// White bracket lines between the columns (TV only).
function Connectors() {
  const d = []
  const stub = 15
  // Round 1 -> Quarterfinal: straight across (same row).
  CENTERS['Round 1'].forEach((y) => d.push(`M${COL_X[0] + CARD_W},${y} H${COL_X[1]}`))
  // Quarterfinal pairs -> Semifinal, Semifinal pair -> Final.
  const join = (fromRound, toRound, fromCol, toCol) => {
    const from = CENTERS[fromRound], to = CENTERS[toRound]
    to.forEach((ty, j) => {
      const a = from[2 * j], b = from[2 * j + 1]
      const x1 = COL_X[fromCol] + CARD_W, xm = x1 + stub
      d.push(`M${x1},${a} H${xm} V${b} H${x1}`)
      d.push(`M${xm},${ty} H${COL_X[toCol]}`)
    })
  }
  join('Quarterfinal', 'Semifinal', 1, 2)
  join('Semifinal', 'Final', 2, 3)
  return (
    <svg className="connectors" viewBox={`0 0 1325 ${AREA_H}`} width="1325" height={AREA_H} aria-hidden="true">
      <path d={d.join(' ')} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3" />
    </svg>
  )
}
