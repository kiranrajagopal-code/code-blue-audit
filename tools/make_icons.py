"""Builds the Audit Code Blue premium icon set: CPR pictogram on a deep-blue gradient with an audit tick seal (all Android sizes + adaptive layer) and launch screens into android-res/.
Run: python3 tools/make_icons.py"""
from PIL import Image, ImageDraw, ImageFont
import os, glob
S = 2048; RED = (29, 78, 216); BG = (11, 15, 20); W = (255, 255, 255, 255); CUT = (0, 0, 0, 0)

def pictogram():
    """Rescuer kneeling at the patient's side, facing the viewer, straight arms locked on the chest."""
    im = Image.new('RGBA', (S, S), CUT); d = ImageDraw.Draw(im)
    def line(p, q, w, fill=W):
        d.line([p, q], fill=fill, width=w)
        for c in (p, q): d.ellipse([c[0]-w/2, c[1]-w/2, c[0]+w/2, c[1]+w/2], fill=fill)
    # ground
    d.rounded_rectangle([250, 1560, 1800, 1610], radius=25, fill=W)
    # patient lying on back, head to the left
    d.ellipse([330-125, 1400-125, 330+125, 1400+125], fill=W)
    d.rounded_rectangle([480, 1335, 1780, 1470], radius=68, fill=W)
    cx = 820                                   # chest level of the patient
    # rescuer torso (behind the patient), shoulders over the chest
    d.polygon([(cx-190, 800), (cx+190, 800), (cx+120, 1335), (cx-120, 1335)], fill=W)
    d.rounded_rectangle([cx-200, 760, cx+200, 880], radius=60, fill=W)
    # head
    d.ellipse([cx-135, 470, cx+135, 740], fill=W)
    # arms: straight, from shoulders converging to the hands; red gap separates them from the torso
    for side in (-1, 1):
        sh = (cx + side*235, 830); hand = (cx + side*45, 1290)
        line(sh, hand, 150, fill=CUT)          # cut-out outline
    d.polygon([(cx-190, 800), (cx+190, 800), (cx+120, 1335), (cx-120, 1335)], fill=W)
    # re-cut the gaps between arms and torso
    for side in (-1, 1):
        sh = (cx + side*235, 830); hand = (cx + side*45, 1290)
        line(sh, hand, 150, fill=CUT)
    for side in (-1, 1):
        sh = (cx + side*235, 830); hand = (cx + side*45, 1290)
        line(sh, hand, 100)
    d.ellipse([cx-135, 470, cx+135, 740], fill=W)
    # stacked hands on the chest
    d.rounded_rectangle([cx-120, 1250, cx+120, 1345], radius=45, fill=W)
    # compression arrows on both sides
    for x in (cx-430, cx+430):
        d.rounded_rectangle([x-20, 930, x+20, 1110], radius=20, fill=W)
        d.polygon([(x-64, 1100), (x+64, 1100), (x, 1200)], fill=W)
    return im.crop(im.getbbox())

art = pictogram()
from PIL import ImageFilter, ImageChops
TOP = (34, 86, 214); MID = (19, 50, 140); DEEP = (9, 22, 58)
FX = 'tools/fonts/jakarta-XB.ttf'; FM = 'tools/fonts/jakarta-M.ttf'

def gradient(w, h):
    """Diagonal royal-to-midnight blue with a soft light from the top-left."""
    import math
    g = Image.new('RGB', (w, h)); px = g.load()
    for y in range(h):
        for x in range(w):
            t = (x / max(1, w - 1) * 0.45 + y / max(1, h - 1) * 0.55)
            if t < 0.5: a, b, u = TOP, MID, t / 0.5
            else: a, b, u = MID, DEEP, (t - 0.5) / 0.5
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3))
    g = g.convert('RGBA')
    glow = Image.new('L', (w, h), 0); ImageDraw.Draw(glow).ellipse([-w*0.35, -h*0.55, w*0.85, h*0.45], fill=28)
    glow = glow.filter(ImageFilter.GaussianBlur(min(w, h) * 0.12))
    g.alpha_composite(Image.merge('RGBA', (Image.new('L', (w, h), 255),) * 3 + (glow,)))
    return g

def seal(n):
    """Small white seal with a blue tick: the 'audit' mark."""
    s = Image.new('RGBA', (n, n), CUT); d = ImageDraw.Draw(s)
    d.ellipse([0, 0, n-1, n-1], fill=W)
    w = max(2, int(n*0.13)); pts = [(n*0.28, n*0.52), (n*0.44, n*0.68), (n*0.73, n*0.36)]
    d.line(pts, fill=MID+(255,), width=w, joint='curve')
    for c in (pts[0], pts[2]): d.ellipse([c[0]-w/2, c[1]-w/2, c[0]+w/2, c[1]+w/2], fill=MID+(255,))
    return s

