#!/usr/bin/env python3
"""
Draw in the Air - Brand PDF Generator ("Calm" design system)

Regenerates all downloadable classroom resources into public/classroom-guides/:
  - 10 teacher guide PDFs (01-...pdf to 10-...pdf)
  - 26 letter tracing sheets (letter-a.pdf .. letter-z.pdf)
  - az-letter-tracing-workbook.pdf (cover + 26 letter pages)

Usage:
  pip install reportlab
  python3 scripts/generate-brand-pdfs.py

Design system "Calm":
  Lavender #8A66F0 (primary), Mint #3FB87F, Sky #5A99F2, Sun #F0AC1F,
  Peach #F07A5C, Cream #FFFDF7 (panels / page tint), Ink #1F1B2E (text).
  Rounded cream panels with thin lavender borders, generous margins,
  Helvetica family. No em dashes anywhere in copy.
"""

import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

# ---------------------------------------------------------------- paths

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "public", "classroom-guides")
LOGO_PATH = os.path.join(ROOT, "public", "logo.png")

# ---------------------------------------------------------------- palette

LAVENDER = HexColor("#8A66F0")
MINT = HexColor("#3FB87F")
SKY = HexColor("#5A99F2")
SUN = HexColor("#F0AC1F")
PEACH = HexColor("#F07A5C")
CREAM = HexColor("#FFFDF7")
INK = HexColor("#1F1B2E")

LAVENDER_SOFT = Color(138 / 255, 102 / 255, 240 / 255, alpha=0.16)
INK_SOFT = Color(31 / 255, 27 / 255, 46 / 255, alpha=0.62)
TRACE_GREY = Color(0.5, 0.5, 0.5, alpha=0.20)  # 20% grey tracing glyphs
RULE_GREY = HexColor("#C9C4D8")

ACCENTS = [MINT, SKY, SUN, PEACH, LAVENDER]

PAGE_W, PAGE_H = A4
MARGIN = 48
FOOTER_TEXT = "drawintheair.com  ·  Free to share with colleagues"

F = "Helvetica"
FB = "Helvetica-Bold"
FO = "Helvetica-Oblique"

LOGO = ImageReader(LOGO_PATH) if os.path.exists(LOGO_PATH) else None
if LOGO:
    _lw, _lh = LOGO.getSize()
    LOGO_RATIO = _lw / _lh
else:
    LOGO_RATIO = 1.45


# ---------------------------------------------------------------- helpers

def no_em(text):
    """Brand copy rule: absolutely no em dashes in output."""
    return text.replace("—", ",").replace("–", "-")


def wrap_text(text, font, size, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def draw_page_background(c):
    """Very light cream tint over the whole page."""
    c.setFillColor(Color(255 / 255, 253 / 255, 247 / 255, alpha=1))
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)


def draw_logo(c, x, y, h):
    """Logo top-left; falls back to a wordmark with a small star."""
    if LOGO:
        w = h * LOGO_RATIO
        c.drawImage(LOGO, x, y, width=w, height=h, mask="auto")
        return w
    # Fallback wordmark
    c.setFillColor(LAVENDER)
    c.setFont(FB, h * 0.55)
    c.drawString(x + h * 0.7, y + h * 0.25, "Draw in the Air")
    draw_star(c, x + h * 0.3, y + h * 0.5, h * 0.28, SUN)
    return h * 0.7 + stringWidth("Draw in the Air", FB, h * 0.55)


def draw_star(c, cx, cy, r, color):
    """Simple hand-drawn-style 4-point sparkle star."""
    c.saveState()
    c.setFillColor(color)
    p = c.beginPath()
    p.moveTo(cx, cy + r)
    p.curveTo(cx + r * 0.12, cy + r * 0.25, cx + r * 0.25, cy + r * 0.12, cx + r, cy)
    p.curveTo(cx + r * 0.25, cy - r * 0.12, cx + r * 0.12, cy - r * 0.25, cx, cy - r)
    p.curveTo(cx - r * 0.12, cy - r * 0.25, cx - r * 0.25, cy - r * 0.12, cx - r, cy)
    p.curveTo(cx - r * 0.25, cy + r * 0.12, cx - r * 0.12, cy + r * 0.25, cx, cy + r)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.restoreState()


def draw_footer(c, page_label):
    c.setStrokeColor(LAVENDER_SOFT)
    c.setLineWidth(1)
    c.line(MARGIN, 40, PAGE_W - MARGIN, 40)
    c.setFillColor(INK_SOFT)
    c.setFont(F, 8)
    c.drawString(MARGIN, 28, FOOTER_TEXT)
    c.drawRightString(PAGE_W - MARGIN, 28, page_label)


def draw_pill(c, x, y, text, fill, text_color, size=7.5):
    """Small rounded tag pill. Returns pill width."""
    pad = 8
    w = stringWidth(text, FB, size) + pad * 2
    h = size + 9
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, h / 2, stroke=0, fill=1)
    c.setFillColor(text_color)
    c.setFont(FB, size)
    c.drawString(x + pad, y + (h - size) / 2 + 1, text)
    return w


def draw_guide_header(c, title, audience, guide_no):
    """Branded header band: cream rounded panel, logo, title, audience pill."""
    band_h = 96
    top = PAGE_H - 30
    c.setFillColor(CREAM)
    c.setStrokeColor(LAVENDER_SOFT)
    c.setLineWidth(1.2)
    c.roundRect(MARGIN - 14, top - band_h, PAGE_W - 2 * (MARGIN - 14), band_h, 14, stroke=1, fill=1)

    logo_h = 30
    draw_logo(c, MARGIN, top - 14 - logo_h, logo_h)

    c.setFillColor(LAVENDER)
    c.setFont(FB, 19)
    title_y = top - 64
    c.drawString(MARGIN, title_y, title)

    pill_y = top - 88
    x = MARGIN
    x += draw_pill(c, x, pill_y, audience, LAVENDER, CREAM) + 6
    draw_pill(c, x, pill_y, "Guide %d of 10" % guide_no, Color(1, 1, 1, 0), LAVENDER)
    draw_star(c, PAGE_W - MARGIN - 16, top - 26, 9, SUN)
    return top - band_h - 18  # content start y


# ---------------------------------------------------------------- guide flow engine
# Block types:
#   ("intro", text)                 lead paragraph under the header
#   ("h2", text)                    lavender section heading
#   ("h3", text)                    smaller ink bold heading
#   ("body", text)                  body paragraph
#   ("bullets", [items])            bullet list
#   ("step", n, title, text)        numbered step with circle badge
#   ("panel", tag, accent, [lines]) soft cream callout panel
#   ("card", accent, title, sub, text)  mode/day/activity card
#   ("table", [rows], [col widths]) simple table, first row = header
#   ("kv", [(label, text)])        bold label rows (FAQ / troubleshooting)
#   ("grid_letters",)               letter mastery tracking grid
#   ("spacer", pts)

