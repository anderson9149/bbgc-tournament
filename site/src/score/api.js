import { API_URL } from '../config.js'

const params = new URLSearchParams(window.location.search)
export const YEAR = params.get('year') || ''

const withYear = (url) => (YEAR ? `${url}${url.includes('?') ? '&' : '?'}year=${encodeURIComponent(YEAR)}` : url)

async function check(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  let data
  try { data = await res.json() } catch { throw new Error('Unexpected reply from the sheet — is the latest script deployed?') }
  if (data.error) throw new Error(data.error)
  return data
}

const asGame = (data) => {
  if (!Array.isArray(data.holes)) throw new Error('Scorekeeper API not available — deploy the latest script')
  return data
}

// Teams, pools and bracket for the year (same payload the results site uses).
export const fetchTournament = () => fetch(withYear(API_URL), { cache: 'no-store' }).then(check)

// One game's hole-by-hole scores.
export const fetchGame = (a, b) =>
  fetch(withYear(`${API_URL}?action=game&a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`), { cache: 'no-store' }).then(check).then(asGame)

// Writes go through doPost. text/plain avoids a CORS preflight, which Apps
// Script can't answer; the 302 it returns is followed automatically.
function post(body) {
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, year: YEAR || undefined }),
    redirect: 'follow',
  }).then(check).then(asGame)
}

export const saveHole = (a, b, hole, value) => post({ action: 'hole', a, b, hole, value })
export const finishGame = (a, b) => post({ action: 'finish', a, b })
