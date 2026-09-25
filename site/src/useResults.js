import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL as CONFIGURED_URL, REFRESH_SECONDS } from './config.js'
import sampleLive from './sample-data.json'
import sampleFull from './sample-full.json'

// ?sample in the URL forces the bundled sample data (handy for demos);
// ?sample=full shows a finished tournament.
const params = new URLSearchParams(window.location.search)
const API_URL = params.has('sample') ? '' : CONFIGURED_URL
const sample = params.get('sample') === 'full' ? sampleFull : sampleLive
const BASE_URL = import.meta.env.BASE_URL
const THIS_YEAR = new Date().getFullYear()

// Apps Script answers an overloaded request with an HTML error page, which
// would surface as a raw "Unexpected token '<'". Say what actually happened.
export async function readJson(res) {
  const text = await res.text()
  try { return JSON.parse(text) } catch {
    throw new Error(text.trim().startsWith('<') ? 'The sheet is busy — trying again shortly' : 'Unexpected reply from the sheet')
  }
}

// Polls the Apps Script endpoint for one tournament year (null = latest).
// `refresh()` fetches immediately and restarts the polling timer.
export function useResults(year) {
  const [state, setState] = useState({ data: API_URL ? null : sample, error: null, fetchedAt: null })
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const reqId = useRef(0)
  const retries = useRef(0)

  // `blank` is for a year change: drop the old year's tables straight away so
  // the page reacts to the click, instead of sitting on the previous year's
  // numbers until a cold sheet answers. Polling and Refresh never blank.
  const load = useCallback(async (blank = false) => {
    if (!API_URL) return
    const id = ++reqId.current
    if (blank) setState({ data: null, error: null, fetchedAt: null })
    setLoading(true)
    try {
      // A finished year never changes, so it is served as a file from the CDN.
      // Apps Script queues requests and starts handing out HTML error pages
      // under a crowd, so only the year still being played goes to it.
      const frozen = year && Number(year) < THIS_YEAR
      const url = frozen ? `${BASE_URL}data/${Number(year)}.json`
        : year ? `${API_URL}?year=${encodeURIComponent(year)}` : API_URL
      let res = await fetch(url, frozen ? {} : { cache: 'no-store' })
      // A year with no snapshot yet falls back to the sheet rather than 404ing.
      if (frozen && !res.ok) {
        res = await fetch(`${API_URL}?year=${encodeURIComponent(year)}`, { cache: 'no-store' })
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await readJson(res)
      if (id !== reqId.current) return   // a newer year was picked while this was in flight
      if (data.error) throw new Error(data.error)
      retries.current = 0
      setState({ data, error: null, fetchedAt: new Date() })
    } catch (err) {
      if (id !== reqId.current) return
      setState((s) => ({ ...s, error: err.message }))
      // Apps Script buckles under a crowd and recovers a moment later, so try
      // again by itself instead of making everyone hit Refresh.
      if (retries.current < 3) {
        retries.current += 1
        const wait = 2000 * retries.current
        setTimeout(() => { if (id === reqId.current) load() }, wait)
      }
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [year])

  const schedule = useCallback(() => {
    clearInterval(timer.current)
    timer.current = setInterval(() => load(), REFRESH_SECONDS * 1000)   // never blanks
  }, [load])

  // `load` is rebuilt whenever `year` changes, so this effect is the year switch.
  const mounted = useRef(false)
  useEffect(() => {
    load(mounted.current)
    mounted.current = true
    schedule()
    return () => clearInterval(timer.current)
  }, [load, schedule])

  const refresh = useCallback(() => { load(); schedule() }, [load, schedule])

  return { ...state, loading, refresh }
}
