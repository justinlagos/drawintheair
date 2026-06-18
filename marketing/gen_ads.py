#!/usr/bin/env python3
# Draw in the Air — Phase 2 static ad generator
# 3 concepts x 2 formats (1:1 1080, 9:16 1080x1920) = 6 PNGs
import base64, os, cairosvg

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, "ads")
os.makedirs(OUT, exist_ok=True)

LAV="#8A66F0"; LAV2="#6E48D6"; MINT="#3FB87F"; SKY="#5A99F2"; SUN="#F0AC1F"
PEACH="#F07A5C"; CREAM="#FFFDF7"; INK="#1F1B2E"; MUTE="#5C5870"
LOGO = os.path.join(REPO, "public", "logo.png")
logo_b64 = base64.b64encode(open(LOGO,"rb").read()).decode()

def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def logo_tag(x,y,w):
    h = w*827/1200
    return f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/png;base64,{logo_b64}"/>'

def bg(W,H):
    return f'''<rect width="{W}" height="{H}" fill="{CREAM}"/>
<defs>
 <radialGradient id="orb" cx="22%" cy="8%" r="60%">
   <stop offset="0%" stop-color="{SKY}" stop-opacity="0.18"/>
   <stop offset="100%" stop-color="{SKY}" stop-opacity="0"/>
 </radialGradient>
 <radialGradient id="orb2" cx="92%" cy="6%" r="55%">
   <stop offset="0%" stop-color="{SUN}" stop-opacity="0.20"/>
   <stop offset="100%" stop-color="{SUN}" stop-opacity="0"/>
 </radialGradient>
 <linearGradient id="trail" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0%" stop-color="{LAV}"/>
   <stop offset="100%" stop-color="{SKY}"/>
 </linearGradient>
 <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
   <feGaussianBlur stdDeviation="16"/>
 </filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#orb)"/>
<rect width="{W}" height="{H}" fill="url(#orb2)"/>'''

def pill(cx,y,text,w,fill=LAV,fg="#FFFFFF",fs=40):
    h=fs*1.9
    x=cx-w/2
    return f'''<rect x="{x}" y="{y}" rx="{h/2}" width="{w}" height="{h}" fill="{fill}"/>
<text x="{cx}" y="{y+h/2}" font-family="OutfitX" font-size="{fs}" fill="{fg}" text-anchor="middle" dominant-baseline="central">{esc(text)}</text>'''

