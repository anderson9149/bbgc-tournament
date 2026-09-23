/**
 * BBGC Tournament — Google Apps Script
 *
 * Paste this whole file into Extensions > Apps Script in a blank Google Sheet.
 *
 *   setup()   Run ONCE. Builds the Teams / PoolGames / BracketGames /
 *             Ticker Messages tabs, adds dropdowns, and pre-fills all 60
 *             pool matchups.
 *   doGet()   The JSON endpoint the website reads. Deploy > New deployment >
 *             Web app, "Execute as: Me", "Who has access: Anyone".
 *             ?year=2024 selects a year; the default is the latest year.
 *             ?action=game&a=<team>&b=<team> returns one game's hole scores.
 *   doPost()  Used by the scorekeeper page (site/score/). Body is JSON:
 *             {action:'hole', year, a, b, hole, value} writes one hole
 *             (value > 0 = team A scored, < 0 = team B scored, 0 = no score);
 *             {action:'finish', year, a, b} marks the game done and copies the
 *             final score into PoolGames or BracketGames.
 *             Writes must include team A's `pin` (Teams column D) when one is set;
 *             {action:'login', year, pin} returns the team that PIN belongs to,
 *             with its possible opponents.
 *
 * Years: every Google Sheet in the Drive folder BBGC_ScoreCards named
 * BBGC_ScoreCardResults_<year> is one tournament. The deployed script (bound
 * to one of them) reads whichever year the site asks for.
 *
 * A "BBGC" menu is added to the sheet with "Seed Bracket" (fills round 1
 * from pool standings), "Reset Bracket" and "Set up year files" (one-time:
 * renames/moves this sheet and creates blank copies for earlier years).
 */

var FOLDER_NAME = 'BBGC_ScoreCards';
var FILE_PREFIX = 'BBGC_ScoreCardResults_';
var FILE_PATTERN = /^BBGC_ScoreCardResults_(\d{4})$/;
var FIRST_YEAR = 2016;
var HISTORY_URL = 'https://raw.githubusercontent.com/anderson9149/bbgc-tournament/main/history/';

var POOLS = ['Orange', 'Red', 'Blue', 'Yellow'];

// 6-team round robin: 5 rounds, 3 games per round, every pair plays once.
var ROUND_ROBIN = [
  [[1, 2], [3, 6], [4, 5]],
  [[1, 3], [2, 4], [5, 6]],
  [[1, 4], [2, 6], [3, 5]],
  [[1, 5], [2, 3], [4, 6]],
  [[1, 6], [2, 5], [3, 4]],
];

// 12-team single elimination, 4 byes (pool winners).
// Round 1 pairs #2 and #3 seeds from different pools; quarterfinals put each
// pool winner against a game whose teams are both from other pools.
var BRACKET = [
  { game: 1,  round: 'Round 1',      a: 'Orange#2', b: 'Red#3' },
  { game: 2,  round: 'Round 1',      a: 'Red#2',    b: 'Orange#3' },
  { game: 3,  round: 'Round 1',      a: 'Blue#2',   b: 'Yellow#3' },
  { game: 4,  round: 'Round 1',      a: 'Yellow#2', b: 'Blue#3' },
  { game: 5,  round: 'Quarterfinal', a: 'Blue#1',   b: 'W1' },
  { game: 6,  round: 'Quarterfinal', a: 'Yellow#1', b: 'W2' },
  { game: 7,  round: 'Quarterfinal', a: 'Orange#1', b: 'W3' },
  { game: 8,  round: 'Quarterfinal', a: 'Red#1',    b: 'W4' },
  { game: 9,  round: 'Semifinal',    a: 'W5',       b: 'W6' },
  { game: 10, round: 'Semifinal',    a: 'W7',       b: 'W8' },
  { game: 11, round: 'Final',        a: 'W9',       b: 'W10' },
];

var HEADER_BG = '#4a86e8';

// ---------------------------------------------------------------- setup

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('BBGC')
    .addItem('Seed Bracket from pool standings', 'seedBracket')
    .addItem('Reset Bracket', 'resetBracket')
    .addItem('Assign team PINs', 'assignPins')
    .addSeparator()
    .addItem('Set up year files (one time)', 'setupYearFiles')
    .addItem('Refresh year list', 'refreshYearList')
    .addItem('Import a past year from GitHub history…', 'importHistory')
    .addSeparator()
    .addItem('Lock past years (warn before editing)', 'lockPastYears')
    .addItem('Unlock past years', 'unlockPastYears')
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupTeams_(ss);
  setupPoolGames_(ss);
  setupBracketGames_(ss);
  setupTicker_(ss);
  var extra = ss.getSheetByName('Sheet1');
  if (extra && ss.getSheets().length > 1) ss.deleteSheet(extra);
  onOpen();
  SpreadsheetApp.getUi().alert(
    'Done. Fill in the Teams tab (24 teams, 6 per pool). ' +
    'PoolGames will fill in team names automatically — just enter scores.'
  );
}

