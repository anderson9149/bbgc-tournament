import { useEffect, useState } from 'react'
import { API_URL, REFRESH_SECONDS } from './config.js'
import sample from './sample-data.json'

// Polls the Apps Script endpoint. With no API_URL configured it serves the
// bundled sample data so the site can be developed without a sheet.
export function useResults() {
  const [state, setState] = useState({ data: API_URL ? null : sample, error: null, fetchedAt: null })

  useEffect(() => {
    if (!API_URL) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(API_URL, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setState({ data, error: null, fetchedAt: new Date() })
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, error: err.message }))
      }
    }
    load()
    const id = setInterval(load, REFRESH_SECONDS * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return state
}
