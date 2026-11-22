"""Package offline runnable build and the source + acceptance evidence (Python 3)."""
import hashlib
import json
import os
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
out = Path(os.environ.get('WW_RELEASE_DIR',root.parent)).resolve()
out.mkdir(parents=True, exist_ok=True)
assert (dist / 'index.html').is_file(), 'Run npm run build first.'
shots = list((root / 'screenshots' / 'webgl2').glob('*/*.png'))
assert len(shots) == 48, 'Expected the final 12-by-4 screenshot matrix.'
# Refuse to pair a new revision with a previous screenshot matrix or gallery.
index = (dist / 'index.html').read_text()
script = re.search(r'<script[^>]*type="module"[^>]*src="([^"]+)"', index).group(1)
bundle_path = (dist / script).resolve()
assert bundle_path.is_file() and bundle_path.is_relative_to(dist), 'Missing local JS bundle.'
bundle_hash = hashlib.sha256(bundle_path.read_bytes()).hexdigest()
proof = json.loads((root / 'docs/evidence/shots-webgl.json').read_text())
assert proof.get('build') == script and not proof.get('errors') and not proof.get('failure'), 'Capture the actual release build first.'
matrix = {v['file'] for v in proof['rows'] if v['file'].startswith('screenshots/webgl2/') and v.get('pixels', {}).get('opaque') == 1000}
assert matrix == {f.relative_to(root).as_posix() for f in shots}, 'Missing or empty hero image.'
for row in proof['rows']:
    if row['file'].startswith(('screenshots/webgl2/','public/previews/','screenshots/tone-webgl-')):
        assert hashlib.sha256((root / row['file']).read_bytes()).hexdigest() == row['sha256'], f"Image changed since capture: {row['file']}"
assert proof['pipeline']['halfFloatScene'] and proof['pipeline']['outputColorSpace'] == 'srgb'
for row in proof['rows']:
    if not row['file'].startswith('screenshots/webgl2/'):
        continue
    if row['tier'] in ('medium','high'):
        cap, tri = (1000, 5_000_000) if row['tier']=='medium' else (1800, 9_000_000)
        assert row['calls'] <= cap and row['triangles'] <= tri, f"Inclusive quality budget exceeded: {row['file']}"
assert len({v['shot'] for v in proof['rows'] if v['file'].startswith('public/previews/')}) == 5, 'Capture the release gallery and opening image.'
required = ['smoke-production-webgl', 'ui-production', 'discovery-webgl', 'quiet-views', 'canopy-route', 'live-browser', 'poi-runtime']
for name in required:
    results = json.loads((root / f'docs/evidence/{name}.json').read_text())
    assert results.get('build') == script and not results.get('errors') and not results.get('failure'), f'Run browser verification for {name} on {script}.'
    assert all(x.get('passed', True) for x in results.get('logs', [])), f'Failed check in {name}.'
    if name=='smoke-production-webgl':
        assert len(results['logs']) >= 26, 'Smoke did not finish.'
    if name=='canopy-route':
        assert len(results['route'])==19 and all(x['reached'] and x['landed'] for x in results['crossings']), 'Verify elevated routes and tunnel.'
    if name=='ui-production':
        assert len(results['thumbs'])==4 and all(x['width']>=640 for x in results['thumbs']), 'Validate decoded gallery images.'
    if name=='live-browser':
        assert results['ok'], 'Verify native-loop mouse and keyboard.'
    if name=='quiet-views':
        assert len(results['results'])==5, 'Retake all five actual seating views.'
    if name=='discovery-webgl':
        assert not results['misses'] and len(set(results['clock']['cues']['seen'])) == 6, 'Verify all exploration and scheduled cues.'
for thumb in (root / 'public/previews').glob('*.webp'):
    assert thumb.read_bytes() == (dist / 'previews' / thumb.name).read_bytes(), f'Rebuild after refreshing {thumb.name}.' 

start = '''# WINTER WONDERLAND｜使用方式

這是已建置的可漫遊 3D 公園，不需安裝 npm 相依套件。

1. 先完整解壓，不要直接在 ZIP 內點開 `index.html`。
2. 在 `index.html` 同一層開啟終端機，執行 `python3 -m http.server 4173`（Windows 可以用 `py -m http.server 4173`）。
3. 在硬體加速的桌面瀏覽器開啟 http://localhost:4173/，點「進入公園」解鎖音訊。WASD 走路、滑鼠轉頭、E 互動、Tab 設定、M 地圖、P 拍照。
4. 若載入或 GPU 有問題，試 http://localhost:4173/?backend=webgl&quality=low 。

也可將資料夾部署至靜態 HTTP 服務。WebGPU 需要 HTTPS 或 localhost；不用從網際網路下載貼圖或音訊。完整操作、授權、已知差距請見 `README.md`、`CREDITS.md` 及同次發佈的原始碼 ZIP。軟體 WebGL 2 的畫面可驗證，不代表實體 GPU 的目標 FPS。
'''

