"""Builds the Code Blue Audit icon (all Android sizes + adaptive layer) and launch screens into android-res/.
Run: python3 tools/make_icons.py"""
from PIL import Image, ImageDraw, ImageFont
import os, glob
S = 2048; RED = (29, 78, 216); BG = (11, 15, 20); W = (255, 255, 255, 255); CUT = (0, 0, 0, 0)

def pictogram():
    """Clipboard with a tick and check lines — the quality audit."""
    im = Image.new('RGBA', (S, S), CUT); d = ImageDraw.Draw(im)
    # board
    d.rounded_rectangle([430, 330, 1620, 1820], radius=120, fill=W)
    d.rounded_rectangle([540, 470, 1510, 1710], radius=60, fill=CUT)
    # clip
    d.rounded_rectangle([760, 210, 1290, 470], radius=90, fill=W)
    d.rounded_rectangle([890, 280, 1160, 360], radius=40, fill=CUT)
    # three check rows: box + line
    for i, y in enumerate((700, 1050, 1400)):
        d.rounded_rectangle([640, y-90, 820, y+90], radius=34, fill=W)
        d.rounded_rectangle([670, y-60, 790, y+60], radius=20, fill=CUT)
        d.rounded_rectangle([900, y-38, 1400, y+38], radius=38, fill=W)
        if i < 2:
            w = 56
            pts = [(665, y-5), (720, y+55), (845, y-110)]
            d.line(pts, fill=W, width=w, joint='curve')
            for c in pts: d.ellipse([c[0]-w/2, c[1]-w/2, c[0]+w/2, c[1]+w/2], fill=W)
    return im.crop(im.getbbox())

art = pictogram()

def place(canvas, frac, yoff=0.0):
    n = canvas.size[0]; sc = frac*n/max(art.size)
    a = art.resize((max(1, int(art.size[0]*sc)), max(1, int(art.size[1]*sc))), Image.LANCZOS)
    canvas.alpha_composite(a, ((n-a.size[0])//2, (n-a.size[1])//2 + int(yoff*n))); return canvas

R = 'android-res'
for k, m in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
    os.makedirs(f'{R}/mipmap-{k}', exist_ok=True)
    n = int(108*m); place(Image.new('RGBA', (n, n), CUT), 0.56, 0.0).save(f'{R}/mipmap-{k}/ic_launcher_foreground.png')
    n = int(48*m)
    sq = Image.new('RGBA', (n, n), CUT); ImageDraw.Draw(sq).rounded_rectangle([0, 0, n-1, n-1], radius=int(n*0.18), fill=RED+(255,))
    place(sq, 0.74, 0.0).save(f'{R}/mipmap-{k}/ic_launcher.png')
    rd = Image.new('RGBA', (n, n), CUT); ImageDraw.Draw(rd).ellipse([0, 0, n-1, n-1], fill=RED+(255,))
    place(rd, 0.64, 0.0).save(f'{R}/mipmap-{k}/ic_launcher_round.png')

# launch screens (sizes match Capacitor's template)
SPL = {'drawable': (480, 320), 'drawable-land-hdpi': (800, 480), 'drawable-land-mdpi': (480, 320), 'drawable-land-xhdpi': (1280, 720),
       'drawable-land-xxhdpi': (1600, 960), 'drawable-land-xxxhdpi': (1920, 1280), 'drawable-port-hdpi': (480, 800), 'drawable-port-mdpi': (320, 480),
       'drawable-port-xhdpi': (720, 1280), 'drawable-port-xxhdpi': (960, 1600), 'drawable-port-xxxhdpi': (1280, 1920)}
icon = Image.open(f'{R}/mipmap-xxxhdpi/ic_launcher.png').convert('RGBA')
B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; Rg = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
for folder, (w, h) in SPL.items():
    u = min(w, h); im = Image.new('RGBA', (w, h), BG+(255,)); d = ImageDraw.Draw(im)
    isz = int(u*0.34); top = int(h*0.5 - isz*0.85)
    im.alpha_composite(icon.resize((isz, isz), Image.LANCZOS), ((w-isz)//2, top))
    d.text((w/2, top+isz+int(u*0.06)), 'Code Blue Audit', font=ImageFont.truetype(B, int(u*0.085)), fill=(255, 255, 255), anchor='mt')
    d.text((w/2, h-int(u*0.17)), 'Developed by', font=ImageFont.truetype(Rg, int(u*0.042)), fill=(138, 152, 170), anchor='mt')
    d.text((w/2, h-int(u*0.11)), 'Dr. Kiran Rajagopal', font=ImageFont.truetype(B, int(u*0.05)), fill=(255, 255, 255), anchor='mt')
    os.makedirs(f'{R}/{folder}', exist_ok=True); im.convert('RGB').save(f'{R}/{folder}/splash.png')

# also keep a 1024 px master icon
place(Image.new('RGBA', (1024, 1024), RED+(255,)), 0.74).convert('RGB').save('assets/icon-only.png')
# web / iPhone icons (iOS rounds the corners itself, so these are full-bleed and opaque)
os.makedirs('www/icons', exist_ok=True)
for name, n, frac in (('apple-touch-icon.png', 180, 0.74), ('icon-192.png', 192, 0.74), ('icon-512.png', 512, 0.74), ('icon-maskable-512.png', 512, 0.58)):
    place(Image.new('RGBA', (n, n), RED+(255,)), frac).convert('RGB').save('www/icons/' + name)
print('icons + splash written')
