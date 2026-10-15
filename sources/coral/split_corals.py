"""Split the coral cutout into a tall side cluster and a low bed; paint out the small fish."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out_dir, prev_dir = sys.argv[1], sys.argv[2], sys.argv[3]
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
rgb, a = im[..., :3], im[..., 3]
H, W = a.shape

# Fish boxes (x0, y0, x1, y1) in cutout pixels: fill them by diffusion from the surroundings.
boxes = [(458, 345, 515, 412), (872, 278, 984, 344), (786, 442, 888, 508)]
hole = np.zeros((H, W), bool)
for x0, y0, x1, y1 in boxes:
    hole[y0:y1, x0:x1] = True
lum = rgb @ np.array([0.299, 0.587, 0.114])
# Only bright coral pixels feed the fill, so shadows and fish don't smear in.
valid = (~hole) & (a > 200) & (lum > 120)
filled = rgb.copy()
todo_all = hole.copy()
for sigma in (5, 10, 20, 40):
    w = ndimage.gaussian_filter(valid.astype(np.float32), sigma)
    acc = np.stack([ndimage.gaussian_filter(rgb[..., c] * valid, sigma) for c in range(3)], -1)
    est = acc / np.maximum(w[..., None], 1e-4)
    todo = hole & (w > 0.01)
    filled[todo] = est[todo]
    valid = valid | todo
    hole = hole & ~todo
# Feathered blend so the patches have no box edges; a little grain keeps texture.
f = np.clip(ndimage.gaussian_filter(todo_all.astype(np.float32), 5) * 1.6, 0, 1)[..., None]
grain = np.random.default_rng(3).normal(0, 5, rgb.shape)
rgb = np.clip(rgb * (1 - f) + (filled + grain) * f, 0, 255)
out = np.dstack([rgb, a]).astype(np.uint8)
full = Image.fromarray(out, 'RGBA')

def save(img, name):
    bbox = img.getbbox()
    img = img.crop(bbox)
    img.save(f'{out_dir}/{name}.webp', 'WEBP', quality=84, method=6)
    pv = Image.new('RGBA', img.size, (12, 60, 80, 255))
    pv.alpha_composite(img)
    pv.convert('RGB').save(f'{prev_dir}/{name}-preview.jpg', quality=85)
    print(name, img.size)

xs = np.arange(W)[None, :]
ramp = lambda d, width: np.clip(d / width, 0, 1) ** 1.5  # soft fade instead of a cut line

# Side cluster: the right part (tall lilac column + big pink head), floating bits dropped.
side = out.copy().astype(np.float32)
side[..., 3] *= ramp(xs - W * 0.5, 70)
side[: int(H * 0.34), : int(W * 0.84), 3] = 0  # floating cream pieces above the reef
save(Image.fromarray(side.astype(np.uint8), 'RGBA'), 'coral-side')

# Low bed: the left part (pink, peach, cream heads).
bed = out.copy().astype(np.float32)
bed[..., 3] *= ramp(W * 0.68 - xs, 70)
bed[: int(H * 0.42), :, 3] = 0
save(Image.fromarray(bed.astype(np.uint8), 'RGBA'), 'coral-bed')
