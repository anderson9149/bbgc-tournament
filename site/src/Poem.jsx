const BASE = import.meta.env.BASE_URL
const VIDEO = '4YB0z163wqg'

// Measured off the artwork, which is cropped to the parchment itself: the
// compass rose spans 3.3%-20.5% across, centred at 11.9% / 19.3%. All three
// numbers are percentages of the map's width except `top`, which is of its
// height. The video is drawn wider than the rose so it reads from across the
// room, and nudged right so the circle still lands inside the torn edge.
const COMPASS = {
  // At this size the circle is taller than the rose's distance from the top
  // edge, so it is dropped to 25% to stay on the parchment; it still covers
  // the whole rose.
  tv: { left: 13.5, top: 25, size: 25.86 },
  // A phone stretches the parchment tall to fit the verse, so the painted rose
  // ends up well down the page and badly elongated. The circle follows it down
  // (same `top`) but is pushed right, because at this size it would otherwise
  // hang off the torn edge.
  mobile: { left: 25, top: 19.28, size: 43.1 },
}

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

function Compass({ tv }) {
  const c = tv ? COMPASS.tv : COMPASS.mobile
  return (
    <div className="poem-compass"
         style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.size}%` }}>
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

// The verse sits on the parchment either way. On the stage the map keeps its
// shape and the verse is placed on it; on a phone the verse sets the height
// and the parchment stretches behind it, which is the only way to have both
// legible type and the text on the map.
export function Poem({ tv }) {
  return (
    <section className={`poem ${tv ? 'poem-tv' : 'poem-mobile'}`}>
      <div className="poem-map">
        <img src={`${BASE}poem-map.webp`} alt="" />
        <Compass tv={tv} />
        <Verse />
      </div>
    </section>
  )
}
