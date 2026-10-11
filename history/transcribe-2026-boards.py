#!/usr/bin/env python3
"""Transcribe the 2026 whiteboards into the sheet's row order.

The paper board and the sheet number their rounds differently, so games are
matched on the team PAIR, which is unique in a round robin. Board numbering is
the handwritten 1-6 list at the top of each pool sheet.
"""
import json

# board cell -> team-number pair, read off the printed schedule
SCHEDULE = [(2,1),(3,6),(4,5), (3,4),(6,1),(2,5), (6,4),(2,3),(1,5),
            (4,1),(5,3),(6,2), (5,6),(1,3),(4,2)]

# the handwritten 1-6 list at the top of each board -> the sheet's team name
BOARD = {
 'Pink (SouthMouth)': ['White Zin','Brothers Boor','The Big LeBocce','The Hitchhikers','The Mesh Strikes Back','-'],
 'Red (Glory Hole)' : ['Muck Fichigan','Hawkeyes','Holy Rollers','Laces Out','Brawley Heat Morkes Meat','-'],
 'Orange (Blaggo)'  : ['Smug Champs','Joanie Loves Bocce','The Busch Men','D-Boccery','The High End Jerkoffs',"Balboa's Balls"],
 'Green (Latrell)'  : ['The Bocce Ballers','Team Daisy','Guns n Rollers','Full Send Fondlers','Uncle Rico','Tight Lines'],
}

# scores as written, in the board's cell order; None = game not played (scratch)
WZ = None   # White Zin v Mesh: first digit pair is overwritten, needs confirming
SCORES = {
 'Pink (SouthMouth)': [(10,15), None, (13,15),  (15,13), None, (12,16),
                       None, (14,20), (WZ,5),   (10,15), (16,13), None,
                       None, (16,10), (9,19)],
 'Red (Glory Hole)' : [(11,19), None, (17,9),   (18,15), None, (1,21),
                       None, (18,10), (15,15),  (9,17), (12,11), None,
                       None, (15,4), (14,12)],
 'Orange (Blaggo)'  : [(7,21), (21,9), (15,12), (21,8), (13,20), (15,19),
                       (15,12), (15,14), (18,15), (12,15), (19,10), (15,13),
                       (13,12), (13,12), (11,13)],
 'Green (Latrell)'  : [(6,18), (13,12), (9,14), (14,7), (15,11), (13,14),
                       (16,3), (19,7), (21,8),  (3,21), (6,16), (7,25),
                       (14,16), (23,9), (9,25)],
}

def games(pool):
    """(teamA, teamB, scoreA, scoreB) keyed by frozenset of the pair."""
    names, out = BOARD[pool], {}
    for (i,j), sc in zip(SCHEDULE, SCORES[pool]):
        a, b = names[i-1], names[j-1]
        out[frozenset((a,b))] = (a, b, None, None) if sc is None else (a, b, sc[0], sc[1])
    return out

def standings(pool):
    rec = {t: dict(w=0,l=0,t=0,pf=0,pa=0) for t in BOARD[pool] if t != '-'}
    for a,b,sa,sb in games(pool).values():
        if sa is None or '-' in (a,b): continue
        rec[a]['pf']+=sa; rec[a]['pa']+=sb; rec[b]['pf']+=sb; rec[b]['pa']+=sa
        if sa>sb: rec[a]['w']+=1; rec[b]['l']+=1
        elif sb>sa: rec[b]['w']+=1; rec[a]['l']+=1
        else: rec[a]['t']+=1; rec[b]['t']+=1
    return rec

if __name__ == '__main__':
    import sys
    for pool in BOARD:
        print(f"\n=== {pool} ===")
        for t,r in sorted(standings(pool).items(), key=lambda kv:(-kv[1]['w'], kv[1]['l'], -(kv[1]['pf']-kv[1]['pa']))):
            print(f"  {t:28s} {r['w']}-{r['l']}" + (f"-{r['t']}" if r['t'] else "  ")
                  + f"   PF {r['pf']:3d}  PA {r['pa']:3d}  diff {r['pf']-r['pa']:+4d}")
