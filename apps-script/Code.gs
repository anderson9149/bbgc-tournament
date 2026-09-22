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
    .addSeparator()
    .addItem('Set up year files (one time)', 'setupYearFiles')
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
  header_(sh, 1, ['Team', 'Pool', 'Seed Override']);
  var poolRule = SpreadsheetApp.newDataValidation().requireValueInList(POOLS, true).build();
  sh.getRange(2, 2, 24, 1).setDataValidation(poolRule);
  var seedRule = SpreadsheetApp.newDataValidation().requireValueInList(['1', '2', '3', '4', '5', '6'], true).setAllowInvalid(false).build();
  sh.getRange(2, 3, 24, 1).setDataValidation(seedRule);
  // Pre-fill pools so you only type names.
  var pools = [];
  POOLS.forEach(function (p) { for (var i = 0; i < 6; i++) pools.push([p]); });
  sh.getRange(2, 2, 24, 1).setValues(pools);
  sh.getRange(27, 1).setValue('Seed Override: leave blank normally. Set 1–6 to force a team\'s finishing place in its pool (settles tiebreaker disputes).')
    .setFontStyle('italic').setFontColor('#666666');
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(3, 120);
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

// One message per row in column A. Not cleared on re-run so messages survive.
function setupTicker_(ss) {
  if (ss.getSheetByName(TICKER_SHEET)) return;
  var sh = ss.insertSheet(TICKER_SHEET);
  sh.getRange(1, 1).setValue('Welcome to the Barrington Bocce Golf Classic!');
  sh.setColumnWidth(1, 500);
}

// ------------------------------------------------------- bracket seeding

function seedBracket() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = readData_(ss);
  var standings = computeStandings_(data);
  var incomplete = POOLS.filter(function (p) { return !standings[p].complete; });
  var ui = SpreadsheetApp.getUi();
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
  var row = standings[parts[0]].rows[parseInt(parts[1], 10) - 1];
  return row ? row.team : '';
}

function resetBracket() {
  resetBracket_(SpreadsheetApp.getActiveSpreadsheet());
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
  var teams = ss.getSheetByName('Teams').getRange(2, 1, 24, 3).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      return { team: String(r[0]).trim(), pool: String(r[1]), override: r[2] === '' ? null : parseInt(r[2], 10) };
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

function num_(v) {
  if (v === '' || v === null) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

// ------------------------------------------------------------- standings

function computeStandings_(data) {
  var out = {};
  POOLS.forEach(function (pool) {
    var stats = {};
    data.teams.filter(function (t) { return t.pool === pool; }).forEach(function (t) {
      stats[t.team] = { team: t.team, w: 0, l: 0, pf: 0, pa: 0, diff: 0, override: t.override };
    });
    var games = data.poolGames.filter(function (g) { return g.pool === pool; });
    var played = 0;
    games.forEach(function (g) {
      if (g.scoreA === null || g.scoreB === null) return;
      var a = stats[g.teamA], b = stats[g.teamB];
      if (!a || !b) return;
      played++;
      a.pf += g.scoreA; a.pa += g.scoreB; b.pf += g.scoreB; b.pa += g.scoreA;
      if (g.scoreA > g.scoreB) { a.w++; b.l++; } else if (g.scoreB > g.scoreA) { b.w++; a.l++; }
    });
    var rows = Object.keys(stats).map(function (k) { var s = stats[k]; s.diff = s.pf - s.pa; return s; });
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
  cache.put('years', JSON.stringify(map), 300);
  return map;
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

// ------------------------------------------------------------------ API

function doGet(e) {
  var years = yearFiles_();
  var list = Object.keys(years).sort();
  var year = (e && e.parameter && e.parameter.year) || list[list.length - 1];
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
  POOLS.forEach(function (pool) {
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