function getOrCreate_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  sh.clearFormats();
  return sh;
}

function header_(sh, row, values) {
  var r = sh.getRange(row, 1, 1, values.length);
  r.setValues([values]);
  r.setBackground(HEADER_BG).setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(row);
}

function setupTeams_(ss) {
  var sh = getOrCreate_(ss, 'Teams');
  header_(sh, 1, ['Team', 'Pool', 'Seed Override', 'PIN', 'Record']);
  var poolRule = SpreadsheetApp.newDataValidation().requireValueInList(POOLS, true).build();
  sh.getRange(2, 2, 24, 1).setDataValidation(poolRule);
  var seedRule = SpreadsheetApp.newDataValidation().requireValueInList(['1', '2', '3', '4', '5', '6'], true).setAllowInvalid(false).build();
  sh.getRange(2, 3, 24, 1).setDataValidation(seedRule);
  // Pre-fill pools so you only type names.
  var pools = [];
  POOLS.forEach(function (p) { for (var i = 0; i < 6; i++) pools.push([p]); });
  sh.getRange(2, 2, 24, 1).setValues(pools);
  sh.getRange(2, 5, 24, 1).setNumberFormat('@');
  sh.setColumnWidth(5, 90);
  sh.getRange(28, 1).setValue('Record: leave blank normally. Set "4-1" or "3-1-1" (W-L-T) for past years where the games weren\'t recorded but the record is known.')
    .setFontStyle('italic').setFontColor('#666666');
  sh.getRange(27, 1).setValue('Seed Override: leave blank normally. Set 1–6 to force a team\'s finishing place in its pool (settles tiebreaker disputes).')
    .setFontStyle('italic').setFontColor('#666666');
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(3, 120);
  sh.getRange(2, 4, 24, 1).setNumberFormat('@');
}

function setupPoolGames_(ss) {
  var sh = getOrCreate_(ss, 'PoolGames');
  header_(sh, 1, ['Pool', 'Round', 'Slot A', 'Slot B', 'Team A', 'Team B', 'Score A', 'Score B']);
  var rows = [];
  POOLS.forEach(function (pool) {
    ROUND_ROBIN.forEach(function (games, ri) {
      games.forEach(function (g) {
        rows.push([pool, ri + 1, g[0], g[1]]);
      });
    });
  });
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
  // Team A / Team B look up the Nth team of that pool from the Teams tab.
  var formulas = rows.map(function (_, i) {
    var r = i + 2;
    return [
      '=IFERROR(INDEX(FILTER(Teams!$A$2:$A, Teams!$B$2:$B=$A' + r + '), $C' + r + '), "")',
      '=IFERROR(INDEX(FILTER(Teams!$A$2:$A, Teams!$B$2:$B=$A' + r + '), $D' + r + '), "")',
    ];
  });
  sh.getRange(2, 5, rows.length, 2).setFormulas(formulas);
  sh.getRange(2, 5, rows.length, 2).setBackground('#f3f3f3');
  sh.getRange(2, 7, rows.length, 2).setBackground('#fff2cc');
  sh.getRange(2, 3, rows.length, 2).setFontColor('#999999');
  sh.setColumnWidth(5, 200);
  sh.setColumnWidth(6, 200);
  // Color-band the pools so it's easy to find your place on a phone.
  var bands = { Orange: '#fce5cd', Red: '#f4cccc', Blue: '#cfe2f3', Yellow: '#fff2cc' };
  POOLS.forEach(function (pool, pi) {
    sh.getRange(2 + pi * 15, 1, 15, 1).setBackground(bands[pool]);
  });
}

function setupBracketGames_(ss) {
  var sh = getOrCreate_(ss, 'BracketGames');
  header_(sh, 1, ['Game', 'Round', 'Team A', 'Team B', 'Score A', 'Score B', 'Winner']);
  var rows = BRACKET.map(function (g) { return [g.game, g.round]; });
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
  BRACKET.forEach(function (g, i) {
    var r = i + 2;
    sh.getRange(r, 7).setFormula(
      '=IF(OR(E' + r + '="",F' + r + '=""),"",IF(E' + r + '>F' + r + ',C' + r + ',IF(F' + r + '>E' + r + ',D' + r + ',"")))'
    );
    // Later-round slots are formulas pointing at earlier winners.
    if (g.a.charAt(0) === 'W') sh.getRange(r, 3).setFormula('=G' + (parseInt(g.a.slice(1), 10) + 1));
    if (g.b.charAt(0) === 'W') sh.getRange(r, 4).setFormula('=G' + (parseInt(g.b.slice(1), 10) + 1));
  });
  sh.getRange(2, 3, rows.length, 2).setBackground('#f3f3f3');
  sh.getRange(2, 5, rows.length, 2).setBackground('#fff2cc');
  sh.getRange(2, 7, rows.length, 1).setFontWeight('bold');
  sh.setColumnWidth(2, 110);
  sh.setColumnWidth(3, 200);
  sh.setColumnWidth(4, 200);
  sh.setColumnWidth(7, 200);
  sh.getRange(14, 1).setValue('Use the BBGC menu > "Seed Bracket" once pool play is done. Then just enter scores; winners advance automatically.')
    .setFontStyle('italic').setFontColor('#666666');
}