class GuideRenderer:
    def __init__(self, c, title, audience, guide_no):
        self.c = c
        self.title = title
        self.audience = audience
        self.no = guide_no
        self.page = 0
        self.y = 0
        self.new_page()

    def new_page(self):
        if self.page > 0:
            draw_footer(self.c, "Guide %d of 10  ·  Page %d" % (self.no, self.page))
            self.c.showPage()
        self.page += 1
        draw_page_background(self.c)
        if self.page == 1:
            self.y = draw_guide_header(self.c, self.title, self.audience, self.no)
        else:
            top = PAGE_H - 40
            draw_logo(self.c, MARGIN, top - 22, 22)
            self.c.setFillColor(LAVENDER)
            self.c.setFont(FB, 12)
            self.c.drawRightString(PAGE_W - MARGIN, top - 16, self.title + "  (continued)")
            self.c.setStrokeColor(LAVENDER_SOFT)
            self.c.line(MARGIN, top - 32, PAGE_W - MARGIN, top - 32)
            self.y = top - 52

    def need(self, h):
        if self.y - h < 58:
            self.new_page()

    def finish(self):
        draw_footer(self.c, "Guide %d of 10  ·  Page %d" % (self.no, self.page))
        self.c.showPage()

    # -- block renderers ------------------------------------------------

    def intro(self, text):
        text = no_em(text)
        w = PAGE_W - 2 * MARGIN
        lines = wrap_text(text, F, 10, w)
        self.need(len(lines) * 14 + 8)
        self.c.setFillColor(INK)
        self.c.setFont(F, 10)
        for ln in lines:
            self.c.drawString(MARGIN, self.y, ln)
            self.y -= 14
        self.y -= 6

    def h2(self, text):
        self.need(40)
        self.y -= 10
        self.c.setFillColor(LAVENDER)
        self.c.setFont(FB, 14)
        self.c.drawString(MARGIN, self.y, no_em(text))
        self.c.setStrokeColor(LAVENDER_SOFT)
        self.c.setLineWidth(2)
        tw = stringWidth(no_em(text), FB, 14)
        self.c.line(MARGIN, self.y - 6, MARGIN + tw, self.y - 6)
        self.y -= 24

    def h3(self, text):
        self.need(26)
        self.y -= 4
        self.c.setFillColor(INK)
        self.c.setFont(FB, 11)
        self.c.drawString(MARGIN, self.y, no_em(text))
        self.y -= 16

    def body(self, text):
        text = no_em(text)
        w = PAGE_W - 2 * MARGIN
        lines = wrap_text(text, F, 9.5, w)
        self.need(len(lines) * 13 + 4)
        self.c.setFillColor(INK)
        self.c.setFont(F, 9.5)
        for ln in lines:
            self.c.drawString(MARGIN, self.y, ln)
            self.y -= 13
        self.y -= 4

    def bullets(self, items):
        w = PAGE_W - 2 * MARGIN - 16
        for it in items:
            it = no_em(it)
            lines = wrap_text(it, F, 9.5, w)
            self.need(len(lines) * 13 + 3)
            self.c.setFillColor(LAVENDER)
            self.c.circle(MARGIN + 4, self.y + 3, 1.8, stroke=0, fill=1)
            self.c.setFillColor(INK)
            self.c.setFont(F, 9.5)
            yy = self.y
            for ln in lines:
                self.c.drawString(MARGIN + 14, yy, ln)
                yy -= 13
            self.y = yy - 3
        self.y -= 4

    def step(self, n, title, text):
        title, text = no_em(title), no_em(text)
        w = PAGE_W - 2 * MARGIN - 40
        lines = wrap_text(text, F, 9.5, w)
        h = 18 + len(lines) * 13
        self.need(h + 8)
        accent = ACCENTS[(n - 1) % len(ACCENTS)]
        cy = self.y - 2
        self.c.setFillColor(accent)
        self.c.circle(MARGIN + 11, cy, 11, stroke=0, fill=1)
        self.c.setFillColor(CREAM)
        self.c.setFont(FB, 11)
        self.c.drawCentredString(MARGIN + 11, cy - 4, str(n))
        self.c.setFillColor(INK)
        self.c.setFont(FB, 10.5)
        self.c.drawString(MARGIN + 32, self.y, title)
        self.y -= 15
        self.c.setFont(F, 9.5)
        for ln in lines:
            self.c.drawString(MARGIN + 32, self.y, ln)
            self.y -= 13
        self.y -= 8

    def panel(self, tag, accent, paragraphs):
        w = PAGE_W - 2 * MARGIN
        inner = w - 32
        all_lines = []
        for p in paragraphs:
            all_lines.extend(wrap_text(no_em(p), F, 9, inner))
        h = 34 + len(all_lines) * 12.5
        self.need(h + 8)
        top = self.y
        self.c.setFillColor(CREAM)
        self.c.setStrokeColor(LAVENDER_SOFT)
        self.c.setLineWidth(1.2)
        self.c.roundRect(MARGIN, top - h, w, h, 10, stroke=1, fill=1)
        # accent stripe
        self.c.setFillColor(accent)
        self.c.roundRect(MARGIN, top - h, 4, h, 2, stroke=0, fill=1)
        self.c.setFillColor(accent)
        self.c.setFont(FB, 8)
        self.c.drawString(MARGIN + 16, top - 16, tag.upper())
        self.c.setFillColor(INK)
        self.c.setFont(F, 9)
        yy = top - 30
        for ln in all_lines:
            self.c.drawString(MARGIN + 16, yy, ln)
            yy -= 12.5
        self.y = top - h - 12

    def card(self, accent, title, sub, text):
        w = PAGE_W - 2 * MARGIN
        inner = w - 32
        lines = wrap_text(no_em(text), F, 9, inner)
        h = 40 + len(lines) * 12.5
        self.need(h + 8)
        top = self.y
        self.c.setFillColor(CREAM)
        self.c.setStrokeColor(LAVENDER_SOFT)
        self.c.setLineWidth(1.2)
        self.c.roundRect(MARGIN, top - h, w, h, 10, stroke=1, fill=1)
        self.c.setFillColor(accent)
        self.c.roundRect(MARGIN, top - h, 4, h, 2, stroke=0, fill=1)
        self.c.setFillColor(INK)
        self.c.setFont(FB, 10.5)
        self.c.drawString(MARGIN + 16, top - 17, no_em(title))
        if sub:
            tw = stringWidth(no_em(title), FB, 10.5)
            draw_pill(self.c, MARGIN + 16 + tw + 8, top - 21, no_em(sub), accent, CREAM, 6.5)
        self.c.setFillColor(INK)
        self.c.setFont(F, 9)
        yy = top - 34
        for ln in lines:
            self.c.drawString(MARGIN + 16, yy, ln)
            yy -= 12.5
        self.y = top - h - 10

    def table(self, rows, widths):
        w = PAGE_W - 2 * MARGIN
        total = sum(widths)
        widths = [wd / total * w for wd in widths]
        for ri, row in enumerate(rows):
            cells = [wrap_text(no_em(cell), FB if ri == 0 else F, 8, widths[ci] - 12)
                     for ci, cell in enumerate(row)]
            row_h = max(len(cl) for cl in cells) * 11 + 9
            self.need(row_h + 2)
            top = self.y
            if ri == 0:
                self.c.setFillColor(LAVENDER)
                self.c.roundRect(MARGIN, top - row_h, w, row_h, 5, stroke=0, fill=1)
                self.c.setFillColor(CREAM)
            else:
                if ri % 2 == 1:
                    self.c.setFillColor(Color(138 / 255, 102 / 255, 240 / 255, alpha=0.05))
                    self.c.rect(MARGIN, top - row_h, w, row_h, stroke=0, fill=1)
                self.c.setFillColor(INK)
            self.c.setFont(FB if ri == 0 else F, 8)
            x = MARGIN
            for ci, cl in enumerate(cells):
                yy = top - 12
                for ln in cl:
                    self.c.drawString(x + 6, yy, ln)
                    yy -= 11
                x += widths[ci]
            self.y = top - row_h
        self.y -= 12

    def kv(self, pairs):
        w = PAGE_W - 2 * MARGIN
        for label, text in pairs:
            label, text = no_em(label), no_em(text)
            lines = wrap_text(text, F, 9, w - 12)
            h = 16 + len(lines) * 12.5
            self.need(h + 4)
            self.c.setFillColor(INK)
            self.c.setFont(FB, 9.5)
            self.c.drawString(MARGIN, self.y, label)
            self.y -= 14
            self.c.setFont(F, 9)
            for ln in lines:
                self.c.drawString(MARGIN + 12, self.y, ln)
                self.y -= 12.5
            self.y -= 5
        self.y -= 2

    def grid_letters(self):
        """Letter mastery tracking grid: A-Z, three checkboxes each."""
        cols, size = 6, (PAGE_W - 2 * MARGIN) / 6
        letters = [chr(ord("A") + i) for i in range(26)]
        rows = [letters[i:i + cols] for i in range(0, 26, cols)]
        cell_h = 46
        self.body("Fill one circle as the child progresses: first circle = Not attempted, "
                  "second = Emerging, third = Secure.")
        for row in rows:
            self.need(cell_h + 4)
            top = self.y
            x = MARGIN
            for ch in row:
                self.c.setFillColor(CREAM)
                self.c.setStrokeColor(LAVENDER_SOFT)
                self.c.setLineWidth(1)
                self.c.roundRect(x + 2, top - cell_h, size - 4, cell_h - 2, 8, stroke=1, fill=1)
                self.c.setFillColor(LAVENDER)
                self.c.setFont(FB, 15)
                self.c.drawString(x + 12, top - 22, ch)
                for k in range(3):
                    self.c.setStrokeColor(RULE_GREY)
                    self.c.setFillColor(Color(1, 1, 1, 0))
                    self.c.circle(x + size - 48 + k * 16, top - 18, 5, stroke=1, fill=0)
                x += size
            self.y = top - cell_h - 4
        self.y -= 8

    def spacer(self, pts):
        self.y -= pts

    def render(self, blocks):
        dispatch = {
            "intro": self.intro, "h2": self.h2, "h3": self.h3, "body": self.body,
            "bullets": self.bullets, "step": self.step, "panel": self.panel,
            "card": self.card, "table": self.table, "kv": self.kv,
            "grid_letters": self.grid_letters, "spacer": self.spacer,
        }
        for blk in blocks:
            dispatch[blk[0]](*blk[1:])
        self.finish()


