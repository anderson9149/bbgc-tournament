# team-rosters.json

Who played for each team, keyed by the team name exactly as it appears in
`BBGC_AllTimeStats` (the normalised 93-team list).

```json
{
  "White Zin": { "players": ["Name One", "Name Two"], "photo": "white-zin.webp" }
}
```

`photo` is a file in `site/public/teams/`. The website reads it from there —
a Google Sheet cannot serve images to the site, so the picture has to live in
the repo even though the names also land in the sheet.

`BBGC > Build team roster sheet` pulls this file from GitHub and fills the
sheet in. Anything already typed into a cell wins, so the rebuild never
overwrites a hand edit.