var TICKER_SHEET = 'Ticker Messages';
var HOLE_SHEET = 'HoleScores';
var HOLES = 18;

// One message per row in column A. Not cleared on re-run so messages survive.
function setupTicker_(ss) {
  if (ss.getSheetByName(TICKER_SHEET)) return;
  var sh = ss.insertSheet(TICKER_SHEET);
  sh.getRange(1, 1).setValue('Welcome to the Barrington Bocce Golf Classic!');
  sh.setColumnWidth(1, 500);
}

// ------------------------------------------------------- bracket seeding

// Guards: never touch a past year's bracket, and never seed over existing data.
function isPastYear_(ss) {
  var m = ss.getName().match(FILE_PATTERN);
  return !!m && parseInt(m[1], 10) < new Date().getFullYear();
}

function bracketHasData_(ss) {
  var vals = ss.getSheetByName('BracketGames').getRange(2, 3, BRACKET.length, 4).getValues();
  return vals.some(function (r, i) {
    var g = BRACKET[i];
    return (g.a.charAt(0) !== 'W' && r[0] !== '') || (g.b.charAt(0) !== 'W' && r[1] !== '') || r[2] !== '' || r[3] !== '';
  });
}

function seedBracket() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  if (isPastYear_(ss)) {
    ui.alert('This is a past year. Its bracket is history — edit it by hand if something is wrong.');
    return;
  }
  if (bracketHasData_(ss)) {
    ui.alert('The bracket already has teams or scores in it, so nothing was changed.\n\n' +
             'To start over, run BBGC > Reset Bracket first (it will ask you to confirm), then seed again.');
    return;
  }
  var data = readData_(ss);
  var standings = computeStandings_(data);
  var incomplete = POOLS.filter(function (p) { return !standings[p].complete; });
  if (incomplete.length) {
    var resp = ui.alert(
      'Pool play is not finished for: ' + incomplete.join(', ') + '.\n\nSeed the bracket anyway?',
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;
  }
  var sh = ss.getSheetByName('BracketGames');
  BRACKET.forEach(function (g, i) {
    var r = i + 2;
    if (g.a.charAt(0) !== 'W') sh.getRange(r, 3).setValue(seedName_(standings, g.a));
    if (g.b.charAt(0) !== 'W') sh.getRange(r, 4).setValue(seedName_(standings, g.b));
  });
  ui.alert('Bracket seeded. Enter scores in BracketGames as games finish.');
}

function seedName_(standings, ref) {
  var parts = ref.split('#');
  var pool = standings[parts[0]];
  var row = pool && pool.rows[parseInt(parts[1], 10) - 1];
  return row ? row.team : '';
}

function resetBracket() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  if (isPastYear_(ss)) {
    ui.alert('This is a past year. Its bracket is history — edit it by hand if something is wrong.');
    return;
  }
  if (!bracketHasData_(ss)) { ui.alert('The bracket is already empty.'); return; }
  var resp = ui.alert('Erase ALL bracket teams and scores?', 'This cannot be undone (except via File > Version history).', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  resetBracket_(ss);
}

function resetBracket_(ss) {
  var sh = ss.getSheetByName('BracketGames');
  BRACKET.forEach(function (g, i) {
    var r = i + 2;
    if (g.a.charAt(0) !== 'W') sh.getRange(r, 3).clearContent();
    if (g.b.charAt(0) !== 'W') sh.getRange(r, 4).clearContent();
  });
  sh.getRange(2, 5, BRACKET.length, 2).clearContent();
}

// --------------------------------------------------------------- reading

function readData_(ss) {
  var teams = ss.getSheetByName('Teams').getRange(2, 1, 24, 5).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      return { team: String(r[0]).trim(), pool: String(r[1]), override: r[2] === '' ? null : parseInt(r[2], 10),
               pin: String(r[3]).trim(), record: parseRecord_(r[4]) };
    });

  var poolGames = ss.getSheetByName('PoolGames').getRange(2, 1, 60, 8).getValues()
    .map(function (r) {
      return {
        pool: String(r[0]), round: r[1], teamA: String(r[4]), teamB: String(r[5]),
        scoreA: num_(r[6]), scoreB: num_(r[7]),
      };
    });

  var bracket = ss.getSheetByName('BracketGames').getRange(2, 1, BRACKET.length, 7).getValues()
    .map(function (r) {
      return {
        game: r[0], round: String(r[1]), teamA: String(r[2]), teamB: String(r[3]),
        scoreA: num_(r[4]), scoreB: num_(r[5]), winner: String(r[6]),
      };
    });

  return { teams: teams, poolGames: poolGames, bracket: bracket, ticker: readTicker_(ss) };
}