# ---------------------------------------------------------------- guide content
# Re-flowed from the original PDFs (extracted with pdfplumber).
# Copy rule: no em dashes. Sentences that were clipped in the original
# render have been completed without inventing new claims.

GUIDES = [
    # 01 -----------------------------------------------------------------
    dict(
        file="01-teacher-quick-start-guide.pdf",
        title="Teacher's Quick Start Guide",
        audience="FOR TEACHERS",
        blocks=[
            ("intro", "Everything you need to know in under 5 minutes."),
            ("h2", "What is Draw in the Air?"),
            ("body", "A free, browser-based tool that turns any webcam into an interactive learning surface. "
                     "Children draw letters, pop bubbles, sort objects, and play maths games, all using their finger in the air."),
            ("body", "No app. No download. No accounts. Just a URL."),
            ("h2", "Getting Started in 3 Steps"),
            ("step", 1, "Open your browser",
             "Go to drawintheair.com on any laptop, desktop, or Chromebook. Works on Chrome, Edge, Firefox, and Safari."),
            ("step", 2, "Allow camera access",
             "Click \"Allow\" when the browser asks. The video never leaves the device, it is processed locally. No data is ever uploaded."),
            ("step", 3, "Pick a mode and go",
             "Choose from Letter Tracing, Bubble Pop, Sort & Place, Number Tracing, Free Paint, and more. No configuration needed."),
            ("h2", "The Pinch Gesture: Teach This First"),
            ("body", "Every activity uses the same simple gesture. Spend 2 minutes teaching this before the session begins:"),
            ("table",
             [["Gesture", "What happens"],
              ["Open hand", "Hold hand open in front of the camera. The cursor pauses."],
              ["Point finger", "Raise the index finger. The cursor appears on screen."],
              ["Pinch", "Touch thumb to index finger. This starts drawing."],
              ["Release", "Open the hand or lower the finger. This stops drawing."]],
             [1, 3]),
            ("panel", "Teacher tip", SUN,
             ["Demonstrate the gesture yourself on the projector first. Children learn by watching, not reading. "
              "Once one child gets it, they become the expert who teaches the others."]),
            ("h2", "Activity Modes at a Glance"),
            ("table",
             [["Mode", "Ages", "Focus"],
              ["Bubble Pop", "3+", "Hand-eye coordination and brain breaks"],
              ["Letter Tracing", "4+", "A-Z with phonics sounds"],
              ["Number Tracing", "4+", "Numerals 1-10 with counting"],
              ["Sort & Place", "4+", "Categorisation and logical thinking"],
              ["Free Paint", "3+", "Open-ended creative expression"],
              ["Word Search", "5+", "Sight words and literacy"],
              ["Balloon Math", "5+", "Addition and number bonds"],
              ["Rainbow Bridge", "4+", "Colour mixing and creativity"],
              ["Gesture Spelling", "6+", "Spelling with hand signs"]],
             [1.4, 0.5, 2.4]),
        ],
    ),
    # 02 -----------------------------------------------------------------
    dict(
        file="02-five-day-movement-break-plan.pdf",
        title="5-Day Movement Break Plan",
        audience="FOR TEACHERS",
        blocks=[
            ("intro", "A ready-to-use weekly structure for classroom brain breaks."),
            ("body", "Research shows 5-minute movement breaks every 45-60 minutes improve focus by up to 20%. "
                     "This plan gives you one ready-to-run Draw in the Air activity per day. No prep, no setup, "
                     "just open the browser and go."),
            ("card", MINT, "Monday: Bubble Pop", "WAKE-UP MODE",
             "Start the week with energy. Tell children: \"We're waking up our brain with bubble popping!\" "
             "Set a 3-minute timer. Count how many bubbles the class can pop together. Record the class total "
             "on the board. No setup needed. Works on any device. 3-5 min ideal."),
            ("card", SKY, "Tuesday: Letter of the Week Tracing", "LITERACY FOCUS",
             "Choose the letter you're working on this week. Open the Letter Tracing mode and select that letter. "
             "Children trace it in the air 10 times each. Finish with: \"What does it sound like? Can you think of "
             "a word?\" Pairs with your phonics lesson and reinforces formation. 5 min."),
            ("card", SUN, "Wednesday: Sort & Place", "THINKING BREAK",
             "Mid-week brain engagement. Ask children to predict what categories will appear before the activity "
             "starts. After 3 rounds, discuss: \"What rule did you use to sort? Could there be a different rule?\" "
             "Builds reasoning and is a great discussion starter. 5-8 min."),
            ("card", PEACH, "Thursday: Balloon Math", "MATHS WARM-UP",
             "Choose a number bond or addition target matching your current maths unit. After each round, ask "
             "children to explain how they got the answer. This builds mathematical language. Linked to the maths "
             "curriculum and can be done as a class. 5-7 min."),
            ("card", LAVENDER, "Friday: Free Paint", "CELEBRATION MODE",
             "End the week with creative freedom. Give children 4 minutes to draw anything they like. At the end, "
             "ask 3-4 children to describe their creation to build vocabulary and confidence. No wrong answers, "
             "a real confidence builder. 4-5 min."),
            ("panel", "Share with parents", MINT,
             ["Post this plan on your classroom door or staff noticeboard. Parents love seeing a structured "
              "movement schedule. It shows the intentional pedagogy behind the activity."]),
        ],
    ),
    # 03 -----------------------------------------------------------------
    dict(
        file="03-fine-motor-skills-integration.pdf",
        title="Fine Motor Skills Integration Guide",
        audience="FOR TEACHERS",
        blocks=[
            ("intro", "Connecting gesture learning to pre-writing development."),
            ("body", "Fine motor development is the foundation of handwriting. Draw in the Air strengthens the exact "
                     "muscle groups children need for pencil grip, through play, not drilling."),
            ("panel", "The neuroscience (in plain English)", SKY,
             ["When children pinch their fingers to draw in the air, they activate the same neural pathways as "
              "holding a pencil. This builds the \"motor memory\" that makes handwriting feel natural, before the "
              "pencil is even picked up.",
              "Research: kinesthetic motor learning transfers to fine motor task performance (Tsai, 2009; Doherty, 2021)."]),
            ("h2", "Skills Developed by Activity"),
            ("table",
             [["Activity", "Primary Motor Skill", "Secondary Skills", "Ages"],
              ["Bubble Pop", "Index finger isolation", "Visual tracking, reaction speed", "3+"],
              ["Letter Tracing", "Pincer grip pattern", "Directional movement, letter formation", "4+"],
              ["Number Tracing", "Pincer grip + control", "Numeral direction, size awareness", "4+"],
              ["Free Paint", "Precision motor control", "Creative expression, colour sense", "3+"],
              ["Sort & Place", "Reach + pinch + release", "Spatial reasoning, categorisation", "4+"],
              ["Word Search", "Sustained fine motor", "Left-right eye tracking, letter ID", "5+"],
              ["Gesture Spelling", "Multi-finger patterns", "Symbol-letter mapping, sequence", "6+"]],
             [1.1, 1.3, 1.7, 0.4]),
            ("h2", "How to Sequence a Session"),
            ("step", 1, "Warm-up (2 min): Bubble Pop",
             "Activates the motor cortex and warms up finger muscles."),
            ("step", 2, "Core activity (8 min): Letter or Number Tracing",
             "Deliberate motor practice on the target skill."),
            ("step", 3, "Extension (3 min): Free Paint",
             "Reinforces motor memory through free exploration."),
            ("step", 4, "Reflection (2 min): Discussion",
             "Ask: Which letter was hardest? Why? This builds metacognition."),
            ("panel", "For SEND support", PEACH,
             ["Children who struggle with pencil grip benefit enormously from air drawing. The resistance-free "
              "environment removes anxiety about \"getting it wrong\", which is exactly the psychological safety "
              "needed to build confidence before pen-on-paper practice."]),
        ],
    ),
    # 04 -----------------------------------------------------------------
    dict(
        file="04-chromebook-classroom-setup.pdf",
        title="Chromebook Classroom Setup Guide",
        audience="FOR TEACHERS & IT",
        blocks=[
            ("intro", "Step-by-step configuration for school Chromebook carts and labs."),
            ("panel", "Fully compatible with school Chromebooks", MINT,
             ["No IT approval required in most networks. Runs entirely in the Chrome browser. "
              "No extensions, no downloads, no admin rights needed."]),
            ("h2", "First-Time Setup (Do Once)"),
            ("step", 1, "Open Chrome browser",
             "Type drawintheair.com in the address bar. Bookmark it for easy access next time."),
            ("step", 2, "Camera permission prompt",
             "A popup asks for camera access. Click \"Allow\". This is a one-time permission per browser profile."),
            ("step", 3, "If blocked by policy",
             "Ask your IT administrator to whitelist drawintheair.com for camera access. Provide them with our "
             "IT letter (see drawintheair.com/schools)."),
            ("step", 4, "Test with your device",
             "Click \"Start\" on the homepage. If you see a camera feed and can move the cursor with your finger, "
             "you're ready."),
            ("step", 5, "Create a classroom bookmark",
             "On your teacher device, right-click the bookmark bar and add drawintheair.com. On managed Chromebooks, "
             "IT can push this bookmark to all devices via the Admin Console."),
            ("h2", "Classroom Setup Patterns"),
            ("card", MINT, "Individual Devices", "1-TO-1 CART OR LAB",
             "Every student opens drawintheair.com on their own Chromebook. Ideal for independent practice. "
             "Students work at their own pace on the same activity. Teacher circulates."),
            ("card", SKY, "Teacher Demo + Student Follow", "PROJECTOR / IWB",
             "Teacher opens Draw in the Air on the classroom computer connected to the projector. Demonstrates "
             "each step, then students replicate on their individual devices."),
            ("card", SUN, "Station Rotation", "MIXED SETUP",
             "One station = 2-3 Chromebooks with Draw in the Air open. Students rotate through every 8-10 minutes. "
             "Use a timer on the board. Pair with a worksheet station for mixed-modality learning."),
            ("panel", "IT tip", SKY,
             ["On managed school Chromebooks, camera permissions may reset after a browser update. Create a quick "
              "laminated \"camera setup\" card for students: \"1. Go to drawintheair.com  2. Click Allow  3. Start!\" "
              "They'll be able to handle it independently."]),
            ("h2", "Quick Troubleshooting"),
            ("kv", [
                ("Camera not detected",
                 "Check Chrome settings, then Privacy and security, then Camera. Ensure drawintheair.com is in the \"Allow\" list."),
                ("Cursor won't move",
                 "Ensure good lighting. Avoid direct backlight (e.g. sitting facing a window). Try a different browser tab."),
                ("Laggy performance",
                 "Close other Chrome tabs. Draw in the Air uses GPU processing, so fewer open tabs means smoother tracking."),
                ("Won't load at all",
                 "Check the school network firewall. The site needs access to Google's MediaPipe CDN at storage.googleapis.com."),
            ]),
        ],
    ),
    # 05 -----------------------------------------------------------------
    dict(
        file="05-parent-communication-pack.pdf",
        title="Parent Communication Pack",
        audience="FOR TEACHERS",
        blocks=[
            ("intro", "Ready-to-use letters, messages, and FAQs for families."),
            ("body", "Use these ready-made templates to explain Draw in the Air to parents. Edit and adapt them as needed."),
            ("h2", "Template 1: Short Message (ClassDojo / Email / Text)"),
            ("panel", "Copy & paste", MINT,
             ["Hi families! This week we're using a free learning tool called Draw in the Air (drawintheair.com) "
              "for movement breaks and letter practice. Children use their finger in front of the webcam to trace "
              "letters and play learning games. No download or account needed. The webcam footage is never recorded "
              "or stored. You can try it at home too! Just visit drawintheair.com on any laptop.",
              "[Your name]"]),
            ("h2", "Template 2: Formal Parent Letter"),
            ("panel", "Copy & adapt", SKY,
             ["Dear Parent/Guardian,",
              "I am writing to let you know that our class will be using a free, browser-based learning tool called "
              "Draw in the Air (drawintheair.com) as part of our early literacy and movement break programme.",
              "Draw in the Air uses your child's webcam to detect hand gestures. Children use a simple \"pinch\" "
              "gesture to trace letters, numbers, and shapes in the air on screen. All webcam processing happens "
              "locally on the device. No video is ever recorded, uploaded, or stored by us or any third party. "
              "No child accounts are created.",
              "The tool is completely free, contains no advertising, and is aligned with EYFS physical and literacy "
              "development goals. If you have any questions, please don't hesitate to get in touch.",
              "Yours sincerely,",
              "[Teacher name]  |  [Class]  |  [Date]"]),
            ("h2", "Quick Parent FAQ"),
            ("kv", [
                ("Q: Is the camera safe?",
                 "A: Yes. Video is processed on the device only, never uploaded."),
                ("Q: Is it free?",
                 "A: Completely. No subscription, no in-app purchases, ever."),
                ("Q: Can my child use it at home?",
                 "A: Yes! drawintheair.com works on any laptop or desktop."),
                ("Q: What age is it for?",
                 "A: Ages 3-8, with activities for every stage."),
            ]),
        ],
    ),
    # 06 -----------------------------------------------------------------
    dict(
        file="06-progress-tracking-sheet.pdf",
        title="Progress & Observation Tracker",
        audience="FOR TEACHERS",
        blocks=[
            ("intro", "Simple assessment tools for gestures, letters, and engagement."),
            ("body", "Use these observation prompts and tracking grids during or immediately after Draw in the Air sessions."),
            ("h2", "Observation Prompts: What to Watch For"),
            ("h3", "Gesture Control"),
            ("bullets", [
                "Can the child isolate the index finger independently?",
                "Is the pinch gesture stable or erratic?",
                "Can they stop and start drawing intentionally?",
                "Do they maintain hand position or tire quickly?"]),
            ("h3", "Letter Formation"),
            ("bullets", [
                "Does the child start at the correct point?",
                "Do they follow the correct directional stroke?",
                "Is the letter recognisable after 3+ attempts?",
                "Do they self-correct when the trace goes wrong?"]),
            ("h3", "Engagement & Focus"),
            ("bullets", [
                "Does the child stay on task for the full activity?",
                "Do they show frustration or resilience when tracing is hard?",
                "Do they celebrate success (intrinsic motivation)?",
                "Are they helping or coaching peers?"]),
            ("h2", "Letter Mastery Tracking Grid"),
            ("grid_letters",),
            ("panel", "Evidence tip", SUN,
             ["Photograph children's best air-drawn letters using a screen capture. These make powerful learning "
              "journey evidence and genuinely surprise parents at parents' evening. Nothing says \"engaged learning\" "
              "like a video of a 4-year-old tracing a perfect letter S in mid-air."]),
        ],
    ),
    # 07 -----------------------------------------------------------------
    dict(
        file="07-send-inclusion-support-guide.pdf",
        title="SEND & Inclusion Support Guide",
        audience="FOR SENCOs & TEACHERS",
        blocks=[
            ("intro", "Adapting Draw in the Air for diverse learning needs."),
            ("body", "Draw in the Air's low-barrier, non-verbal interaction makes it exceptionally well-suited for "
                     "children with a wide range of additional needs. This guide outlines specific adaptations and strategies."),
            ("panel", "Why Draw in the Air works for SEND learners", LAVENDER,
             ["No pencil pressure required: ideal for dysgraphia, hypermobility, or weak grip strength.",
              "No time pressure by default: children work at their own pace within each activity.",
              "Visual and kinesthetic feedback combined: supports multi-sensory learners.",
              "Low language demand: children can engage without verbal or written instruction.",
              "Instant, encouraging feedback: reduces fear of failure with celebratory responses."]),
            ("h2", "Autism Spectrum Condition (ASC)"),
            ("kv", [
                ("Structure",
                 "Always open the same activity first to establish routine. Use a visual schedule card showing the "
                 "session steps in order so the child knows what comes next."),
                ("Sensory",
                 "Allow the child to stand further from the camera if they prefer more physical space. The tracking "
                 "still works at a distance."),
                ("Interest-led",
                 "Let the child choose which letter or activity they do. Autonomy significantly increases engagement."),
            ]),
            ("h2", "Dyspraxia / DCD"),
            ("kv", [
                ("Start bigger",
                 "Begin with Bubble Pop. The large, sweeping movements are easier to initiate than precise tracing."),
                ("Extended practice",
                 "Allow more time on each letter. Tracing the same letter 20 times is fine. Repetition builds motor memory."),
                ("No grip strain",
                 "Unlike pencil tasks, air drawing removes the physical strain that makes fine motor tasks painful or tiring."),
            ]),
            ("h2", "ADHD & Attention Difficulties"),
            ("kv", [
                ("Shorter bursts",
                 "Use 2-3 minute activity windows rather than 8-10 minutes. Switch between modes to maintain novelty."),
                ("Movement as regulation",
                 "Use Bubble Pop specifically as a co-regulation tool before desk-based tasks. It channels movement productively."),
                ("Visual timer",
                 "Show a visual countdown timer on the board alongside the activity. Clear endings reduce anxiety."),
            ]),
            ("h2", "EAL (English as an Additional Language)"),
            ("kv", [
                ("Language-free entry point",
                 "Letter tracing works without any English. Children can trace letters from any alphabet, then match "
                 "them to English letter forms."),
                ("Phonics sounds",
                 "The audio sounds in Letter Tracing provide phonics input even for early EAL learners. Hearing the "
                 "sound alongside the shape builds letter-sound links."),
            ]),
        ],
    ),
    # 08 -----------------------------------------------------------------
    dict(
        file="08-eyfs-reception-activity-guide.pdf",
        title="EYFS & Reception Activity Guide",
        audience="FOR EYFS TEACHERS",
        blocks=[
            ("intro", "Curriculum-linked activities for ages 3-5."),
            ("body", "Each activity in this guide maps directly to EYFS Development Matters statements and Early "
                     "Learning Goals. Use the mapping table to evidence progress in your learning journals and "
                     "planning documents."),
            ("h2", "EYFS Development Matters Mapping"),
            ("card", MINT, "Bubble Pop", "PHYSICAL DEVELOPMENT",
             "Develops overall body strength, co-ordination, balance and agility. Uses core muscle strength to "
             "achieve a good posture when sitting."),
            ("card", SKY, "Letter Tracing", "LITERACY: WORD READING",
             "Understands the five key concepts about print. Demonstrates understanding of letter-sound correspondence."),
            ("card", SKY, "Letter Tracing", "COMMUNICATION & LANGUAGE",
             "Articulates ideas using well-formed sentences. Can listen and respond to books, songs and rhymes."),
            ("card", SUN, "Number Tracing", "MATHEMATICS: NUMBER",
             "Has a deep understanding of number to 10. Subitises (recognises quantities without counting)."),
            ("card", SUN, "Sort & Place", "MATHEMATICS: SHAPE & SPACE",
             "Select, rotate and manipulate shapes in order to develop spatial reasoning."),
            ("card", PEACH, "Free Paint", "EXPRESSIVE ARTS & DESIGN",
             "Explores, uses and refines a variety of artistic effects to express their ideas."),
            ("card", LAVENDER, "Word Search", "LITERACY: COMPREHENSION",
             "Demonstrates understanding of what has been read to them by retelling."),
            ("panel", "Planning tip", MINT,
             ["These EYFS links make Draw in the Air fully justifiable in your medium-term planning as a digital "
              "learning tool, not \"screen time\". Document sessions in your learning environment photos as evidence "
              "of Physical Development and Literacy in action."]),
            ("h2", "Sample Reception Session Plan (15 Minutes)"),
            ("table",
             [["Time", "Phase", "What to do"],
              ["0:00", "Intro", "Gather children on the carpet. Explain: \"We're going to use magic hands to write letters!\""],
              ["0:02", "Teach the gesture", "Model the pinch gesture on the projected screen. Ask 2-3 children to try. Celebrate each attempt."],
              ["0:05", "Whole class", "Choose the Letter of the Week. All children trace together on individual devices."],
              ["0:10", "Independent", "Children choose any letter they want to practise. Teacher circulates and narrates progress."],
              ["0:13", "Reflection", "Ask: \"Which letter did you draw? What sound does it make? Can you think of a word?\""],
              ["0:15", "Tidy up", "Close laptop lids together. Transition to the next activity."]],
             [0.5, 1.0, 3.2]),
        ],
    ),
    # 09 -----------------------------------------------------------------
    dict(
        file="09-year1-2-curriculum-connections.pdf",
        title="Year 1-2 Curriculum Connections",
        audience="FOR KS1 TEACHERS",
        blocks=[
            ("intro", "Linking Draw in the Air activities to Key Stage 1 objectives."),
            ("body", "As children move into Year 1 and 2, Draw in the Air shifts from a primary learning tool to a "
                     "powerful consolidation and engagement tool. It is perfect for warm-ups, interventions, and "
                     "homework extension."),
            ("h2", "National Curriculum KS1 Links"),
            ("h3", "English: Handwriting"),
            ("bullets", [
                "Word Search: sight word recognition and scanning (Year 1 phonics decodable words).",
                "Letter Tracing: \"Sit correctly at a table, holding a pencil comfortably and correctly\" as a pre-cursor skill.",
                "Gesture Spelling: \"Name the letters of the alphabet in order\" (KS1 Spoken Language)."]),
            ("h3", "Mathematics"),
            ("bullets", [
                "Balloon Math: \"Read, write and interpret mathematical statements involving +, -, and =\" (Year 1).",
                "Number Tracing: \"Count to and across 100, forwards and backwards\" with number formation fluency.",
                "Sort & Place: \"Describe position, direction and movement\" for early geometry and spatial language."]),
            ("h3", "Computing"),
            ("bullets", [
                "All activities: \"Use technology purposefully to create, organise, store, manipulate and retrieve content\".",
                "Bubble Pop / Free Paint: \"Recognise common uses of information technology beyond school\".",
                "Teacher note: explain how hand tracking AI works. It is an excellent stimulus for computational thinking discussion."]),
            ("h3", "Physical Education"),
            ("bullets", [
                "All activities: \"Master basic movements including... control and co-ordination\" (KS1 PE).",
                "Bubble Pop: develops visual-motor integration, the same skills as catching and striking in PE.",
                "Letter Tracing: gross motor to fine motor sequencing, mirroring the body-to-pencil transition in the PE curriculum."]),
            ("panel", "Cross-phase tip", SKY,
             ["Year 1-2 children love being the \"expert\" who teaches Reception children how to use Draw in the Air. "
              "A buddy system between classes builds confidence in older children while giving younger ones "
              "aspirational peer models."]),
            ("h2", "Small Group Intervention Ideas"),
            ("card", MINT, "Phonics Catch-Up", "LETTER TRACING + GESTURE SPELLING",
             "For children who haven't met expected phonics standards. Pair air tracing with verbal phoneme articulation."),
            ("card", SUN, "Handwriting Intervention", "LETTER TRACING (SPECIFIC LETTERS)",
             "Target the 5-6 letters the child consistently reverses or malforms. Air trace before pencil practice "
             "in every session."),
            ("card", PEACH, "Maths Fluency", "BALLOON MATH + NUMBER TRACING",
             "For children working below the expected level on addition to 20. Use as a 5-minute warm-up to each "
             "maths intervention session."),
        ],
    ),
    # 10 -----------------------------------------------------------------
    dict(
        file="10-after-school-club-guide.pdf",
        title="After-School Club & Home Learning Guide",
        audience="FOR CLUBS & FAMILIES",
        blocks=[
            ("intro", "Running Draw in the Air outside the school day."),
            ("body", "Draw in the Air works brilliantly in extended school day settings, breakfast clubs, and for "
                     "home learning. Anywhere a webcam is available and a child wants to play."),
            ("h2", "45-Minute After-School Club Session Plan"),
            ("table",
             [["Time", "Phase", "What to do"],
              ["0:00-0:05", "Welcome & Choose", "Children arrive and choose which activity they want to start with. Encourage trying something new."],
              ["0:05-0:15", "Free Exploration", "Unstructured. Children explore any mode freely. No target, no assessment. Pure play."],
              ["0:15-0:25", "Challenge Round", "Set a group challenge: \"Can everyone in the room trace the letter G perfectly?\" Compare attempts."],
              ["0:25-0:35", "Creative Session", "Free Paint mode. Give a loose theme: \"Draw your favourite animal\" or \"Draw what makes you happy.\""],
              ["0:35-0:40", "Tournament", "Bubble Pop: who can pop the most in 60 seconds? Keep the class score on the board."],
              ["0:40-0:45", "Share & Close", "Each child shows one thing they drew or achieved today. Applaud each other. Tidy up."]],
             [0.8, 1.1, 3.0]),
            ("h2", "Setting Up Draw in the Air at Home"),
            ("body", "Share this section directly with parents. Cut here, or photograph and send via your school "
                     "communication app."),
            ("panel", "For parents: Draw in the Air at home", LAVENDER,
             ["1. Open Chrome on any laptop, desktop, or Chromebook.",
              "2. Go to: drawintheair.com",
              "3. Click Allow when the camera permission appears.",
              "4. Choose an activity and follow the on-screen guide.",
              "Best activities to try first: Bubble Pop (ages 3+, instant fun, no reading needed), Letter Tracing "
              "(choose your child's target letters from school), and Free Paint (creative, open-ended, great for "
              "winding down).",
              "The webcam video is never recorded or saved. 100% private. 100% free."]),
            ("h2", "Monthly At-Home Challenge Ideas"),
            ("card", MINT, "Alphabet Marathon", "",
             "Trace all 26 letters in one sitting. Time it. Try to beat your record each week."),
            ("card", SKY, "Family Art Gallery", "",
             "Each family member creates a Free Paint piece. Display them on the fridge."),
            ("card", SUN, "Bubble World Record", "",
             "How many bubbles can you pop in 60 seconds? Submit to school!"),
            ("card", PEACH, "Number Challenge", "",
             "Trace numbers 1-10 perfectly, then try going backwards."),
        ],
    ),
]

