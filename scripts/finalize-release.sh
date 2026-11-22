#!/usr/bin/env bash
# After serial candidate checks and human frame review. Requires Pillow.
# Publish only once the actual final archives (including their own SHA-256)
# have been tested. Source verification reuses npm cache when WW_OFFLINE=1.
set -euo pipefail
cd "$(dirname "$0")/.."
target=$(realpath -m "${1:-../winter-wonderland-delivery}")
if [[ -e "$target" ]]; then echo "Release already exists: $target" >&2; exit 3; fi
mkdir -p "$(dirname "$target")"
work=$(mktemp -d /tmp/ww-final-XXXXXXXX)
trap 'if [[ -d "$work" ]]; then printf "Unpublished staging: %s\n" "$work" >&2; fi' EXIT
python3 scripts/compact-captures.py
python3 scripts/optical-fixtures.py
python3 scripts/shot-sheet.py --tier all --width 1560
mv screenshots/vista-overview-medium.jpg screenshots/vista-overview.jpg
node scripts/evidence-doc.mjs
unset WW_ONLY_PLAYABLE
WW_RELEASE_DIR="$work" WW_REQUIRE_NESTED=1 WW_REQUIRE_SOAK=1 python3 scripts/release.py
PARK_PROOF_OUT="$work/playable-verification.json" node scripts/verify-release.mjs "$work/winter-wonderland-playable.zip"
WW_SOURCE_PROOF="$work/source-verification.json" node scripts/verify-source.mjs "$work/winter-wonderland-source.zip"
(cd "$work" && sha256sum -c winter-wonderland-SHA256.txt)
cp docs/RELEASE_REPORT.md "$work/RELEASE_REPORT.md"
cp screenshots/vista-overview.jpg "$work/VISTA_OVERVIEW.jpg"
mv "$work" "$target"
printf 'Verified delivery: %s\n' "$target"
