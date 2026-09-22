#!/usr/bin/env python3
"""Turn history/<year>.json into tab-separated blocks to paste into that year's sheet.
Usage: python3 history/make-paste.py 2024 > history/2024-paste.txt"""
import json, sys
year = sys.argv[1]
d = json.load(open(f'history/{year}.json'))
POOLS = ['Orange', 'Red', 'Blue', 'Yellow']
out = []
def block(title, where, rows):
    out.append(f'==== {title} — paste into {where} ====')
    out.extend('\t'.join('' if v is None else str(v) for v in r) for r in rows)
    out.append('')

# Teams: A2:D25 (Team, Pool, Seed Override, PIN blank)
rows = []
for p in POOLS:
    for t in d['teams'][p]:
        rows.append([t, p, d.get('overrides', {}).get(t, ''), ''])
block('Teams', 'Teams!A2', rows)

# PoolGames: B2:D61 (Round, Slot A, Slot B) then G2:H61 (Score A, Score B), in the sheet's pool order
sched, scores = [], []
for p in POOLS:
    for rnd, a, b, sa, sb in sorted(d['poolGames'][p], key=lambda g: g[0]):
        sched.append([rnd, a, b]); scores.append([sa, sb])
block('PoolGames rounds & slots', 'PoolGames!B2', sched)
block('PoolGames scores', 'PoolGames!G2', scores)

# BracketGames: C2:D5 both names for round 1, C6:C9 bye names, E2:F12 scores
r1 = [[g['a'], g['b']] for g in d['bracket'][:4]]
block('Bracket round 1 teams', 'BracketGames!C2', r1)
block('Bracket bye teams', 'BracketGames!C6', [[g['a']] for g in d['bracket'][4:8]])
block('Bracket scores (1-0 = winner unknown score)', 'BracketGames!E2',
      [[1, 0] if g['winner'] == 'a' else [0, 1] for g in d['bracket']])
print('\n'.join(out))
