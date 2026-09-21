import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL as CONFIGURED_URL, REFRESH_SECONDS } from './config.js'
import sampleLive from './sample-data.json'
import sampleFull from './sample-full.json'

// ?sample in the URL forces the bundled sample data (handy for demos);
// ?sample=full shows a finished tournament.
const params = new URLSearchParams(window.location.search)
const API_URL = params.has('sample') ? '' : CONFIGURED_URL
const sample = params.get('sample') === 'full' ? sampleFull : sampleLive

// Polls the Apps Script endpoint. With no API_URL configured it serves the
// bundled sample data so the site can be developed without a sheet.
// `refresh()` fetches immediately and restarts the polling timer.
export function useResults() {
  const [state, setState] = useState({ data: API_URL ? null : sample, error: null, fetchedAt: null })
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  const load = useCallback(async () => {
    if (!API_URL) return
    setLoading(true)
    try {
      const res = await fetch(API_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState({ data, error: null, fetchedAt: new Date() })
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }))
    } finally {
      setLoading(false)
    }
  }, [])

  const schedule = useCallback(() => {
    clearInterval(timer.current)
    timer.current = setInterval(load, REFRESH_SECONDS * 1000)
  }, [load])

  useEffect(() => {
    load()
    schedule()
    return () => clearInterval(timer.current)
  }, [load, schedule])

  const refresh = useCallback(() => { load(); schedule() }, [load, schedule])

  return { ...state, loading, refresh }
}
