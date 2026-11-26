#!/usr/bin/env bash
# Captures REAL responses from the running app (preview mode) for the video's "a vote can't be forged" scene.
# Usage: APP_URL=http://localhost:3117 bash video/evidence.sh > video/work/evidence.txt
set -u
APP="${APP_URL:-http://localhost:3117}"
A=$(mktemp); B=$(mktemp); trap 'rm -f "$A" "$B"' EXIT
show() { printf '$ %s\n%s\n\n' "$1" "$2"; }

ROAST=$(curl -s -c "$A" -b "$A" -X POST "$APP/api/roast" -H 'content-type: application/json' \
  -d '{"text":"# demo\nA tiny CLI that does one thing. Install it somehow. Run it. It is fast."}')
ID=$(printf '%s' "$ROAST" | python3 -I -c "import sys,json;print(json.load(sys.stdin)['roastId'])")
SHORT="${ID:0:24}…"

show "POST /api/roast   # visitor A gets a roast and a signed roastId" "200  roastId: $SHORT"
R1=$(curl -s -o /dev/null -w '%{http_code}' -c "$B" -b "$B" -X POST "$APP/api/roast" -H 'content-type: application/json' -d '{"text":"# other\nAnother visitor with another README of enough length."}')
R2=$(curl -s -w '  %{http_code}' -c "$B" -b "$B" -X POST "$APP/api/feedback" -H 'content-type: application/json' -d "{\"roastId\":\"$ID\",\"vote\":\"up\"}")
show "POST /api/feedback   # visitor B votes on visitor A's roast" "$R2"
R3=$(curl -s -w '  %{http_code}' -X POST "$APP/api/feedback" -H 'content-type: application/json' -d "{\"roastId\":\"$ID\",\"vote\":\"up\"}")
show "POST /api/feedback   # no cookie at all" "$R3"
R4=$(curl -s -w '  %{http_code}' -X POST "$APP/api/roast" -H 'origin: https://evil.example' -H 'content-type: application/json' -d '{"text":"x"}')
show "POST /api/roast   # from another website" "$R4"
R5=$(curl -s -w '  %{http_code}' -b "$A" -X POST "$APP/api/feedback" -H 'content-type: application/json' -d "{\"roastId\":\"$ID\",\"vote\":\"up\"}" | python3 -I -c "import sys,re;t=sys.stdin.read();print(re.sub(r'\"standings\":.*?\}\}?','\"standings\":null}',t) if False else t[:90])")
show "POST /api/feedback   # visitor A votes on their own roast" "$R5"
