#!/usr/bin/env bash
# Serial browser checks for low-memory CI. Build and start preview before use.
# PARK_WAIT_PID is optional; do not run browsers beside the wall-clock walk.
set -uo pipefail
cd "$(dirname "$0")/.."
export PARK_URL=${PARK_URL:-http://127.0.0.1:5173/}
export BACKEND=webgl
RUN=${RUN_ID:-candidate}
unset RUN_ID PRESENT GPU_PROFILE
LOG=${LOG_DIR:-/tmp/ww-checks-$RUN}
mkdir -p "$LOG"
: > "$LOG/outcomes"
if [[ -n "${PARK_WAIT_PID:-}" ]]; then tail --pid="$PARK_WAIT_PID" -f /dev/null; fi
served() { curl -fsS "$PARK_URL" | grep -o 'index-[^"]*\.js'; }
bundle=$(served)
if [[ -z "$bundle" || ! -r "dist/assets/$bundle" || "${EXPECT_BUNDLE:-$bundle}" != "$bundle" ]]; then
  echo 'Build and serve the matching release before running candidate checks.' >&2; exit 3
fi
sha=$(sha256sum "dist/assets/$bundle" | cut -d' ' -f1)
verify() { [[ "$(served)" == "$bundle" ]] && [[ "$(sha256sum "dist/assets/$bundle" | cut -d' ' -f1)" == "$sha" ]]; }
run() {
  local name=$1 rc
  shift
  verify || exit 4
  printf '\n== %s · %s ==\n' "$name" "$(date -Iseconds)"
  "$@" > "$LOG/$name.log" 2>&1; rc=$?
  tail -n 14 "$LOG/$name.log"
  echo "$name $rc" | tee -a "$LOG/outcomes"
  return "$rc"
}
run units npm run test:unit || exit 6
# 800×500 viewport yields previews over 640 px without a large software framebuffer.
run gl-frames timeout -k 12s 19m env W=800 H=500 PREVIEWS=1 npm run shots || exit 7
run rebuild npm run build || exit 8
verify || exit 9
run production timeout -k 10s 5m env TARGET=production npm test
run gallery timeout -k 10s 5m env TARGET=production W=1184 H=740 npm run qa:ui
run crossings timeout -k 10s 4m npm run qa:canopy
run seats timeout -k 10s 5m npm run qa:seats
run journey timeout -k 10s 5m npm run qa:journey
run discovery timeout -k 10s 4m npm run qa:discovery
run places npm run docs:poi
run medium timeout -k 10s 5m env VIEWS=pond,canopy,aerial,carousel,lookout,lantern QUALITY=medium REQUIRE=1 OUT="docs/evidence/profiles-webgl-medium-$RUN.json" npm run qa:profile
run high timeout -k 10s 5m env VIEWS=pond,canopy,aerial,carousel,lookout,lantern QUALITY=high REQUIRE=1 OUT="docs/evidence/profiles-webgl-high-$RUN.json" npm run qa:profile
run density timeout -k 10s 4m env GRID=6 REQUIRE=1 RUN_ID="$RUN" npm run qa:density
run heldout timeout -k 10s 4m env GRID=4.93 PHASE=.25,.74 REQUIRE=1 RUN_ID="$RUN-holdout" npm run qa:density
run repaired-416 timeout -k 10s 4m env GRID=4.16 PHASE=.39,.91 REQUIRE=1 RUN_ID="$RUN-repaired-416" npm run qa:density
run repaired-361 timeout -k 10s 4m env GRID=3.61 PHASE=.08,.46 REQUIRE=1 RUN_ID="$RUN-repaired-361" npm run qa:density
run audit-383 timeout -k 10s 4m env GRID=3.83 PHASE=.63,.37 RUN_ID="$RUN-audit-383" npm run qa:density
run art timeout -k 10s 6m env OUT=screenshots/detail npm run qa:art
run audio timeout -k 10s 4m node scripts/audio-witness.mjs
# Stage a playable-only package now, then use the nested runtime fingerprint
# for the final attestable package once the remaining observations are in.
run preliminary-docs node scripts/evidence-doc.mjs
if run stage env WW_RELEASE_DIR="$LOG/packed" WW_ONLY_PLAYABLE=1 python3 scripts/release.py; then
  run nested timeout -k 10s 5m node scripts/verify-release.mjs "$LOG/packed/winter-wonderland-playable.zip"
fi
for engine in firefox webkit; do
  run "$engine" timeout -k 10s 5m env PW_ENGINE="$engine" SOFTWARE=1 HEADFUL=1 xvfb-run -a node scripts/compat.mjs
done
run gpu-composite timeout -k 10s 5m env GPU_PROFILE=vulkan-sw RUN_ID="$RUN" OUT=screenshots/render-check npm run qa:gpu:park
run gpu-live timeout -k 10s 5m env GPU_PROFILE=vulkan-sw RUN_ID="$RUN" OUT=screenshots/render-check npm run qa:gpu:live
# The direct software comparison may be blank; save the failure separately.
run gpu-direct timeout -k 10s 5m env GPU_PROFILE=vulkan-sw PRESENT=direct RUN_ID="$RUN-direct" OUT=screenshots/render-check npm run qa:gpu:park
if grep -qx 'gpu-composite 0' "$LOG/outcomes"; then
  run gpu-frames timeout -k 10s 13m env BACKEND=gpu GPU_PROFILE=vulkan-sw TIERS=medium W=560 H=350 RUN_ID="$RUN" npm run shots
fi
run dev timeout -k 10s 5m npm run qa:dev
run final-docs node scripts/evidence-doc.mjs
printf '\nCandidate checks finished · %s · %s\n' "$bundle" "$sha"
cat "$LOG/outcomes"