def mark(n, frac, with_seal=True):
    """Pictogram (+ seal) with a soft shadow, on a transparent n x n canvas."""
    c = Image.new('RGBA', (n, n), CUT); sc = frac*n/max(art.size)
    a = art.resize((max(1, int(art.size[0]*sc)), max(1, int(art.size[1]*sc))), Image.LANCZOS)
    x, y = (n-a.size[0])//2, (n-a.size[1])//2 - int(n*0.02)
    sh = Image.new('RGBA', (n, n), CUT); sh.paste((4, 12, 40, 110), (x, y + int(n*0.018)), a)
    sh = sh.filter(ImageFilter.GaussianBlur(n*0.018))
    c.alpha_composite(sh); c.alpha_composite(a, (x, y))
    if with_seal:
        sz = int(n*frac*0.30); s = seal(sz)
        sx, sy = int(n*0.5 + frac*n*0.30), int(n*0.5 - frac*n*0.46)
        ss = Image.new('RGBA', (n, n), CUT); ss.paste((4, 12, 40, 120), (sx, sy + int(n*0.012)), s)
        c.alpha_composite(ss.filter(ImageFilter.GaussianBlur(n*0.012))); c.alpha_composite(s, (sx, sy))
    return c

def tile(n, frac, shape='square'):
    t = gradient(n, n); t.alpha_composite(mark(n, frac))
    if shape == 'full': return t
    m = Image.new('L', (n, n), 0); d = ImageDraw.Draw(m)
    if shape == 'round': d.ellipse([0, 0, n-1, n-1], fill=255)
    else: d.rounded_rectangle([0, 0, n-1, n-1], radius=int(n*0.225), fill=255)
    out = Image.new('RGBA', (n, n), CUT); out.paste(t, (0, 0), m); return out

R = 'android-res'
for k, m in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
    os.makedirs(f'{R}/mipmap-{k}', exist_ok=True)
    n = int(108*m)
    mark(n, 0.50).save(f'{R}/mipmap-{k}/ic_launcher_foreground.png')
    gradient(n, n).convert('RGB').save(f'{R}/mipmap-{k}/ic_launcher_background.png')
    n = int(48*m)
    tile(n*4, 0.62).resize((n, n), Image.LANCZOS).save(f'{R}/mipmap-{k}/ic_launcher.png')
    tile(n*4, 0.56, 'round').resize((n, n), Image.LANCZOS).save(f'{R}/mipmap-{k}/ic_launcher_round.png')

# launch screens (sizes match Capacitor's template)
SPL = {'drawable': (480, 320), 'drawable-land-hdpi': (800, 480), 'drawable-land-mdpi': (480, 320), 'drawable-land-xhdpi': (1280, 720),
       'drawable-land-xxhdpi': (1600, 960), 'drawable-land-xxxhdpi': (1920, 1280), 'drawable-port-hdpi': (480, 800), 'drawable-port-mdpi': (320, 480),
       'drawable-port-xhdpi': (720, 1280), 'drawable-port-xxhdpi': (960, 1600), 'drawable-port-xxxhdpi': (1280, 1920)}
for folder, (w, h) in SPL.items():
    u = min(w, h); im = gradient(w, h); d = ImageDraw.Draw(im)
    isz = int(u*0.30); top = int(h*0.5 - isz*0.95)
    ic = tile(isz*2, 0.62).resize((isz, isz), Image.LANCZOS)
    sh = Image.new('RGBA', (w, h), CUT); sh.paste((2, 8, 30, 140), ((w-isz)//2, top + int(u*0.02)), ic)
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(u*0.03))); im.alpha_composite(ic, ((w-isz)//2, top))
    d.text((w/2, top+isz+int(u*0.07)), 'Audit Code Blue', font=ImageFont.truetype(FX, int(u*0.082)), fill=(255, 255, 255), anchor='mt')
    d.text((w/2, top+isz+int(u*0.175)), 'CODE BLUE QUALITY AUDIT', font=ImageFont.truetype(FM, int(u*0.032)), fill=(176, 198, 255), anchor='mt')
    d.text((w/2, h-int(u*0.17)), 'Developed by', font=ImageFont.truetype(FM, int(u*0.036)), fill=(150, 172, 230), anchor='mt')
    d.text((w/2, h-int(u*0.115)), 'Dr. Kiran Rajagopal', font=ImageFont.truetype(FX, int(u*0.048)), fill=(255, 255, 255), anchor='mt')
    os.makedirs(f'{R}/{folder}', exist_ok=True); im.convert('RGB').save(f'{R}/{folder}/splash.png')

tile(1024, 0.62, 'full').convert('RGB').save('assets/icon-only.png')
# web / iPhone icons (iOS rounds the corners itself, so these are full-bleed and opaque)
os.makedirs('www/icons', exist_ok=True)
for name, n, frac in (('apple-touch-icon.png', 180, 0.62), ('icon-192.png', 192, 0.62), ('icon-512.png', 512, 0.62), ('icon-maskable-512.png', 512, 0.50)):
    tile(n*2, frac, 'full').resize((n, n), Image.LANCZOS).convert('RGB').save('www/icons/' + name)
print('icons + splash written')
