import videos from './hype-videos.json'

// The hype reels live on YouTube, not in the repo: one year's cut runs to
// several hundred MB, which is past what GitHub will take in a file and far
// past what Pages should be serving.
// The reels only start in 2021, so a year with no id gets no button at all
// rather than a dead end promising something that was never filmed.
export function hasHype(year) {
  return Boolean(videos[String(year)])
}

export function Hype({ year }) {
  const id = videos[String(year)]
  if (!id) return null
  return (
    <section className="hype">
      <div className="hype-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
          title={`${year} BBGC hype video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  )
}
