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

`titles` is optional, for a championship the sheets cannot show. 2016 and
2017 were played but never recorded, so the only evidence of those winners
is a photo and someone's memory.

`BBGC > Build team roster sheet` pulls this file from GitHub and fills the
sheet in. Anything already typed into a cell wins, so the rebuild never
overwrites a hand edit. A team that predates the recorded era is not in the
all-time list, so the build reports it as unmatched and skips it — expected,
not a fault.

## Static snapshots

`history/snapshot-static.py` freezes the all-time table, the course guide and
every finished year into `site/public/data/`. The site reads those from the CDN
so that only the year still being played, and the live board, ever reach Apps
Script — which serialises requests and starts returning HTML error pages once a
crowd arrives.

Re-run it after `BBGC > Rebuild all-time stats`, after importing a past year,
and once the current tournament finishes, then commit and push.
