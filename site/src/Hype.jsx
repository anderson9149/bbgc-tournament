import videos from './hype-videos.json'

// The hype reels live on YouTube, not in the repo: one year's cut runs to
// several hundred MB, which is past what GitHub will take in a file and far
// past what Pages should be serving.
export function Hype({ year }) {
  const id = videos[String(year)]
  if (!id) {
    return (
      <section className="hype">
        <p className="status center">The {year} hype video has not been posted yet.</p>
      </section>
    )
  }
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
