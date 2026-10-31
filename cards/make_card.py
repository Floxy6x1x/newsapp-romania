#!/usr/bin/env python3
"""Cartonul 24newsro (modelul casei), 1080x1350.

Poza sus, degrade albastru -> bordo, text alb, linie rosie, nume/eticheta,
apoi logo + "24NEWSRO.RO / Citeste tot materialul pe site".

Exemplu:
  python3 -I cards/make_card.py --photo poza.jpg \
    --headline "Titlul sau citatul" --name "Nume Prenume" \
    --role "functie" --extra "Postare pe Facebook, 21 octombrie 2026" \
    --out card.jpg

Pentru o stire fara citat: --headline "Titlu" --name "Informatia orei" --extra "o fraza scurta"
Referinta vizuala: cards/model-referinta.jpg
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = '/usr/share/fonts/opentype/inter/'
W, H = 1080, 1350
NAVY, RED = (14, 26, 48), (135, 25, 42)


def build(a):
    im = Image.open(a.photo).convert('RGB')
    s = W / im.width
    ph = im.resize((W, round(im.height * s)), Image.LANCZOS)
    base = Image.new('RGB', (W, H), RED)
    base.paste(ph.crop((0, a.top, W, min(ph.height, a.top + H))), (0, 0))
    ov = Image.new('RGBA', (W, H))
    px = ov.load()
    for y in range(H):
        if y < 560:
            col, al = NAVY, 0
        elif y < 860:
            col, al = NAVY, int(255 * ((y - 560) / 300) ** 1.1)
        else:
            t = (y - 860) / (H - 860)
            col, al = tuple(int(NAVY[i] + (RED[i] - NAVY[i]) * t) for i in range(3)), 255
        for x in range(W):
            px[x, y] = col + (al,)
    c = Image.alpha_composite(base.convert('RGBA'), ov).convert('RGB')
    d = ImageDraw.Draw(c)
    f = lambda n, sz: ImageFont.truetype(FONTS + n, sz)

    def wrap(t, font, w):
        L, cur = [], ''
        for wd in t.split():
            u = (cur + ' ' + wd).strip()
            if d.textlength(u, font=font) <= w:
                cur = u
            else:
                L.append(cur)
                cur = wd
        L.append(cur)
        return L

    x, tw = 80, 920
    hf = f('Inter-ExtraBold.otf', a.size)
    y = a.text_y
    for l in wrap(a.headline, hf, tw):
        d.text((x, y), l, font=hf, fill=(255, 255, 255))
        y += int(a.size * 1.32)
    d.rectangle((70, y + 18, 190, y + 24), fill=(255, 90, 90))
    y += 52
    d.text((x, y), a.name, font=f('Inter-ExtraBold.otf', 40), fill=(255, 255, 255))
    y += 58
    if a.role:
        d.text((x, y), a.role, font=f('Inter-Medium.otf', 30), fill=(232, 215, 222))
        y += 44
    if a.extra:
        for l in wrap(a.extra, f('Inter-Medium.otf', 27), tw):
            d.text((x, y), l, font=f('Inter-Medium.otf', 27), fill=(232, 215, 222))
            y += 37
    logo = Image.open(os.path.join(HERE, 'logo-24newsro.png')).resize((100, 100), Image.LANCZOS)
    c.paste(logo, (60, 1218), logo)
    d.text((187, 1243), '24NEWSRO.RO', font=f('Inter-ExtraBold.otf', 36), fill=(255, 255, 255))
    d.text((187, 1288), 'Citește tot materialul pe site', font=f('Inter-Medium.otf', 22), fill=(255, 255, 255))
    c.save(a.out, quality=93)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--photo', required=True)
    p.add_argument('--headline', required=True)
    p.add_argument('--name', required=True)
    p.add_argument('--role', default='')
    p.add_argument('--extra', default='')
    p.add_argument('--out', required=True)
    p.add_argument('--top', type=int, default=70, help='decalaj vertical al pozei (px, dupa redimensionare la 1080 latime)')
    p.add_argument('--size', type=int, default=56, help='marimea fontului titlului')
    p.add_argument('--text-y', dest='text_y', type=int, default=745)
    build(p.parse_args())