# ---------------------------------------------------------------- letter sheets

LETTER_WORDS = {
    "A": "Apple", "B": "Ball", "C": "Cat", "D": "Dog", "E": "Elephant",
    "F": "Fish", "G": "Giraffe", "H": "Hat", "I": "Ice Cream", "J": "Jellyfish",
    "K": "Kite", "L": "Lion", "M": "Moon", "N": "Nest", "O": "Octopus",
    "P": "Penguin", "Q": "Queen", "R": "Rainbow", "S": "Star", "T": "Tiger",
    "U": "Umbrella", "V": "Violin", "W": "Whale", "X": "Xylophone", "Y": "Yarn",
    "Z": "Zebra",
}


def draw_dashed_line(c, x0, x1, y, color=RULE_GREY, dash=(5, 4), width=1):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.setDash(dash[0], dash[1])
    c.line(x0, y, x1, y)
    c.restoreState()


def draw_solid_line(c, x0, x1, y, color=RULE_GREY, width=1.2):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x0, y, x1, y)
    c.restoreState()


def draw_tracing_row(c, glyph, baseline, glyph_size=110):
    """A row of grey tracing glyphs sitting on a dashed baseline, with midline."""
    x0, x1 = MARGIN, PAGE_W - MARGIN
    # Helvetica-Bold cap height ~0.72 em, x-height ~0.53 em
    cap_h = glyph_size * 0.72
    is_upper = glyph.isupper()
    top_line = baseline + cap_h
    mid_line = baseline + cap_h * (0.5 if is_upper else 0.73)
    draw_solid_line(c, x0, x1, top_line)
    draw_dashed_line(c, x0, x1, mid_line)
    draw_solid_line(c, x0, x1, baseline, color=HexColor("#A8A1C0"), width=1.4)

    gw = stringWidth(glyph, FB, glyph_size)
    n = 4
    gap = (x1 - x0 - n * gw) / (n + 1)
    c.setFillColor(TRACE_GREY)
    c.setFont(FB, glyph_size)
    x = x0 + gap
    for i in range(n):
        c.drawString(x, baseline, glyph)
        x += gw + gap
    # small start arrow hint on first glyph
    c.setFillColor(MINT)
    c.circle(x0 + gap - 8, top_line, 3, stroke=0, fill=1)


