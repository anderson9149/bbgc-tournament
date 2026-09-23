# BBGC Tournament Tracker

Live results for the BBGC bocce tournament: 4 pools of 6 (round robin), top 3
from each pool into a 12-team single-elimination bracket.

- **Data entry:** a Google Sheet (`Teams`, `PoolGames`, `BracketGames`, `Ticker Messages` tabs)
- **API:** Google Apps Script `doGet()` in [`apps-script/Code.gs`](apps-script/Code.gs)
- **Site:** React (Vite) in [`site/`](site), deployed to GitHub Pages on every push to `main`
  - `/` — results (TV + mobile)
  - `/score/` — scorekeeper page for phones, writes hole-by-hole scores back to the sheet

## One-time setup

### 1. Google Sheet
1. Create a blank Google Sheet, name it whatever you like.
2. **Extensions → Apps Script.** Delete the placeholder code, paste in all of `apps-script/Code.gs`, save.
3. Pick `setup` in the function dropdown and click **Run**. Approve the permissions prompt (it only touches this sheet).
4. Back in the sheet you'll see three tabs and a **BBGC** menu.

### 2. Publish the API
1. In Apps Script: **Deploy → New deployment**. Type: **Web app**.
   Execute as: **Me**. Who has access: **Anyone**. Deploy.
2. Copy the Web app URL (ends in `/exec`).
3. Paste it into `site/src/config.js` as `API_URL`.

### 3. GitHub Pages
1. Push this repo to GitHub as `bbgc-tournament` (the name must match `base` in `site/vite.config.js`).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` deploys to `https://<user>.github.io/bbgc-tournament/`.

### Updating the script later
When `apps-script/Code.gs` changes: paste the new code over the old in Apps Script, save, then
**Deploy → Manage deployments → ✎ → Version: New version → Deploy**. The URL stays the same.

## Years

Every tournament is one Google Sheet named `BBGC_ScoreCardResults_<year>` in the Drive folder
`BBGC_ScoreCards`. The deployed script (bound to one of them) reads whichever year the site asks
for (`?year=2024`); the site's dropdown lists every year it finds. Default is the latest year.

**One-time setup:** in the current year's sheet, **BBGC → Set up year files**. This renames the sheet
to the current year, moves it into the folder, and creates blank copies for every earlier year back
to 2016. (It will ask for Drive permission the first time.)

**Each new year:** File → Make a copy of last year's sheet, name it `BBGC_ScoreCardResults_<year>`,
keep it in the folder, and clear the old data (or run **BBGC → Reset Bracket** and clear the Teams /
scores by hand). Then **BBGC → Refresh year list** (the list is cached for 6 hours) — no code change,
no redeploy.

**Champions photo:** drop a `<year>.jpg` into `site/public/winners/` (e.g. `2027.jpg`) and push. It
appears on that year's Knockout Round page next to the Final. Any size/orientation; ~1000px is plenty.

**Importing a past year:** transcribe it into `history/<year>.json` (see `history/2024.json`), push,
then from the current year's sheet run **BBGC → Import a past year from GitHub history…** and type the year. (Or run
`python3 history/make-paste.py <year>` and paste the blocks by hand.) Seed Bracket and Reset Bracket
refuse to run on past years, so imported brackets can't be clobbered.

**Odd formats:** pools don't have to be the same size — 2019's Blue pool had 5 teams and a bye each
round. Put whatever the year actually played in the history JSON; the importer writes that many rows
and clears the rest. Games that were forfeited get `null` scores.

**Team narratives:** `history/team-narratives.json` holds one paragraph per team. The stats rebuild
fetches it from GitHub, so edit + push, then rebuild.

**All-time stats:** **BBGC → Rebuild all-time stats** totals every year up and writes the result to a
`BBGC_AllTimeStats` spreadsheet in the folder; the site's All-Time tab reads it via `?action=stats`.
Re-run it after importing or editing any year. It also writes a `Team Summary` workbook with one tab
per team (stats + narrative) for browsing in Drive; the site reads the AllTime sheet, not that one. Team names must match across years for the totals to
be right — stick to the spelling already in use (see the alias list applied in `history/`).