function readTicker_(ss) {
  var sh = ss.getSheetByName(TICKER_SHEET);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 1) return [];
  return sh.getRange(1, 1, last, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (t) { return t !== ''; });
}

// "4-1" or "3-1-1" -> {w, l, t}; anything else -> null.
function parseRecord_(v) {
  var m = String(v == null ? '' : v).trim().match(/^(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?$/);
  return m ? { w: Number(m[1]), l: Number(m[2]), t: Number(m[3] || 0) } : null;
}

function num_(v) {
  if (v === '' || v === null) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

// ------------------------------------------------------------- standings

// Pool names as they appear in the Teams tab, in order (falls back to POOLS).
function poolsOf_(data) {
  var seen = [];
  data.teams.forEach(function (t) { if (t.pool && seen.indexOf(t.pool) < 0) seen.push(t.pool); });
  return seen.length ? seen : POOLS;
}

function computeStandings_(data) {
  var out = {};
  poolsOf_(data).forEach(function (pool) {
    var stats = {};
    data.teams.filter(function (t) { return t.pool === pool; }).forEach(function (t) {
      stats[t.team] = { team: t.team, w: 0, l: 0, t: 0, pf: 0, pa: 0, diff: 0, override: t.override, record: t.record };
    });
    var games = data.poolGames.filter(function (g) { return g.pool === pool; });
    var played = 0;
    games.forEach(function (g) {
      if (g.scoreA === null || g.scoreB === null) return;
      var a = stats[g.teamA], b = stats[g.teamB];
      if (!a || !b) return;
      played++;
      a.pf += g.scoreA; a.pa += g.scoreB; b.pf += g.scoreB; b.pa += g.scoreA;
      if (g.scoreA > g.scoreB) { a.w++; b.l++; } else if (g.scoreB > g.scoreA) { b.w++; a.l++; } else { a.t++; b.t++; }
    });
    var rows = Object.keys(stats).map(function (k) {
      var s = stats[k];
      s.diff = s.pf - s.pa;
      if (s.record) { s.w = s.record.w; s.l = s.record.l; s.t = s.record.t; s.recordOverride = true; }
      delete s.record;
      return s;
    });
    rows.sort(function (x, y) {
      return (y.w - x.w) || (y.diff - x.diff) || (y.pf - x.pf) || x.team.localeCompare(y.team);
    });
    rows = applyOverrides_(rows);
    rows.forEach(function (r, i) { r.seed = i + 1; });
    out[pool] = { rows: rows, complete: played === games.length && games.length > 0, played: played, total: games.length };
  });
  return out;
}

// Teams with a Seed Override are lifted out and re-inserted at that position.
function applyOverrides_(rows) {
  var fixed = rows.filter(function (r) { return r.override; }).sort(function (a, b) { return a.override - b.override; });
  var rest = rows.filter(function (r) { return !r.override; });
  fixed.forEach(function (r) {
    var idx = Math.min(r.override - 1, rest.length);
    rest.splice(idx, 0, r);
  });
  return rest;
}

// ------------------------------------------------------------ years

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

// { '2024': spreadsheetId, ... } from the Drive folder, plus this sheet.
function yearFiles_(noCache) {
  var cache = CacheService.getScriptCache();
  var cached = noCache ? null : cache.get('years');
  if (cached) return JSON.parse(cached);
  var map = {};
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  if (it.hasNext()) {
    var files = it.next().getFilesByType(MimeType.GOOGLE_SHEETS);
    while (files.hasNext()) {
      var f = files.next();
      var m = f.getName().match(FILE_PATTERN);
      if (m) map[m[1]] = f.getId();
    }
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mine = ss.getName().match(FILE_PATTERN);
  if (mine && !map[mine[1]]) map[mine[1]] = ss.getId();
  if (!Object.keys(map).length) map[String(new Date().getFullYear())] = ss.getId();
  cache.put('years', JSON.stringify(map), 21600); // 6 hours (the max)
  return map;
}

function refreshYearList() {
  CacheService.getScriptCache().remove('years');
  var list = Object.keys(yearFiles_(true)).sort();
  SpreadsheetApp.getUi().alert('Years found: ' + list.join(', '));
}

// One-time: rename this sheet to the current year, move it into the folder,
// and create blank copies for every earlier year back to FIRST_YEAR.
function setupYearFiles() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var file = DriveApp.getFileById(ss.getId());
  var folder = folder_();
  var m = ss.getName().match(FILE_PATTERN);
  var year = m ? parseInt(m[1], 10) : new Date().getFullYear();
  if (!m) ss.rename(FILE_PREFIX + year);
  file.moveTo(folder);

  var existing = yearFiles_(true);
  var created = [];
  for (var y = FIRST_YEAR; y < year; y++) {
    if (existing[y]) continue;
    var copy = file.makeCopy(FILE_PREFIX + y, folder);
    clearData_(SpreadsheetApp.openById(copy.getId()));
    created.push(y);
  }
  CacheService.getScriptCache().remove('years');
  SpreadsheetApp.getUi().alert(
    'This sheet is now ' + ss.getName() + ' in the folder ' + FOLDER_NAME + '.\n' +
    (created.length ? 'Created blank sheets for: ' + created.join(', ') : 'All earlier years already exist.')
  );
}

// Empty a copied sheet: team names, overrides, scores, bracket, ticker.
function clearData_(ss) {
  ss.getSheetByName('Teams').getRange(2, 1, 24, 1).clearContent();
  ss.getSheetByName('Teams').getRange(2, 3, 24, 1).clearContent();
  ss.getSheetByName('PoolGames').getRange(2, 7, 60, 2).clearContent();
  resetBracket_(ss);
  var t = ss.getSheetByName(TICKER_SHEET);
  if (t) t.clearContents();
}

// --------------------------------------------------------- locking

var LOCK_NOTE = 'BBGC: finished year — edit only on purpose';

// Warning-only protection on every sheet of every past year. Google then asks
// "are you sure?" before any hand edit, while scripts (and the importer) still
// write normally. Nothing is made permanently read-only.
function lockPastYears() { setPastYearLock_(true); }
function unlockPastYears() { setPastYearLock_(false); }

function setPastYearLock_(on) {
  var ui = SpreadsheetApp.getUi();
  var years = yearFiles_(true);
  var thisYear = new Date().getFullYear();
  var past = Object.keys(years).filter(function (y) { return parseInt(y, 10) < thisYear; }).sort();
  if (!past.length) { ui.alert('No past-year sheets found in ' + FOLDER_NAME + '.'); return; }
  var resp = ui.alert((on ? 'Lock ' : 'Unlock ') + past.length + ' past year(s)?',
    past.join(', ') + '\n\n' + (on
      ? 'Google will warn you before any hand edit to these sheets. The importer and the website are unaffected.'
      : 'Removes that warning so these sheets edit normally again.'),
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  var done = 0;
  past.forEach(function (y) {
    var ss = SpreadsheetApp.openById(years[y]);
    ss.getSheets().forEach(function (sh) {
      sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (pr) {
        if (pr.getDescription() === LOCK_NOTE) pr.remove();
      });
      if (on) sh.protect().setDescription(LOCK_NOTE).setWarningOnly(true);
    });
    done++;
  });
  ui.alert((on ? 'Locked ' : 'Unlocked ') + done + ' year(s): ' + past.join(', '));
}

// ------------------------------------------------------- history import

// Fills a year's sheet from history/<year>.json in the GitHub repo (transcribed
// past results). Run from any sheet; it asks which year and opens that file.
// Overwrites Teams, PoolGames and BracketGames there; keeps PINs.
function importHistory() {
  var ui = SpreadsheetApp.getUi();
  var years = yearFiles_(true);
  var list = Object.keys(years).sort();
  var thisYear = new Date().getFullYear();
  var ask = ui.prompt('Import a past year', 'Which year? (' + list.join(', ') + ')', ui.ButtonSet.OK_CANCEL);
  if (ask.getSelectedButton() !== ui.Button.OK) return;
  var year = ask.getResponseText().trim();
  if (!years[year]) { ui.alert('No sheet named ' + FILE_PREFIX + year + ' in ' + FOLDER_NAME + '.'); return; }
  if (parseInt(year, 10) >= thisYear) { ui.alert('Only past years can be imported.'); return; }

  var res = UrlFetchApp.fetch(HISTORY_URL + year + '.json', { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) { ui.alert('No history file for ' + year + ' in the repo (history/' + year + '.json). Push it to GitHub first.'); return; }
  var h = JSON.parse(res.getContentText());
  var resp = ui.alert('Import ' + year + ' results?',
    'This replaces everything in Teams (except PINs), PoolGames and BracketGames of ' + FILE_PREFIX + year +
    ' with the transcribed results.', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  var ss = SpreadsheetApp.openById(years[year]);
  // Pools are whatever the JSON names them (e.g. 2023 had Green instead of Yellow).
  var pools = Object.keys(h.teams);
  var tsh = ss.getSheetByName('Teams');
  tsh.getRange(2, 2, 24, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(pools, true).build());

  // Teams: name, pool, seed override (column D = PIN untouched)
  var teams = [], recs = [];
  pools.forEach(function (p) {
    (h.teams[p] || []).forEach(function (t) {
      teams.push([t, p, (h.overrides || {})[t] || '']);
      recs.push([(h.records || {})[t] || '']);
    });
  });
  while (teams.length < 24) { teams.push(['', '', '']); recs.push(['']); }
  tsh.getRange(2, 1, 24, 3).setValues(teams);
  tsh.getRange(1, 5).setValue('Record').setBackground(HEADER_BG).setFontColor('#ffffff').setFontWeight('bold');
  tsh.getRange(2, 5, 24, 1).setNumberFormat('@').setValues(recs);

  // PoolGames: pool in A, round + slots in B:D, scores in G:H
  var rows = [], scores = [];
  pools.forEach(function (p) {
    var games = (h.poolGames[p] || []).slice().sort(function (x, y) { return x[0] - y[0]; });
    games.forEach(function (g) {
      rows.push([p, g[0], g[1], g[2]]);
      scores.push([g[3] === null ? '' : g[3], g[4] === null ? '' : g[4]]);
    });
  });
  var pg = ss.getSheetByName('PoolGames');
  var maxRows = Math.max(pg.getMaxRows() - 1, rows.length);
  pg.getRange(2, 1, maxRows, 4).clearContent();
  pg.getRange(2, 7, maxRows, 2).clearContent();
  pg.getRange(2, 1, rows.length, 4).setValues(rows);
  pg.getRange(2, 7, scores.length, 2).setValues(scores);

  // BracketGames: typed names for the seeded slots, 1-0 / 0-1 for winners
  var bg = ss.getSheetByName('BracketGames');
  bg.getRange(2, 5, BRACKET.length, 2).clearContent();   // old scores, if any
  var isRef = function (v) { return /^W\d+$/.test(v); }; // "W3" = winner of game 3
  h.bracket.forEach(function (g, i) {
    var r = i + 2;
    if (!isRef(g.a)) bg.getRange(r, 3).setValue(g.a);
    if (!isRef(g.b)) bg.getRange(r, 4).setValue(g.b);
    if (g.winner) bg.getRange(r, 5, 1, 2).setValues([g.winner === 'a' ? [g.scoreA || 1, g.scoreB || 0] : [g.scoreA || 0, g.scoreB || 1]]);
  });

  // Ticker: the year's story, if the history file carries one.
  if (h.ticker && h.ticker.length) {
    var tk = ss.getSheetByName(TICKER_SHEET) || ss.insertSheet(TICKER_SHEET);
    tk.clearContents();
    tk.getRange(1, 1, h.ticker.length, 1).setValues(h.ticker.map(function (t) { return [t]; }));
    tk.setColumnWidth(1, 700);
  }

  CacheService.getScriptCache().remove('payload:' + year);
  ui.alert('Imported ' + year + ': ' + teams.filter(function (t) { return t[0]; }).length + ' teams, ' +
           scores.filter(function (x) { return x[0] !== ''; }).length + ' pool games, ' + h.bracket.length + ' bracket games' + (h.ticker && h.ticker.length ? ', ' + h.ticker.length + ' ticker messages' : '') + '.');
}

// ------------------------------------------------------------- PINs

// Fills column D of Teams with unique random 4-digit PINs. Cells that already
// hold a 4-digit PIN are kept; blanks and anything else get a new one.
function assignPins() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Teams');
  sh.getRange(1, 4).setValue('PIN').setBackground(HEADER_BG).setFontColor('#ffffff').setFontWeight('bold');
  var rows = sh.getRange(2, 1, 24, 4).getValues();
  var used = {};
  var valid = function (v) { return /^\d{4}$/.test(String(v).trim()); };
  rows.forEach(function (r) { if (valid(r[3])) used[String(r[3]).trim()] = true; });
  var out = [], n = 0;
  rows.forEach(function (r) {
    var pin = valid(r[3]) ? String(r[3]).trim() : '';
    if (r[0] !== '' && pin === '') {
      do { pin = String(1000 + Math.floor(Math.random() * 9000)); } while (used[pin]);
      used[pin] = true; n++;
    }
    out.push([pin]);
  });
  sh.getRange(2, 4, 24, 1).setNumberFormat('@').setValues(out);
  SpreadsheetApp.getUi().alert('Assigned ' + n + ' new PIN' + (n === 1 ? '' : 's') + '. Existing 4-digit PINs were kept.');
}

// The team whose PIN this is, or null.
function teamForPin_(ss, pin) {
  pin = String(pin || '').trim();
  if (!pin) return null;
  var rows = ss.getSheetByName('Teams').getRange(2, 1, 24, 4).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] !== '' && String(rows[i][3]).trim() === pin) return { team: String(rows[i][0]).trim(), pool: String(rows[i][1]) };
  }
  return null;
}