def draw_practice_row(c, baseline, height=58):
    """Empty ruled practice row: top line, dashed midline, baseline."""
    x0, x1 = MARGIN, PAGE_W - MARGIN
    draw_solid_line(c, x0, x1, baseline + height)
    draw_dashed_line(c, x0, x1, baseline + height / 2)
    draw_solid_line(c, x0, x1, baseline, color=HexColor("#A8A1C0"), width=1.4)


def draw_letter_page(c, letter, page_label):
    word = LETTER_WORDS[letter]
    draw_page_background(c)

    # Header panel
    band_h = 86
    top = PAGE_H - 30
    c.setFillColor(CREAM)
    c.setStrokeColor(LAVENDER_SOFT)
    c.setLineWidth(1.2)
    c.roundRect(MARGIN - 14, top - band_h, PAGE_W - 2 * (MARGIN - 14), band_h, 14, stroke=1, fill=1)

    draw_logo(c, MARGIN, top - 12 - 24, 24)

    # Big "Letter Aa"
    c.setFillColor(LAVENDER)
    c.setFont(FB, 34)
    c.drawString(MARGIN, top - 76, "Letter %s%s" % (letter, letter.lower()))

    # Word example pill, right side
    pill_text = "%s is for %s" % (letter, word)
    size = 11
    pw = stringWidth(pill_text, FB, size) + 28
    ph = 26
    px = PAGE_W - MARGIN - pw
    py = top - 66
    accent = ACCENTS[(ord(letter) - ord("A")) % len(ACCENTS)]
    c.setFillColor(accent)
    c.roundRect(px, py, pw, ph, ph / 2, stroke=0, fill=1)
    c.setFillColor(CREAM)
    c.setFont(FB, size)
    c.drawCentredString(px + pw / 2, py + 8, pill_text)
    draw_star(c, px - 18, py + ph / 2, 8, SUN)

    # Instruction line
    y = top - band_h - 26
    c.setFillColor(INK_SOFT)
    c.setFont(F, 9.5)
    c.drawString(MARGIN, y, "Trace each grey letter with a pencil. Start at the green dot. Then practise on the empty lines below.")

    # Tracing rows
    glyph_size = 108
    upper_base = y - 36 - glyph_size * 0.72
    draw_tracing_row(c, letter, upper_base, glyph_size)

    lower_base = upper_base - 36 - glyph_size * 0.74
    draw_tracing_row(c, letter.lower(), lower_base, glyph_size)

    # Free practice rows
    row_h = 56
    gap = 34
    label_y = lower_base - 30
    c.setFillColor(LAVENDER)
    c.setFont(FB, 10)
    c.drawString(MARGIN, label_y, "Now you try!")
    base = label_y - 16 - row_h
    for _ in range(3):
        draw_practice_row(c, base, row_h)
        base -= row_h + gap

    draw_footer(c, page_label)