**Protecting finished years:** **BBGC → Lock past years** puts warning-only protection on every
sheet of every year before the current one — Google asks "are you sure?" before any hand edit, while
the importer and the website carry on working. **Unlock past years** removes it.

**Backups:** `history/<year>.json` is the source of truth and can rebuild a year's sheet from
scratch via the importer. `history/snapshots/<year>.json` is a dump of what the live API actually
returned, refreshed with `history/snapshot.sh` — useful for spotting a sheet that has drifted.

**Ticker stories:** a history file can carry a `ticker` array — a play-by-play of that year's
tournament. The importer writes it into the year's Ticker Messages tab, so picking that year on the
site scrolls its story along the bottom.

**Records without scores:** for a year where the W-L-T is known but the individual games aren't,
put `4-1` or `3-1-1` in the Teams tab's **Record** column (or a `records` map in the history JSON).
Standings use it and show `—` for +/−, since the scores aren't there to compute one.

**Past years with only win/loss records** (no scores): enter each win as `1`–`0`. Standings will be
right; the +/− column just won't mean much.

## Scorekeeper page

`https://<user>.github.io/bbgc-tournament/score/` — give this link to whoever is keeping score.

1. Pick your team, then the opponent (pool-mates, plus knockout opponents once the bracket is seeded).
2. **Start Round.** Each hole: set the points with − / +, tap the team that scored, **Next**.
   **Previous** goes back and shows what was saved so it can be corrected.
3. After hole 18, **Finish Game** writes the final score into `PoolGames` or `BracketGames`, so
   standings and the bracket on the results page update on their own.

**PINs:** run **BBGC → Assign team PINs** once to fill column D of `Teams` with a random 4-digit PIN
per team (existing 4-digit PINs are kept; you can also type your own). Give each team theirs. The
scorekeeper page starts by asking for a PIN, which identifies the team; every save is checked
against it. PINs must be unique.
PINs are never sent to the results site.

Every hole is saved to the `HoleScores` tab as it's entered (one row per game; positive = team A
scored, negative = team B). Reopening a game resumes at the next unplayed hole. Add `?year=2025`
to score into a different year's sheet.

## Running the tournament

1. **Teams tab** — type the 24 team names (6 per pool; pools are pre-filled).
2. **PoolGames tab** — team names fill in automatically. Enter `Score A` / `Score B` as games finish.
   Standings on the site: wins, then point differential, then points for.
3. Disputed tiebreaker? Put `1`–`6` in **Seed Override** on the Teams tab for the team(s) in question.
4. When pool play is done: **BBGC menu → Seed Bracket**. Round-1 matchups and the pool-winner byes are written into **BracketGames**.
5. Enter bracket scores. Winners advance to the next row automatically.
6. **Ticker Messages tab** — one message per row in column A. They scroll across the bottom of the site, separated by bullets. Edit any time.

The site refreshes every 20 seconds.

## Bracket structure

| Game | Round | Matchup |
|---|---|---|
| 1–4 | Round 1 | Orange#2 v Red#3 · Red#2 v Orange#3 · Blue#2 v Yellow#3 · Yellow#2 v Blue#3 |
| 5–8 | Quarterfinal | Blue#1 v W1 · Yellow#1 v W2 · Orange#1 v W3 · Red#1 v W4 |
| 9–10 | Semifinal | W5 v W6 · W7 v W8 |
| 11 | Final | W9 v W10 |

Pool winners get byes and can't meet a pool-mate before the semifinals.

## Local development

```bash
cd site && npm install && npm run dev
```

With `API_URL` blank the site shows `src/sample-data.json`. Add `?sample` to any URL
to force sample data, or `?sample=full` for a finished tournament (champion on the trophy).

## Display modes

- **TV / laptop (landscape, ≥900px wide):** a fixed 1920×1080 stage scaled to fit the screen,
  letterboxed if the screen isn't 16:9. Uses the landscape background images.
- **Phone / portrait:** normal scrolling page over the portrait background images.

Backgrounds live in `site/public/bg/` (`group-*.webp`, `knockout-*.webp`). The title
is baked into the images, so the menu is positioned just below it.
