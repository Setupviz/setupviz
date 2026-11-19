# Legend atlas for the keyboard: an 8x8 grid of 128px cells, one per key, in key order.
# legends.png has the cap colour behind each legend; glow.png is the same on black, for the backlight shining through.
from PIL import Image, ImageDraw, ImageFont
import json
ROWS = [
 ['Esc','1','2','3','4','5','6','7','8','9','0','-','=','←'],
 ['⇥','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
 ['⇪','A','S','D','F','G','H','J','K','L',';',"'",'↵'],
 ['⇧','Z','X','C','V','B','N','M',',','.','/','⇧'],
 ['Ctrl','','Alt','—','···','—','Alt','Menu','Ctrl','Fn'],
]
WIDTHS = [[1]*13+[2],[1.5]+[1]*12+[1.5],[1.75]+[1]*11+[2.25],[2.25]+[1]*10+[2.75],[1.25,1.25,1.25,2.25,1.25,2.75,1.25,1.25,1.25,1.25]]
CAP = (30, 31, 34)
def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def rgb(t):
    y, p, v = (245, 226, 110), (236, 120, 200), (120, 96, 250)
    return lerp(y, p, t / 0.5) if t < 0.5 else lerp(p, v, (t - 0.5) / 0.5)
N, C = 8, 128
leg, glow = Image.new('RGB', (N*C, N*C), CAP), Image.new('RGB', (N*C, N*C), (0, 0, 0))
big = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 46)
small = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 30)
sym = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 44)
i = 1  # cell 0 stays blank
for row, ws in zip(ROWS, WIDTHS):
    x = 0
    for label, w in zip(row, ws):
        t = (x + w / 2) / 15; x += w
        cx, cy = (i % N) * C + C // 2, (i // N) * C + 44
        if label:
            f = small if len(label) > 1 and label.isascii() and label.isalpha() else (sym if not label.isascii() else big)
            for im, col in ((leg, rgb(t)), (glow, rgb(t))):
                ImageDraw.Draw(im).text((cx, cy), label, font=f, fill=col, anchor='mm')
        i += 1
leg.save('legends.png'); glow.save('glow.png')
g = Image.new('RGB', (64, 4))
for px in range(64):
    for py in range(4): g.putpixel((px, py), rgb(px / 63))
g.save('rgb.png')
json.dump({'rows': ROWS, 'widths': WIDTHS}, open('layout.json', 'w'))
