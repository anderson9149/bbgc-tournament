const BASE = import.meta.env.BASE_URL
const VIDEO = '4YB0z163wqg'

// Measured off the artwork, which is cropped to the parchment itself: the
// compass rose spans 3.3%-20.5% across, centred at 11.9% / 19.3%. On the
// stage the video is drawn as a circle over it, wider than the rose so it
// reads from across the room: nudged right to stay inside the torn edge, and
// dropped to 25% because at this size it is taller than the rose's distance
// from the top of the paper. `size` and `left` are percentages of the map's
// width, `top` of its height.
const COMPASS = { left: 13.5, top: 25, size: 25.86 }

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
  // broken in two: as one line it runs well past every other line
  ['So drown all your sins, fill em with grins,',
   'cause even as losers, at Ty’s we all win!'],
  ['Raise your glasses, gentlemen, to the XX annual',
   'Roll in the grass and drink like animals',
   'Till inebriated we sleep, toss ’em with ease',
   'Cheers to the BBGC!!'],
]

function Verse() {
  // The inner div is only as wide as the longest line, so the whole verse can
  // be centred in the space beside the video without the stanzas drifting out
  // of line with one another.
  return (
    <div className="poem-text">
      <div className="poem-lines">
        {STANZAS.map((lines, i) => (
          <p key={i}>{lines.map((l, j) => <span key={j}>{l}</span>)}</p>
        ))}
      </div>
    </div>
  )
}

// cc_load_policy=0 stops captions loading by default and iv_load_policy=3
// drops annotations; both would sit over the picture.
const SRC = `https://www.youtube-nocookie.com/embed/${VIDEO}?rel=0&modestbranding=1&cc_load_policy=0&iv_load_policy=3&playsinline=1`
const FRAME = (
  <iframe
    src={SRC}
    title="Bauman reads the poem"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  />
)

// On the stage the video is a circle sitting on the compass rose. YouTube
// letterboxes a 16:9 reel inside a square, so the iframe is overfilled and
// cropped by the circle.
function Compass() {
  return (
    <div className="poem-compass"
         style={{ left: `${COMPASS.left}%`, top: `${COMPASS.top}%`, width: `${COMPASS.size}%` }}>
      {FRAME}
    </div>
  )
}

// A phone gets the reel at its own shape, in the flow at the top of the
// parchment. Cropping it to a circle there left the player untappable.
function Screen() {
  return <div className="poem-screen">{FRAME}</div>
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
        {tv ? <Compass /> : <Screen />}
        <Verse />
      </div>
    </section>
  )
}
