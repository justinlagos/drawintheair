#!/usr/bin/env python3
"""Overlay brand copy + logo onto the on-brand AI stills to make finished static ads.
Visual Triangle photography stays the hero; text sits in the safe area with a soft scrim."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(__file__)
F = "/sessions/charming-serene-lamport/.fonts/"
OUTFIT = lambda s: ImageFont.truetype(F + "Outfit-X.ttf", s)      # display bold
NUN    = lambda s: ImageFont.truetype(F + "Nunito-B.ttf", s)      # body bold
NUNS   = lambda s: ImageFont.truetype(F + "Nunito-S.ttf", s)      # body regular

INK = (31, 27, 46); CREAM = (255, 253, 247); WHITE = (255, 255, 255)
LAV = (138, 102, 240); MINT = (63, 184, 127); SUN = (240, 172, 31)
LOGO = "/sessions/charming-serene-lamport/mnt/drawintheair-main/public/logo.png"

def fit(d, txt, font_fn, maxw, start):
    s = start
    while s > 20:
        f = font_fn(s)
        if d.textlength(txt, font=f) <= maxw: return f
        s -= 2
    return font_fn(20)

def wrap(d, txt, f, maxw):
    words = txt.split(); lines=[]; cur=""
    for w in words:
        t=(cur+" "+w).strip()
        if d.textlength(t, font=f) <= maxw: cur=t
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    return lines

def scrim(img, top_frac, strength=210):
    """Soft dark gradient at the bottom for legibility."""
    W,H = img.size
    grad = Image.new("L",(1,H),0)
    for y in range(H):
        fy = (y/H - top_frac)/(1-top_frac)
        grad.putpixel((0,y), 0 if fy<0 else int(strength*min(1,fy)**1.3))
    grad = grad.resize((W,H))
    black = Image.new("RGB",(W,H),INK)
    img.paste(black, (0,0), grad)
    return img

def pill(d, xy, text, font, fill, fg=WHITE, pad=(26,12)):
    w = d.textlength(text, font=font); h = font.size
    x,y = xy
    d.rounded_rectangle([x,y,x+w+pad[0]*2,y+h+pad[1]*2], radius=(h+pad[1]*2)//2, fill=fill)
    d.text((x+pad[0], y+pad[1]-2), text, font=font, fill=fg)
    return h+pad[1]*2

def add_logo(img, cx, y, h=46):
    try:
        lg = Image.open(LOGO).convert("RGBA")
        r = h/lg.height; lg = lg.resize((int(lg.width*r), h))
        # white version for dark scrim
        img.paste(lg, (int(cx-lg.width/2), y), lg)
    except Exception as e:
        print("logo skip", e)

def build(src, out, headline, sub=None, offer=None, eyebrow=None, accent=LAV):
    img = Image.open(src).convert("RGB")
    W,H = img.size
    img = scrim(img, 0.46, 225)
    d = ImageDraw.Draw(img)
    M = int(W*0.07); maxw = W-2*M
    # headline near lower third
    hf = fit(d, max(headline.split("\n"), key=len), OUTFIT, maxw, int(W*0.115))
    lines = []
    for para in headline.split("\n"): lines += wrap(d, para, hf, maxw)
    lh = int(hf.size*1.12)
    block_h = lh*len(lines) + (70 if sub else 0) + (64 if offer else 0)
    y = H - int(H*0.085) - block_h
    if eyebrow:
        ef = NUN(int(W*0.04))
        pill(d, (M, y-int(W*0.12)), eyebrow, ef, accent)
    for ln in lines:
        d.text((M, y), ln, font=hf, fill=WHITE); y += lh
    if sub:
        y += 12
        sf = NUNS(int(W*0.044))
        for ln in wrap(d, sub, sf, maxw):
            d.text((M, y), ln, font=sf, fill=(238,236,248)); y += int(sf.size*1.3)
    if offer:
        y += 16
        ofnt = NUN(int(W*0.04))
        pill(d, (M, y), offer, ofnt, WHITE, fg=INK)
    add_logo(img, W//2, H-int(H*0.05), h=int(H*0.028))
    img.save(out, quality=92)
    print("wrote", out, img.size)

# ---- finished ads ----
build("v2_hero_9x16_A.png", "AD_hero_air_9x16.png",
      "Screen time that\ngets them moving.",
      sub="Children 3–7 trace letters in the air through your webcam. No app. No headset.",
      offer="7 days free · no card today", eyebrow="Active screen time", accent=LAV)

build("v2_hero_9x16_B.png", "AD_hero_room_9x16.png",
      "They learn it\nby moving.",
      sub="Every letter is drawn with their whole arm. The camera never leaves your device.",
      offer="Try Free Paint free · no sign-up", eyebrow="Made by a parent", accent=MINT)

build("v2_parent_9x16.png", "AD_parent_9x16.png",
      "Screen time you\nfeel good about.",
      sub="You stay close. They stand up and move. The learning happens through play.",
      offer="7 days free · up to 2 children", eyebrow="For parents", accent=SUN)

# square crops (centre) for feed
for s,o in [("AD_hero_air_9x16.png","AD_hero_air_1x1.png"),
            ("AD_parent_9x16.png","AD_parent_1x1.png")]:
    im = Image.open(s); W,H = im.size; side=W
    im.crop((0,(H-side)//2,W,(H-side)//2+side)).save(o, quality=92); print("wrote", o)
