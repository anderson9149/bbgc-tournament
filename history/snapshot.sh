#!/bin/bash
# Save what the live API currently returns for every year into history/snapshots/.
# Run from the repo root, then `git diff` to see whether any sheet has changed.
set -euo pipefail
API=$(grep -o "https://script.google.com[^']*" site/src/config.js)
mkdir -p history/snapshots
for y in $(curl -sL "$API" | python3 -c "import sys,json; print(*json.load(sys.stdin)['years'])"); do
  curl -sL "$API?year=$y" | python3 -c "
import sys, json
d = json.load(sys.stdin)
json.dump(d, open('history/snapshots/%d.json' % d['year'], 'w'), indent=2, sort_keys=True)
print('  saved', d['year'])"
done
