"""Guard against the specific city-plane regression in the fixed hero views.

The two ROIs are meant for the unchanged 8:5 pond and garden bookmarks. This
is not a generic image quality test or a measurement of reflection accuracy.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser(description=__doc__)
a.add_argument('--shots',type=Path,default=root/'docs/evidence/shots-webgl.json')
a.add_argument('--output',type=Path,default=root/'docs/evidence/optical-fixtures-webgl.json')
a.add_argument('--baseline',action='store_true',help='Measure only; do not require all eight checks to pass.')
arg=a.parse_args()
s=json.loads(arg.shots.read_text())
boxes={'pond':(.26,.65,.73,.84),'garden':(.75,.61,.94,.74)}
results=[]
for row in s['rows']:
    key=row['shot']
    if key not in boxes or not row['file'].endswith('/'+key+'.png'):
        continue
    f=root/row['file']
    raw=f.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==row['sha256'], f'Frame is not in shot proof: {f}'
    with Image.open(f) as im:
        w,h=im.size
        assert abs(w/h-1.6)<.035, (f, im.size)
        crop=im.convert('L').crop(tuple(int(v*(w if i%2==0 else h)) for i,v in enumerate(boxes[key])))
        p=sorted(crop.get_flattened_data() if hasattr(crop,'get_flattened_data') else crop.getdata())
    lo,mid,hi=(p[round((len(p)-1)*r)] for r in (.10,.50,.90))
    dark=round(sum(v<40 for v in p)/len(p),4)
    ok=mid>=44 and hi-lo>=12 if key=='pond' else mid>=65 and dark<.42
    results.append(dict(shot=key,tier=row['tier'],p10=lo,p50=mid,p90=hi,below40=dark,sha256=row['sha256'],file=row['file'],ok=ok))
    print(key,row['tier'],lo,mid,hi,dark,'OK' if ok else 'Occlusion signature')
full={(key,t) for key in boxes for t in ('low','medium','high','ultra')}
ok=not s.get('failure') and not s.get('errors') and {(r['shot'],r['tier']) for r in results}==full and all(r['ok'] for r in results)
arg.output.write_text(json.dumps(dict(build=s['build'],method=__doc__,boxes=boxes,baseline=arg.baseline,ok=ok,results=results),ensure_ascii=False,indent=2)+'\n')
if not arg.baseline and not ok:
    raise SystemExit('Look for an opaque dark overlay in the reflected water or garden snow.')