// Pool-mates plus knockout opponents (once the bracket is seeded).
function opponentsFor_(ss, team, pool) {
  var rows = ss.getSheetByName('Teams').getRange(2, 1, 24, 2).getValues();
  var mates = [];
  rows.forEach(function (r) {
    var t = String(r[0]).trim();
    if (t && t !== team && String(r[1]) === pool) mates.push(t);
  });
  var bracket = [];
  var br = ss.getSheetByName('BracketGames').getRange(2, 3, BRACKET.length, 2).getValues();
  br.forEach(function (r) {
    var a = String(r[0]).trim(), b = String(r[1]).trim();
    if (a === team && b && bracket.indexOf(b) < 0 && mates.indexOf(b) < 0) bracket.push(b);
    if (b === team && a && bracket.indexOf(a) < 0 && mates.indexOf(a) < 0) bracket.push(a);
  });
  return { pool: mates, bracket: bracket };
}

// True if the team has no PIN set, or the given PIN matches.
function checkPin_(ss, team, pin) {
  var rows = ss.getSheetByName('Teams').getRange(2, 1, 24, 4).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === team) {
      var want = String(rows[i][3]).trim();
      return want === '' || want === String(pin || '').trim();
    }
  }
  return false;
}

// ------------------------------------------------------ hole scores

