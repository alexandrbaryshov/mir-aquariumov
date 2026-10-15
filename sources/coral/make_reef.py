"""Turn the generated coral cutouts (sources/coral/reef/*.webp, background already removed)
into the hero's reef layers: public/img/reef/<key>-wide.webp and <key>-tall.webp.

near-l / near-r: tall clusters at the screen edges that the camera passes during the dive.
rest-l / rest-r: low mounds in the bottom corners, where the dive ends and the page rests.

Each layout gets only the pixels it can show: a phone gets smaller, lighter files, and
its corner mounds are cut down to the outer upper part, the only part it shows (on a
phone the reef melts away above the plaque, see .reef in styles.css).

The cutouts are Nano Banana 2.1 renders (prompted with a crop of hero-water.jpg as the
reference) with the background removed by recraft/remove-background.

Run from the project root: py sources/coral/make_reef.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'sources/coral/reef'
OUT = 'public/img/reef'
WATER = np.array([96, 196, 204], np.float32)  # hero-water.jpg around the reef

# veil: how much water colour lies between the camera and the coral.
# Per layout: size, (axis, pixels) of the output; crop, (share of the width kept from the
# outer edge, share of the height kept from the top); fade, share of the height that fades
# out at the bottom, so a cut edge never shows while the mound is still small at the start
# of the dive.
LAYERS = {
    'near-l': {'outer': 'left', 'veil': 0.04, 'wide': {'size': ('h', 1400)}, 'tall': {'size': ('h', 880)}},
    'near-r': {'outer': 'right', 'veil': 0.04, 'wide': {'size': ('h', 1400)}, 'tall': {'size': ('h', 880)}},
    'rest-l': {
        'outer': 'left',
        'veil': 0.08,
        'wide': {'size': ('w', 1300), 'fade': 0.12},
        'tall': {'size': ('w', 860), 'crop': (0.62, 0.7), 'fade': 0.15},
    },
    'rest-r': {
        'outer': 'right',
        'veil': 0.08,
        'wide': {'size': ('w', 1300), 'fade': 0.12},
        'tall': {'size': ('w', 860), 'crop': (0.62, 0.7), 'fade': 0.15},
    },
}
QUALITY = {'wide': 80, 'tall': 72}  # a phone gets the lighter files


def clean(img):
    """Drop specks the background removal left floating (a stray fish), crop to the coral."""
    rgba = np.asarray(img.convert('RGBA')).astype(np.float32)
    a = rgba[..., 3]
    labels, n = ndimage.label(a > 24)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(a), labels, range(1, n + 1))
        keep = np.isin(labels, 1 + np.nonzero(sizes >= sizes.max() * 0.01)[0])
        # Keep the soft edge around what stays, drop it around what goes.
        keep = ndimage.binary_dilation(keep, iterations=3)
        rgba[..., 3] = a * keep
    out = Image.fromarray(rgba.astype(np.uint8), 'RGBA')
    return out.crop(out.getbbox())


def veil(img, amount):
    rgba = np.asarray(img).astype(np.float32)
    rgba[..., :3] = rgba[..., :3] * (1 - amount) + WATER * amount
    return Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')


def fade_bottom(img, share):
    rgba = np.asarray(img).astype(np.float32)
    h = rgba.shape[0]
    ys = np.arange(h)[:, None]
    rgba[..., 3] *= np.clip((h - 1 - ys) / (h * share), 0, 1) ** 0.8
    return Image.fromarray(rgba.astype(np.uint8), 'RGBA')


def resize(img, axis, px):
    w, h = img.size
    k = px / (h if axis == 'h' else w)
    return img.resize((round(w * k), round(h * k)), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
for key, spec in LAYERS.items():
    img = veil(clean(Image.open(f'{SRC}/{key}.webp')), spec['veil'])
    for layout in ('wide', 'tall'):
        opts = spec[layout]
        part = img
        if 'crop' in opts:
            kw, kh = opts['crop']
            w, h = part.size
            cut = round(w * kw)
            part = part.crop((0, 0, cut, round(h * kh)) if spec['outer'] == 'left' else (w - cut, 0, w, round(h * kh)))
            part = part.crop(part.getbbox())
        if 'fade' in opts:
            part = fade_bottom(part, opts['fade'])
        part = resize(part, *opts['size'])
        path = f'{OUT}/{key}-{layout}.webp'
        part.save(path, 'WEBP', quality=QUALITY[layout], alpha_quality=70, method=6)
        print(path, part.size, round(os.path.getsize(path) / 1024), 'KB')
