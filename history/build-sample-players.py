#!/usr/bin/env python3
"""Mirror of computePlayers_ in Code.gs, for the bundled sample data.

The live site reads the Individual tab the script writes; this only keeps
site/src/sample-stats.json in step so ?sample shows the same shape.
"""
import json, collections

stats = json.load(open('site/src/sample-stats.json'), object_pairs_hook=collections.OrderedDict)
repo = json.load(open('history/team-rosters.json'))
by_team = {t['team']: t for t in stats['teams']}

by = {}
for team, entry in repo.items():
    t = by_team.get(team)
    # 2016 and 2017 were played but never written down. The roster file carries
    # those champions, so the trophy and the year on the field both count while
    # the win-loss record stays empty — there are no games to add.
    early = entry.get('titles') or []
    if not t and not early:
        continue
    for name in entry.get('players', []):
        if not name:
            continue
        e = by.setdefault(name, dict(player=name, teams=[], years=set(), titleYears=set(),
                                     w=0, l=0, t=0, koYears=0, koW=0, koL=0, groupTitles=0))
        if team not in e['teams']:
            e['teams'].append(team)
        e['titleYears'] |= set(early)
        e['years'] |= set(early)
        if not t:
            continue
        e['years'] |= set(t['years'])
        e['titleYears'] |= set(t.get('titleYears') or [])
        for k in ('w', 'l', 't', 'koYears', 'koW', 'koL', 'groupTitles'):
            e[k] += t[k]

players = []
for e in by.values():
    e['teams'].sort()
    e['years'] = sorted(e['years'])
    e['titleYears'] = sorted(e['titleYears'])
    e['titles'] = len(e['titleYears'])
    e['tournaments'] = len(e['years'])
    gp = e['w'] + e['l'] + e['t']
    e['pct'] = round((e['w'] + .5 * e['t']) / gp, 3) if gp else 0
    players.append(e)
players.sort(key=lambda p: (-p['w'], p['player']))

out = collections.OrderedDict()
for k, v in stats.items():
    if k == 'players':
        continue          # replaced below; copying it here would undo the rebuild
    out[k] = v
    if k == 'h2h':
        out['players'] = players
if 'players' not in out:
    out['players'] = players
json.dump(out, open('site/src/sample-stats.json', 'w'), indent=2, ensure_ascii=False)
open('site/src/sample-stats.json', 'a').write('\n')
print('%d players from %d rostered teams' % (len(players), sum(1 for t in repo if t in by_team)))
