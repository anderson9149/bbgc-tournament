import { API_URL } from '../config.js'

const params = new URLSearchParams(window.location.search)
export const YEAR = params.get('year') || ''

const withYear = (url) => (YEAR ? `${url}${url.includes('?') ? '&' : '?'}year=${encodeURIComponent(YEAR)}` : url)

class ApiError extends Error {}

async function check(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  let data
  try { data = await res.json() } catch { throw new Error('Unexpected reply from the sheet') }
  if (data.error) throw new ApiError(data.error)
  return data
}

// Google occasionally answers with a transient 404/500 or a page without CORS
// headers (which Safari reports as "Load failed"). Retry those; not real
// API errors like a wrong PIN.
async function retry(fn, attempts = 3) {
  let delay = 800
  for (let i = 1; ; i++) {
    try { return await fn() } catch (e) {
      if (e instanceof ApiError || i >= attempts) throw e
      await new Promise((r) => setTimeout(r, delay))
      delay *= 2
    }
  }
}

const asGame = (data) => {
  if (!Array.isArray(data.holes)) throw new ApiError('Scorekeeper API not available — deploy the latest script')
  return data
}

// Teams, pools and bracket for the year (same payload the results site uses).
export const fetchTournament = () => retry(() => fetch(withYear(API_URL), { cache: 'no-store' }).then(check))

// One game's hole-by-hole scores.
export const fetchGame = (a, b) => retry(() =>
  fetch(withYear(`${API_URL}?action=game&a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`), { cache: 'no-store' }).then(check).then(asGame))

// Writes go through doPost. text/plain avoids a CORS preflight, which Apps
// Script can't answer; the 302 it returns is followed automatically.
function post(body, expectGame = true) {
  return retry(() => {
    const p = fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, year: YEAR || undefined }),
      redirect: 'follow',
    }).then(check)
    return expectGame ? p.then(asGame) : p
  })
}

export const login = (pin) => post({ action: 'login', pin }, false)
export const saveHole = (a, b, hole, value, pin) => post({ action: 'hole', a, b, hole, value, pin })
export const finishGame = (a, b, pin) => post({ action: 'finish', a, b, pin })
