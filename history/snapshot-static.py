#!/usr/bin/env python3
"""Freeze everything that does not change during play into site/public/data/.

Apps Script serialises requests and starts returning HTML error pages under a
crowd, so the only calls that should reach it during a tournament are the
current year and the live board. Past years, the all-time table and the course
guide never change between rebuilds, so they ship with the site instead.
"""
import json, os, re, sys, time, urllib.request

API = re.search(r"https://script\.google\.com[^']*", open('site/src/config.js').read()).group(0)
OUT = 'site/public/data'
os.makedirs(OUT, exist_ok=True)

def get(url, tries=4):
    for i in range(1, tries + 1):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                d = json.load(r)
            if not d.get('error'):
                return d
            print('    error: %s' % d['error'])
        except Exception as e:
            print('    %s' % e)
        if i < tries:
            time.sleep(3 * i)
    return None

def write(name, data):
    p = os.path.join(OUT, name)
    json.dump(data, open(p, 'w'), separators=(',', ':'))
    print('  %-14s %7d bytes' % (name, os.path.getsize(p)))

fails = []
for name, url in [('stats.json', API + '?action=stats'), ('holes.json', API + '?action=holes')]:
    d = get(url)
    write(name, d) if d else fails.append(name)

years = json.load(open(os.path.join(OUT, 'stats.json')))['years'] if os.path.exists(os.path.join(OUT, 'stats.json')) else []
current = max(json.load(open(os.path.join(OUT, 'stats.json'))).get('years', [0])) + 1 if years else None
for y in years:
    d = get('%s?year=%d' % (API, y))
    if d and d.get('year') == y and d.get('pools'):
        write('%d.json' % y, d)
    else:
        fails.append(str(y))

print('\nfailed: %s' % (', '.join(fails) if fails else 'none'))
sys.exit(1 if fails else 0)
