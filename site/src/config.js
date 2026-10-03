// Paste the Apps Script "Web app" URL here after deploying.
// Leave blank to show the built-in sample data (useful for development).
export const API_URL = 'https://script.google.com/macros/s/AKfycbxwORKKq1jLgNde1Gi9Yow-CECU5OxavaBL6nBXeLNc0WCXnnwRuxUDwgti9k-60uhiDg/exec'

// How often the page re-fetches, in seconds. Every open tab costs an Apps
// Script call at this interval and the script serialises them, so the default
// is deliberately slow: 60s keeps a crowd from queueing it into error pages.
//
// ?wall turns on the fast mode meant for the one screen on the wall. A single
// display at 10s costs 6 calls a minute, which is less than a handful of
// phones at 60s — but only because it is one screen. Do not hand the URL out.
// ?wall=5 picks a different interval; 5s is the floor.
const WALL_DEFAULT = 10
const wall = new URLSearchParams(window.location.search).get('wall')
export const IS_WALL = wall !== null
const wallSeconds = Math.max(5, Number(wall) || WALL_DEFAULT)

export const REFRESH_SECONDS = IS_WALL ? wallSeconds : 60
export const LIVE_SECONDS = IS_WALL ? wallSeconds : 30
