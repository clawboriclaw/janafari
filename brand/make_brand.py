#!/usr/bin/env python3
"""Generate the Janafari identity as SVG paths (no fonts): two treatments.
   A = Home Team   — mildly condensed block letters, softly squared corners, one forward cut on J/F/R terminals
   B = Scoreboard  — straighter, wider, square corners, jersey-patch J
Cap height 100 units; glyphs are filled polygons; corner softening is a same-colour round-join stroke."""
import json

T = 24   # stroke thickness

def glyphs(cut, wide):
    w = 1.12 if wide else 1.0
    c = cut  # forward cut depth (units) on selected terminals
    G = {}
    # I
    G['I'] = (24*w, [[(0,0),(24*w,0),(24*w,100),(0,100)]])
    # J : stem right, hook bottom-left, forward-cut top terminal
    W=64*w
    G['J'] = (W, [[(W-24,0+c),(W,0),(W,78),(W-8,92),(W-26,100),(26,100),(8,92),(0,78),(0,66),(24,66),(24,72),(30,76),(W-30,76),(W-24,72),(W-24,0+c)]])
    # A
    W=70*w
    G['A'] = (W, [[(0,100),(24,0),(W-24,0),(W,100),(W-24,100),(W-30,80),(30,80),(24,100)],
                  [(33,60),(W-33,60),(W-40,36),(40,36)]])
    # N
    W=68*w
    G['N'] = (W, [[(0,0),(24,0),(W-24,60),(W-24,0),(W,0),(W,100),(W-24,100),(24,40),(24,100),(0,100)]])
    # F : forward cut on the top bar's end
    W=58*w
    G['F'] = (W, [[(0,0),(W,0),(W-c,24),(24,24),(24,40),(W-10,40),(W-10,62),(24,62),(24,100),(0,100)]])
    # R
    W=66*w
    G['R'] = (W, [[(0,0),(W-16,0),(W-4,6),(W,18),(W,40),(W-6,52),(W-18,58),(W-4,100-c),(W-4,100),(W-30,100),(W-42,60),(24,60),(24,100),(0,100)],
                  [(24,22),(W-22,22),(W-22,38),(24,38)]])
    return G

def word(text, cut, wide, gap):
    G = glyphs(cut, wide); x = 0; paths = []
    for ch in text:
        W, polys = G[ch]
        d = ''
        for poly in polys:
            d += 'M' + ' L'.join('%.1f %.1f' % (x+px, py) for px, py in poly) + ' Z '
        paths.append(d.strip()); x += W + gap
    return x - gap, paths

def wordmark_svg(variant, fill='#fff'):
    if variant == 'A': total, paths = word('JANAFARI', cut=8, wide=False, gap=9); soft = 8
    else:              total, paths = word('JANAFARI', cut=0, wide=True,  gap=12); soft = 2
    body = ''.join('<path d="%s"/>' % p for p in paths)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 %.0f 108" role="img" aria-label="Janafari">'
            '<g fill="%s" stroke="%s" stroke-width="%d" stroke-linejoin="round" fill-rule="evenodd">%s</g></svg>') % (total+8, fill, fill, soft, body), total

def mark_svg(variant, size=64):
    if variant == 'A':
        # tile + bold J with a hooked base, forward-cut top; a gold accent follows the same cut angle
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Janafari J">'
                '<rect width="64" height="64" rx="16" fill="#0b2a4f"/>'
                '<path d="M37 13 L49 10 L49 45 L45 53 L34 57 L22 57 L13 52 L10 45 L10 40 L21 40 L21 43 L25 46 L33 46 L37 43 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>'
                '<path d="M37 13 L49 10 L49 18 L37 21 Z" fill="#fdbb30"/>'
                '</svg>')
    # B: jersey patch — rounded square, gold border with a stitched inner line, square-terminal J
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Janafari J">'
            '<rect x="2" y="2" width="60" height="60" rx="12" fill="#041c38" stroke="#fdbb30" stroke-width="4"/>'
            '<rect x="9" y="9" width="46" height="46" rx="8" fill="none" stroke="#fdbb30" stroke-width="1.5" stroke-dasharray="3 3" opacity=".7"/>'
            # the J is centred on the tile: x 16–48 (centre 32), y 13–51 (centre 32)
            '<path d="M22 13 H48 V22 H43 V39 Q43 51 30 51 Q16 51 16 39 V33 H25 V39 Q25 44 30 44 Q34 44 34 39 V22 H22 Z" fill="#fff"/>'
            '</svg>')

if __name__ == '__main__':
    out = {}
    for v in 'AB':
        svg, total = wordmark_svg(v)
        open('wordmark-%s.svg' % v, 'w').write(svg); open('mark-%s.svg' % v, 'w').write(mark_svg(v))
        out[v] = {'wordmark_width_units': total}
    print(json.dumps(out))