# The playable package is offline. Include source-independent instructions and
# evidence for this bundle, not the screenshot archive or old build claims.
json_docs=[]
record=json.loads((root/'docs/evidence/build.json').read_text())
assert record['sha256']==bundle_hash, 'Regenerate the evidence digest.'
layout_digest={k:hashlib.sha256((root/k).read_bytes()).hexdigest() for k in ['src/data/layout.json','src/data/christmas-sites.json']}
# A few explicitly historical comparisons are linked from the report. Their
# recorded build IDs remain unchanged and they never count as passing gates.
history={'gpu-park-vulkan-sw-r10c','gpu-canvas-profiles','soak-accelerated-webgl','optical-fixtures-regression-r10j','compat-firefox','compat-webkit'}
for p in sorted((root/'docs/evidence').glob('*.json')):
    v=json.loads(p.read_text())
    current_source=bool(record.get('sourceSha256')) and v.get('sourceSha256')==record['sourceSha256']
    if v.get('build')==script or current_source or v.get('digests')==layout_digest or p.stem in history:
        json_docs.append(p)
if os.environ.get('WW_REQUIRE_NESTED')=='1':
    nested=json.loads((root/'docs/evidence/nested-archive-webgl.json').read_text())
    runtime=hashlib.sha256()
    for f in sorted((p for p in dist.rglob('*') if p.is_file()),key=lambda p:p.relative_to(dist).as_posix()):
        runtime.update(f.relative_to(dist).as_posix().encode()+b'\0')
        runtime.update(hashlib.sha256(f.read_bytes()).digest())
    assert nested.get('ok') and nested['build']==script and nested['buildSha256']==bundle_hash, 'Confirm the extracted HTTP package first.'
    assert nested['archive']['runtimeSha256']==runtime.hexdigest(), 'The runtime payload differs from the nested HTTP test.'

# Strict delivery can require a completed wall-clock run. Diagnostic packages
# may still be staged to test their real sub-path hashing independently.
if os.environ.get('WW_REQUIRE_SOAK') == '1':
    build_record=json.loads((root/'docs/evidence/build.json').read_text())
    dev=json.loads((root/'docs/evidence/smoke-dev-webgl.json').read_text())
    assert dev.get('sourceSha256')==build_record.get('sourceSha256') and len(dev.get('logs',[]))>=26 and all(v.get('passed') for v in dev['logs']) and not dev.get('errors'), 'The source/module smoke is missing or not clean.'
    profiles=[json.loads(p.read_text()) for p in (root/'docs/evidence').glob('profiles-webgl-*.json')]
    for grade in ['medium','high']:
        assert any(v.get('build')==script and v.get('tier')==grade and len(v.get('views',{}))>=6 and not v.get('exceeds') and not v.get('errors') for v in profiles), f'Missing strict {grade} profile.'
    native = [json.loads(p.read_text()) for p in (root/'docs/evidence').glob('soak-live-webgl*.json')]
    assert any(v.get('build') == script and v.get('passed') and v.get('finished') and
               not v.get('failure') and not v.get('errors') and v.get('seconds',0) >= 1800 and
               len(v.get('samples',[])) >= 60 and v['samples'][-1]['wallSec'] >= 1800 for v in native), 'A same-build 30-minute pass is required.'

artifacts = []
targets = [('playable', ('dist',))]
if os.environ.get('WW_ONLY_PLAYABLE') != '1':
    targets.append(('source', ('src', 'public', 'scripts', 'docs', 'screenshots')))
for name, dirs in targets:
    dest = out / f'winter-wonderland-{name}.zip'
    tmp = dest.with_suffix('.zip.staging')
    with ZipFile(tmp, 'w', compression=ZIP_DEFLATED, compresslevel=6) as z:
        for dirname in dirs:
            for entry in sorted((root / dirname).rglob('*')):
                if not entry.is_file() or any(p in {'.DS_Store','__pycache__'} for p in entry.parts):
                    continue
                z.write(entry, entry.relative_to(dist) if name == 'playable' else 'winter-wonderland/' + entry.relative_to(root).as_posix())
        if name == 'playable':
            z.writestr('START_HERE.md', start)
            for file in ['README.md', 'CREDITS.md', 'docs/KNOWN_ISSUES.md','docs/ARCHITECTURE.md','docs/PERF_NOTES.md','docs/POI_LIST.md','docs/ACCEPTANCE.md','docs/RELEASE_REPORT.md','docs/QA_RUNBOOK.md']:
                z.write(root / file, file)
            for p in json_docs:
                z.write(p,p.relative_to(root).as_posix())
        else:
            for file in ['README.md','CREDITS.md','index.html','package.json','package-lock.json','vite.config.js','.gitignore']:
                z.write(root / file, 'winter-wonderland/' + file)
    with ZipFile(tmp) as z:
        assert z.testzip() is None, f'ZIP integrity failed for {dest.name}.'
    tmp.replace(dest)
    artifacts.append(dest)
    print(f'{dest.name}: {dest.stat().st_size:,} bytes')

def sha256(p):
    h = hashlib.sha256()
    with p.open('rb') as file:
        for block in iter(lambda: file.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()

(out / 'winter-wonderland-SHA256.txt').write_text(''.join(f'{sha256(p)}  {p.name}\n' for p in artifacts), encoding='ascii')
