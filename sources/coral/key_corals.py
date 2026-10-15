"""Cut the coral cluster out of the hero plate with a colour key (R - G), for preview."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out_dir = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

k = r - g  # corals: warm/lilac (r >= g); water and sand: cyan (r < g)
lo, hi = float(sys.argv[3]) if len(sys.argv) > 3 else -14, float(sys.argv[4]) if len(sys.argv) > 4 else 6
t = np.clip((k - lo) / (hi - lo), 0, 1)
alpha = t * t * (3 - 2 * t)

# Remove speckles, fill small holes inside the coral mass.
mask = alpha > 0.5
mask = ndimage.binary_opening(mask, iterations=2)
labels, n = ndimage.label(mask)
sizes = ndimage.sum(mask, labels, range(1, n + 1))
keep = np.isin(labels, 1 + np.nonzero(sizes > 4000)[0])
keep[:, : int(W * 0.56)] = False  # sand caustics on the left are not coral
keep = ndimage.binary_closing(keep, iterations=6)
keep = ndimage.binary_fill_holes(keep)
soft = ndimage.gaussian_filter(keep.astype(np.float32), 1.6)
alpha = np.clip(np.maximum(alpha * soft, soft * 0.92), 0, 1)
# Keep only the coral mass (largest component after cleanup).
lab2, n2 = ndimage.label(soft > 0.05)
if n2 > 1:
    s2 = ndimage.sum(soft > 0.05, lab2, range(1, n2 + 1))
    alpha *= lab2 == (1 + int(np.argmax(s2)))

rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
cut = Image.fromarray(rgba, 'RGBA')
bbox = cut.getbbox()
print('size', W, H, 'bbox', bbox)
cut = cut.crop(bbox)
cut.save(out_dir + '/coral-key.png')
prev = Image.new('RGBA', cut.size, (12, 60, 80, 255))
prev.alpha_composite(cut)
prev.convert('RGB').save(out_dir + '/coral-key-preview.jpg', quality=88)
