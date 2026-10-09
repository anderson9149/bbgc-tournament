const BASE = import.meta.env.BASE_URL
const VIDEO = '4YB0z163wqg'

// Measured off the artwork, which is cropped to the parchment itself: the
// compass rose sits at 11.9% / 19.3% and is 17.2% of the width across.
const COMPASS = { left: 11.93, top: 19.28, size: 17.24 }

const STANZAS = [
  ['In the spirit of leisure I see no deeper',
   'Meaning of life so please sir',
   'Hand me a beer, a bocce, and steer',
   'Me to the path of the tee sir'],
  ['What glorious rounds we shall play through the day',
   'At the LNCC not a fuck to be gave'],
  ['For The Cup we all quest, in questionable dress',
   'Psychotic to some, to others grotesque',
   'When the sun doth set',
   'At dusk I detest',
   'Any golfer that stands in my way'],
  ['From the bad first bounce, to the 2-point trounce',
   'From the 1st to 18th, may each hole beckon thee',
   'Boccemens balls to the closet of calls',
   'And when the FAT lady sings may she gargle them all'],
  ['So drown all your sins, fill em with grins, cause even as losers, at Ty’s we all win!'],
  ['Raise your glasses, gentlemen, to the XX annual',
   'Roll in the grass and drink like animals',
   'Till inebriated we sleep, toss ’em with ease',
   'Cheers to the BBGC!!'],
]

function Verse() {
  return (
    <div className="poem-text">
      {STANZAS.map((lines, i) => (
        <p key={i}>{lines.map((l, j) => <span key={j}>{l}</span>)}</p>
      ))}
    </div>
  )
}

function Compass() {
  return (
    <div className="poem-compass"
         style={{ left: `${COMPASS.left}%`, top: `${COMPASS.top}%`, width: `${COMPASS.size}%` }}>
      <iframe
        // cc_load_policy=0 stops captions loading by default, iv_load_policy=3
        // drops annotations. Both would sit over a 200px circle.
        src={`https://www.youtube-nocookie.com/embed/${VIDEO}?rel=0&modestbranding=1&cc_load_policy=0&iv_load_policy=3&playsinline=1`}
        title="Bauman reads the poem"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

export function Poem({ tv }) {
  // On the stage the verse sits on the parchment, clear of the compass. A
  // phone has nothing like the room, so the map keeps the compass and the
  // verse goes underneath where it can be read.
  if (!tv) {
    return (
      <section className="poem poem-mobile">
        <div className="poem-map">
          <img src={`${BASE}poem-map.webp`} alt="" />
          <Compass />
        </div>
        <Verse />
      </section>
    )
  }
  return (
    <section className="poem poem-tv">
      <div className="poem-map">
        <img src={`${BASE}poem-map.webp`} alt="" />
        <Compass />
        <Verse />
      </div>
    </section>
  )
}