// HoleScores: Team A | Team B | Score A | Score B | H1..H18 | Done | Updated
var HOLE_COL = 5;                 // first hole column (E)
var DONE_COL = HOLE_COL + HOLES;  // W
var UPD_COL = DONE_COL + 1;       // X

function holeSheet_(ss) {
  var sh = ss.getSheetByName(HOLE_SHEET);
  if (sh) return sh;
  sh = ss.insertSheet(HOLE_SHEET);
  var hdr = ['Team A', 'Team B', 'Score A', 'Score B'];
  for (var h = 1; h <= HOLES; h++) hdr.push('H' + h);
  hdr.push('Done', 'Updated');
  header_(sh, 1, hdr);
  sh.setColumnWidth(1, 200);
  sh.setColumnWidth(2, 200);
  for (var c = HOLE_COL; c < DONE_COL; c++) sh.setColumnWidth(c, 40);
  return sh;
}

// Rows are keyed by the pair of teams in either order; `flipped` means the
// stored row has them the other way round, so hole signs are inverted.
function findGameRow_(sh, a, b) {
  var last = sh.getLastRow();
  if (last < 2) return null;
  var vals = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (vals[i][0] === a && vals[i][1] === b) return { row: i + 2, flipped: false };
    if (vals[i][0] === b && vals[i][1] === a) return { row: i + 2, flipped: true };
  }
  return null;
}

