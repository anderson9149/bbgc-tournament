// A year that has not been played yet. It carries no results, so the picker
// shows it and the page says so rather than drawing an empty bracket.
export function Preview({ year }) {
  return (
    <section className="preview">
      <div className="preview-card">
        <h1>BBGC {year} Awaits!</h1>
        <p>Planning is underway</p>
        <p>Check back here for updates.</p>
        <p className="preview-sign">— BBGC Planning Committee</p>
        <p className="preview-ps">P.S. Don’t forget the “G”</p>
      </div>
    </section>
  )
}