# Concept 1: The air-letter — disciplined vertical zones, no collisions
def air_letter(W,H):
    cx=W/2
    head_y = 175 if W==H else 230          # eyebrow pill top
    # A glyph band
    if W==H:
        top=330; bottom=600; half=140
    else:
        top=470; bottom=900; half=175
    apex=(cx, top); left=(cx-half, bottom); right=(cx+half, bottom)
    bar_y = top + (bottom-top)*0.60
    bar_half = half*0.66
    def Apath(wid):
        return (f'<path d="M {apex[0]} {apex[1]} L {left[0]} {left[1]}" stroke="url(#trail)" stroke-width="{wid}" stroke-linecap="round" fill="none"/>'
                f'<path d="M {apex[0]} {apex[1]} L {right[0]} {right[1]}" stroke="url(#trail)" stroke-width="{wid}" stroke-linecap="round" fill="none"/>'
                f'<path d="M {cx-bar_half} {bar_y} L {cx+bar_half} {bar_y}" stroke="url(#trail)" stroke-width="{wid*0.85}" stroke-linecap="round" fill="none"/>')
    glow=f'<g filter="url(#soft)" opacity="0.5">{Apath(46)}</g>'
    strokes=Apath(30)
    star=f'<g transform="translate({right[0]+44},{apex[1]+6})" fill="{SUN}"><path d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z"/></g>'
    dot=f'<circle cx="{apex[0]}" cy="{apex[1]}" r="18" fill="#FFFFFF" stroke="{LAV}" stroke-width="7"/>'
    head_pill=pill(cx, head_y, "Active screen time", 430, fill=LAV, fg="#FFFFFF", fs=32)
    if W==H:
        h1y=bottom+120
        h1=(f'<text x="{cx}" y="{h1y}" font-family="OutfitX" font-size="70" fill="{INK}" text-anchor="middle">Screen time that</text>'
            f'<text x="{cx}" y="{h1y+80}" font-family="OutfitX" font-size="70" fill="{INK}" text-anchor="middle">gets them <tspan fill="{LAV}">moving.</tspan></text>')
        suby=h1y+150; cta_y=H-130
    else:
        h1y=bottom+150
        h1=(f'<text x="{cx}" y="{h1y}" font-family="OutfitX" font-size="88" fill="{INK}" text-anchor="middle">Screen time</text>'
            f'<text x="{cx}" y="{h1y+98}" font-family="OutfitX" font-size="88" fill="{INK}" text-anchor="middle">that gets them</text>'
            f'<text x="{cx}" y="{h1y+196}" font-family="OutfitX" font-size="88" fill="{LAV}" text-anchor="middle">moving.</text>')
        suby=h1y+280; cta_y=H-210
    sub=f'<text x="{cx}" y="{suby}" font-family="NunitoB" font-size="38" fill="{MUTE}" text-anchor="middle">7 days free. No card today.</text>'
    cta=pill(cx, cta_y, "Try it now  >", 340, fill=LAV, fg="#FFFFFF", fs=40)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
{bg(W,H)}
{logo_tag(64,64,180)}
{head_pill}
{glow}{strokes}{dot}{star}
{h1}{sub}{cta}
</svg>'''

# Concept 10: Try it right now (browser frame)
def try_now(W,H):
    cx=W/2
    if W==H:
        bw=W-200; bh=bw*0.52; by=250
    else:
        bw=W-180; bh=bw*0.56; by=430
    bx=(W-bw)/2
    frame=f'''<g>
      <rect x="{bx}" y="{by}" rx="28" width="{bw}" height="{bh}" fill="#FFFFFF" stroke="rgba(31,27,46,0.10)" stroke-width="2"/>
      <rect x="{bx}" y="{by}" rx="28" width="{bw}" height="64" fill="#F4EFFF"/>
      <circle cx="{bx+32}" cy="{by+32}" r="8" fill="{PEACH}"/>
      <circle cx="{bx+58}" cy="{by+32}" r="8" fill="{SUN}"/>
      <circle cx="{bx+84}" cy="{by+32}" r="8" fill="{MINT}"/>
      <rect x="{bx+120}" y="{by+18}" rx="13" width="{bw-180}" height="28" fill="#FFFFFF" stroke="rgba(31,27,46,0.08)"/>
      <text x="{bx+140}" y="{by+37}" font-family="NunitoS" font-size="22" fill="{MUTE}">drawintheair.com/play</text>'''
    iy=by+64
    ih=bh-64
    trail=f'''<path d="M {bx+70} {iy+ih*0.70} C {bx+bw*0.30} {iy+ih*0.20}, {bx+bw*0.58} {iy+ih*0.85}, {bx+bw-100} {iy+ih*0.32}"
        stroke="url(#trail)" stroke-width="22" stroke-linecap="round" fill="none"/>
      <g filter="url(#soft)" opacity="0.4"><path d="M {bx+70} {iy+ih*0.70} C {bx+bw*0.30} {iy+ih*0.20}, {bx+bw*0.58} {iy+ih*0.85}, {bx+bw-100} {iy+ih*0.32}" stroke="url(#trail)" stroke-width="34" stroke-linecap="round" fill="none"/></g>
      <circle cx="{bx+bw-100}" cy="{iy+ih*0.32}" r="17" fill="#FFFFFF" stroke="{LAV}" stroke-width="7"/>
      <g transform="translate({bx+bw-100+30},{iy+ih*0.32-22})" fill="{SUN}"><path d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z"/></g>'''
    frame+=trail+"</g>"
    if W==H:
        h1y=by+bh+120
        h1=(f'<text x="{cx}" y="{h1y}" font-family="OutfitX" font-size="80" fill="{INK}" text-anchor="middle">Try it</text>'
            f'<text x="{cx}" y="{h1y+86}" font-family="OutfitX" font-size="80" fill="{LAV}" text-anchor="middle">right now.</text>')
        suby=h1y+158
        sub=f'<text x="{cx}" y="{suby}" font-family="NunitoB" font-size="38" fill="{MUTE}" text-anchor="middle">No sign-up. Just your browser.</text>'
        cta_y=H-120
    else:
        h1y=by+bh+170
        h1=(f'<text x="{cx}" y="{h1y}" font-family="OutfitX" font-size="100" fill="{INK}" text-anchor="middle">Try it</text>'
            f'<text x="{cx}" y="{h1y+112}" font-family="OutfitX" font-size="100" fill="{LAV}" text-anchor="middle">right now.</text>')
        suby=h1y+200
        sub=f'<text x="{cx}" y="{suby}" font-family="NunitoB" font-size="42" fill="{MUTE}" text-anchor="middle">No sign-up. Just your browser.</text>'
        cta_y=H-230
    cta=pill(cx, cta_y, "Open Free Paint  >", 470, fill=MINT, fg="#FFFFFF", fs=40)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
{bg(W,H)}
{logo_tag(64,64,180)}
{frame}
{h1}{sub}{cta}
</svg>'''

# Concept 6: Offer card — stacked big number, clean feature line
def offer(W,H):
    cx=W/2
    if W==H:
        ey=150; n1=380; n2=540; bigfs=158; s1y=648; s2y=712; featy=800; cta_y=H-120
    else:
        ey=300; n1=560; n2=740; bigfs=190; s1y=870; s2y=944; featy=1060; cta_y=H-230
    eyebrow=pill(cx, ey, "Family plan", 300, fill="#F4EFFF", fg=LAV2, fs=32)
    big=(f'<text x="{cx}" y="{n1}" font-family="OutfitX" font-size="{bigfs}" fill="{INK}" text-anchor="middle">7 days</text>'
         f'<text x="{cx}" y="{n2}" font-family="OutfitX" font-size="{bigfs}" fill="{SUN}" text-anchor="middle">free</text>')
    s1=f'<text x="{cx}" y="{s1y}" font-family="OutfitX" font-size="52" fill="{INK}" text-anchor="middle">Then $4.99/month.</text>'
    s2=f'<text x="{cx}" y="{s2y}" font-family="NunitoB" font-size="38" fill="{MUTE}" text-anchor="middle">No card today. Cancel anytime.</text>'
    feat=f'<text x="{cx}" y="{featy}" font-family="NunitoB" font-size="32" fill="{LAV2}" text-anchor="middle">Up to 2 children   ·   On-device camera   ·   Any browser</text>'
    cta=pill(cx, cta_y, "Get the offer  >", 400, fill=LAV, fg="#FFFFFF", fs=40)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
{bg(W,H)}
{logo_tag(64,64,180)}
{eyebrow}{big}{s1}{s2}{feat}{cta}
</svg>'''

jobs=[("01_air-letter",air_letter),("10_try-now",try_now),("06_offer",offer)]
sizes=[("1x1",1080,1080),("9x16",1080,1920)]
for nm,fn in jobs:
    for sn,W,H in sizes:
        svg=fn(W,H)
        out=f"{OUT}/DITA_{nm}_{sn}.png"
        cairosvg.svg2png(bytestring=svg.encode(), write_to=out, output_width=W, output_height=H)
        print("rendered", out, os.path.getsize(out))
print("DONE")