function readGame_(ss, a, b) {
  var sh = holeSheet_(ss);
  var f = findGameRow_(sh, a, b);
  var holes = [], done = false;
  for (var h = 0; h < HOLES; h++) holes.push(null);
  if (f) {
    var row = sh.getRange(f.row, HOLE_COL, 1, HOLES + 1).getValues()[0];
    holes = row.slice(0, HOLES).map(function (v) {
      if (v === '' || v === null) return null;
      var n = Number(v);
      return f.flipped ? -n : n;
    });
    done = row[HOLES] === true;
  }
  var scoreA = 0, scoreB = 0;
  holes.forEach(function (v) { if (v > 0) scoreA += v; else if (v < 0) scoreB += -v; });
  return { teamA: a, teamB: b, holes: holes, scoreA: scoreA, scoreB: scoreB, done: done };
}

function writeHole_(ss, a, b, hole, value) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = holeSheet_(ss);
    var f = findGameRow_(sh, a, b);
    if (!f) {
      var r = sh.getLastRow() + 1;
      sh.getRange(r, 1, 1, 2).setValues([[a, b]]);
      var first = colLetter_(HOLE_COL) + r, last = colLetter_(DONE_COL - 1) + r;
      sh.getRange(r, 3).setFormula('=SUMIF(' + first + ':' + last + ',">0")');
      sh.getRange(r, 4).setFormula('=-SUMIF(' + first + ':' + last + ',"<0")');
      f = { row: r, flipped: false };
    }
    var v = (value === null || value === undefined) ? '' : (f.flipped ? -value : value);
    sh.getRange(f.row, HOLE_COL + hole - 1).setValue(v);
    sh.getRange(f.row, UPD_COL).setValue(new Date());
  } finally {
    lock.releaseLock();
  }
}

function finishGame_(ss, a, b) {
  var g = readGame_(ss, a, b);
  var sh = holeSheet_(ss);
  var f = findGameRow_(sh, a, b);
  if (f) sh.getRange(f.row, DONE_COL).setValue(true);
  g.done = true;
  g.recordedIn = recordFinal_(ss, a, b, g.scoreA, g.scoreB);
  return g;
}

