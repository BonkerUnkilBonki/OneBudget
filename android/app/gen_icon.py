#!/usr/bin/env python3
"""Generate the OneBudget launcher icon: blue One UI squircle with a rupee mark."""
import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
S = 512
FONT = os.path.join(BASE, '..', '..', 'fonts', 'OneGitSans.ttf')

# diagonal gradient #0381FE -> #1B6EF3
grad = Image.new('RGBA', (S, S))
d = ImageDraw.Draw(grad)
c1, c2 = (3, 129, 254), (27, 110, 243)
for y in range(S):
    t = y / S
    d.line([(0, y), (S, y)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,))

mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=118, fill=255)

img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
img.paste(grad, (0, 0), mask)

# rupee mark in white
draw = ImageDraw.Draw(img)
try:
    f = ImageFont.truetype(FONT, 300)
except Exception:
    f = ImageFont.load_default()
text = '\u20B9'
box = draw.textbbox((0, 0), text, font=f)
w, h = box[2] - box[0], box[3] - box[1]
draw.text(((S - w) / 2 - box[0], (S - h) / 2 - box[1] - 6), text, font=f, fill=(255, 255, 255, 255))

for size, name in [(48, 'mdpi'), (72, 'hdpi'), (96, 'xhdpi'), (144, 'xxhdpi'), (192, 'xxxhdpi')]:
    out = os.path.join(BASE, 'res', 'mipmap-' + name)
    os.makedirs(out, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out, 'ic_launcher.png'))
print('icons written')