def generate_letter_sheets():
    for i in range(26):
        letter = chr(ord("A") + i)
        path = os.path.join(OUT_DIR, "letter-%s.pdf" % letter.lower())
        c = canvas.Canvas(path, pagesize=A4)
        c.setTitle("Letter %s%s Tracing Sheet - Draw in the Air" % (letter, letter.lower()))
        c.setAuthor("Draw in the Air")
        draw_letter_page(c, letter, "Letter %s%s" % (letter, letter.lower()))
        c.showPage()
        c.save()
        print("  wrote", os.path.basename(path))


def generate_workbook():
    path = os.path.join(OUT_DIR, "az-letter-tracing-workbook.pdf")
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle("A to Z Letter Tracing Workbook - Draw in the Air")
    c.setAuthor("Draw in the Air")

    # ---- cover page
    draw_page_background(c)
    # Big soft panel
    c.setFillColor(CREAM)
    c.setStrokeColor(LAVENDER_SOFT)
    c.setLineWidth(1.5)
    c.roundRect(MARGIN, MARGIN + 30, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN - 60, 22, stroke=1, fill=1)

    logo_h = 56
    logo_w = logo_h * LOGO_RATIO
    draw_logo(c, (PAGE_W - logo_w) / 2, PAGE_H - 190, logo_h)

    c.setFillColor(LAVENDER)
    c.setFont(FB, 34)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 300, "A to Z")
    c.setFont(FB, 30)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 344, "Letter Tracing Workbook")

    c.setFillColor(INK_SOFT)
    c.setFont(F, 13)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 390, "26 calm, child-friendly tracing pages for ages 3 to 6")

    # decorative letter row
    sample = "Aa Bb Cc"
    c.setFillColor(TRACE_GREY)
    c.setFont(FB, 64)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 510, sample)
    draw_dashed_line(c, PAGE_W / 2 - 170, PAGE_W / 2 + 170, PAGE_H - 512)

    # sparkle accents
    draw_star(c, PAGE_W / 2 - 215, PAGE_H - 280, 12, SUN)
    draw_star(c, PAGE_W / 2 + 218, PAGE_H - 320, 9, MINT)
    draw_star(c, PAGE_W / 2 + 190, PAGE_H - 250, 7, PEACH)

    c.setFillColor(INK)
    c.setFont(F, 10)
    c.drawCentredString(PAGE_W / 2, MARGIN + 110,
                        "Pairs perfectly with the Letter Tracing mode at drawintheair.com.")
    c.drawCentredString(PAGE_W / 2, MARGIN + 94,
                        "Trace in the air first, then on paper. Movement builds motor memory.")

    draw_footer(c, "A to Z Workbook")
    c.showPage()

    # ---- 26 letter pages
    for i in range(26):
        letter = chr(ord("A") + i)
        draw_letter_page(c, letter, "Page %d of 27" % (i + 2))
        c.showPage()
    c.save()
    print("  wrote az-letter-tracing-workbook.pdf (27 pages)")


def generate_guides():
    for g in GUIDES:
        path = os.path.join(OUT_DIR, g["file"])
        c = canvas.Canvas(path, pagesize=A4)
        c.setTitle(g["title"] + " - Draw in the Air")
        c.setAuthor("Draw in the Air")
        r = GuideRenderer(c, g["title"], g["audience"], GUIDES.index(g) + 1)
        r.render(g["blocks"])
        c.save()
        print("  wrote", g["file"])


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Generating teacher guides...")
    generate_guides()
    print("Generating letter tracing sheets...")
    generate_letter_sheets()
    print("Generating A-Z workbook...")
    generate_workbook()
    print("Done. Output:", OUT_DIR)


if __name__ == "__main__":
    main()
