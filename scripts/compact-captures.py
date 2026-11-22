"""Losslessly encode opaque browser PNGs for the release (Pillow optional).

Keep the original browser bytes' digest, the archived digest and the exact
RGBA pixel digest. No rescaling, sharpening, grading or quantization.
"""
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
from PIL import Image

root = Path(__file__).resolve().parents[1]
index = (root / 'dist/index.html').read_text()
build = re.search(r'<script[^>]+type="module"[^>]+src="([^"]+)"', index).group(1)
sha = lambda b: hashlib.sha256(b).hexdigest()
count = old_total = new_total = 0
for path in sorted((root / 'docs/evidence').glob('shots-*.json')):
    proof = json.loads(path.read_text())
    if proof.get('build') != build or proof.get('errors') or proof.get('failure'):
        continue
    changed = False
    for row in proof['rows']:
        file = row['file']
        if not file.startswith('screenshots/') or not file.endswith('.png') or row.get('browserSha256'):
            continue
        filename = (root / file).resolve()
        assert filename.is_relative_to(root / 'screenshots'), file
        raw = filename.read_bytes()
        assert sha(raw) == row['sha256'], f'Raw browser output changed: {file}'
        with Image.open(BytesIO(raw)) as im:
            image = im.convert('RGBA')
            if image.getchannel('A').getextrema() != (255, 255):
                continue
            pixels = image.tobytes()
            out = BytesIO()
            image.convert('RGB').save(out, format='PNG', optimize=True, icc_profile=im.info.get('icc_profile'))
            data = out.getvalue()
        if len(data) >= len(raw):
            continue
        with Image.open(BytesIO(data)) as check:
            assert check.convert('RGBA').tobytes() == pixels, file
        filename.write_bytes(data)
        count += 1
        old_total += len(raw)
        new_total += len(data)
        row.update(browserSha256=row['sha256'], rgbaSha256=sha(pixels), sha256=sha(data), encoding='Lossless opaque PNG; identical RGBA pixels')
        changed = True
    if changed:
        path.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
print(f'{count} PNGs verified pixel-for-pixel: {old_total:,} → {new_total:,} bytes')
