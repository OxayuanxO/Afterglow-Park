"""Optional QA contact sheets made only from the real browser PNGs (Pillow)."""
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image, ImageOps, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--tier', choices=['low', 'medium', 'high', 'ultra', 'all'], default='medium')
parser.add_argument('--output', type=Path, default=root / 'screenshots/vista-overview.jpg')
parser.add_argument('--width', type=int, default=1440)
args = parser.parse_args()
layout = json.loads((root / 'src/data/layout.json').read_text())
proof = json.loads((root / 'docs/evidence/shots-webgl.json').read_text())
required={f'screenshots/webgl2/{tier}/{shot["id"]}.png' for tier in ('low','medium','high','ultra') for shot in layout['shots']}
rows={r['file']:r for r in proof['rows'] if r['file'].startswith('screenshots/webgl2/')}
if proof.get('failure') or proof.get('errors') or set(rows)!=required or len(required)!=48:
    raise SystemExit('Run the complete WebGL 2 hero matrix first.')
for file,row in rows.items():
    if hashlib.sha256((root/file).read_bytes()).hexdigest()!=row['sha256']:
        raise SystemExit(f'Stale or altered frame: {file}')

INK = '#1b1b18'; PAPER = '#e7d6ac'; MUTED = '#ae9f79'; GOLD = '#917147'
font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
serif = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()

def sheet(tier, dest):
    w = args.width; edge = 26; gap = 14; cols = 4; top = 122
    thumb = (w - edge*2 - gap*(cols-1)) // cols
    img_h = round(thumb * 5/8); h = top + 3*(img_h+47) + 36
    out = Image.new('RGB', (w, h), INK); draw = ImageDraw.Draw(out)
    draw.text((edge, 19), 'WINTER WONDERLAND', font=get_font(serif, 34), fill=PAPER)
    draw.text((edge, 70), f'FIELD ATLAS  /  WEBGL 2  /  {tier.upper()}  /  12 CAMERA BOOKMARKS', font=get_font(font, 15), fill=MUTED)
    draw.line((edge,103,w-edge,103), fill=GOLD,width=1)
    for i, v in enumerate(layout['shots']):
        x = edge + i % cols*(thumb+gap);y = top + i // cols*(img_h+47)
        f = root / 'screenshots/webgl2' / tier / (v['id']+'.png')
        with Image.open(f) as im:
            snap = ImageOps.fit(im.convert('RGB'), (thumb,img_h), method=Image.Resampling.LANCZOS)
            out.paste(snap, (x,y))
        draw.text((x,y+img_h+6), f'{i+1:02d}',font=get_font(font,13), fill=GOLD)
        draw.text((x+30,y+img_h+4), v['en'],font=get_font(serif,max(12,round(17*w/1440))), fill=PAPER)
    draw.text((edge,h-25), proof['build'].split('/')[-1]+'   /   Still frames, not FPS or hardware certification',font=get_font(font,12),fill=MUTED)
    dest.parent.mkdir(parents=True,exist_ok=True);out.save(dest,quality=92,optimize=True)
    print(dest)

if args.tier == 'all':
    for name in ['low','medium','high','ultra']:
        sheet(name,args.output.parent/(args.output.stem+'-'+name+'.jpg'))
else:
    sheet(args.tier,args.output)