// Copy a final score into the matching PoolGames or BracketGames row.
// Returns the sheet name it wrote to, or null if the matchup isn't listed.
function recordFinal_(ss, a, b, scoreA, scoreB) {
  var targets = [
    { name: 'PoolGames', teamCol: 5, scoreCol: 7, rows: 60 },
    { name: 'BracketGames', teamCol: 3, scoreCol: 5, rows: BRACKET.length },
  ];
  for (var t = 0; t < targets.length; t++) {
    var sh = ss.getSheetByName(targets[t].name);
    if (!sh) continue;
    var names = sh.getRange(2, targets[t].teamCol, targets[t].rows, 2).getValues();
    for (var i = 0; i < names.length; i++) {
      if (names[i][0] === a && names[i][1] === b) {
        sh.getRange(i + 2, targets[t].scoreCol, 1, 2).setValues([[scoreA, scoreB]]);
        return targets[t].name;
      }
      if (names[i][0] === b && names[i][1] === a) {
        sh.getRange(i + 2, targets[t].scoreCol, 1, 2).setValues([[scoreB, scoreA]]);
        return targets[t].name;
      }
    }
  }
  return null;
}

function colLetter_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function spreadsheetForYear_(year) {
  var years = yearFiles_();
  var list = Object.keys(years).sort();
  var y = year || list[list.length - 1];
  return years[y] ? { year: Number(y), ss: SpreadsheetApp.openById(years[y]) } : null;
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var target = spreadsheetForYear_(body.year);
    if (!target) return json_({ error: 'No results sheet for ' + body.year });
    var a = String(body.a || '').trim(), b = String(body.b || '').trim();
    if (body.action === 'login') {
      var who = teamForPin_(target.ss, body.pin);
      if (!who) return json_({ error: 'No team associated with that PIN' });
      who.opponents = opponentsFor_(target.ss, who.team, who.pool);
      who.year = target.year;
      return json_(who);
    }
    if (!a || !b || a === b) return json_({ error: 'Two different teams are required' });
    if (!checkPin_(target.ss, a, body.pin)) return json_({ error: 'Wrong PIN for ' + a });
    var game;
    if (body.action === 'hole') {
      var hole = Number(body.hole);
      if (!(hole >= 1 && hole <= HOLES)) return json_({ error: 'Bad hole number' });
      writeHole_(target.ss, a, b, hole, body.value === null ? null : Number(body.value));
      game = readGame_(target.ss, a, b);
    } else if (body.action === 'finish') {
      game = finishGame_(target.ss, a, b);
      CacheService.getScriptCache().remove('payload:' + target.year);
    } else {
      return json_({ error: 'Unknown action' });
    }
    game.year = target.year;
    return json_(game);
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  }
}

// ------------------------------------------------------------------ API

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'game') {
    var target = spreadsheetForYear_(p.year);
    if (!target) return json_({ error: 'No results sheet for ' + p.year });
    var g = readGame_(target.ss, String(p.a || '').trim(), String(p.b || '').trim());
    g.year = target.year;
    return json_(g);
  }
  var years = yearFiles_();
  var list = Object.keys(years).sort();
  var year = p.year || list[list.length - 1];
  var cache = CacheService.getScriptCache();
  var key = 'payload:' + year;
  var cached = cache.get(key);
  if (!cached) {
    var payload;
    if (!years[year]) {
      payload = { error: 'No results sheet for ' + year, years: list.map(Number) };
    } else {
      payload = buildPayload_(SpreadsheetApp.openById(years[year]));
      payload.year = Number(year);
      payload.years = list.map(Number);
    }
    cached = JSON.stringify(payload);
    cache.put(key, cached, 10); // seconds
  }
  return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_(ss) {
  var data = readData_(ss);
  var standings = computeStandings_(data);
  var pools = {};
  poolsOf_(data).forEach(function (pool) {
    pools[pool] = {
      standings: standings[pool].rows,
      complete: standings[pool].complete,
      played: standings[pool].played,
      total: standings[pool].total,
      games: data.poolGames.filter(function (g) { return g.pool === pool; }),
    };
  });
  return {
    updatedAt: new Date().toISOString(),
    pools: pools,
    bracket: data.bracket.map(function (g, i) {
      return { game: g.game, round: g.round, teamA: g.teamA, teamB: g.teamB, scoreA: g.scoreA, scoreB: g.scoreB, winner: g.winner,
               slotA: BRACKET[i].a, slotB: BRACKET[i].b };
    }),
    bracketSeeded: data.bracket.slice(0, 4).some(function (g) { return g.teamA !== ''; }),
    ticker: data.ticker,
  };
}
