import videos from './hype-videos.json'

// The hype reels live off-site: one year's cut runs to several hundred MB,
// which is past what GitHub will take in a file (100 MB) and past what Pages
// should be serving. An entry is either a YouTube id, or {drive: fileId} for a
// cut YouTube will not play — Drive does not run Content ID, so a soundtrack
// that gets blocked on YouTube still streams from there.
function source(year) {
  const v = videos[String(year)]
  if (!v) return null
  if (typeof v === 'string') {
    return { src: `https://www.youtube-nocookie.com/embed/${v}?rel=0&modestbranding=1`, kind: 'youtube' }
  }
  if (v.drive) return { src: `https://drive.google.com/file/d/${v.drive}/preview`, kind: 'drive' }
  return null
}

// The reels only start in 2021, so a year with no id gets no button at all
// rather than a dead end promising something that was never filmed.
export function hasHype(year) {
  return Boolean(source(year))
}

export function Hype({ year }) {
  const v = source(year)
  if (!v) return null
  return (
    <section className="hype">
      <div className="hype-frame">
        <iframe
          src={v.src}
          title={`${year} BBGC hype video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  )
}
