import cv2
import numpy as np
import json

# =============================
# INPUT PATHS
# =============================
USER_IMAGE_PATH = "input.jpg"
DRESS_IMAGE_PATH = "dress.png"
DRESS_MASK_PATH = "dress_mask.png"
BOX_JSON_PATH = "torso_box.json"
OUTPUT_PATH = "tryon_output.png"

# =============================
# LOAD IMAGES
# =============================
user_img = cv2.imread(USER_IMAGE_PATH)
dress_img = cv2.imread(DRESS_IMAGE_PATH)
dress_mask = cv2.imread(DRESS_MASK_PATH, cv2.IMREAD_GRAYSCALE)

if user_img is None:
    raise ValueError("❌ User image not found")
if dress_img is None:
    raise ValueError("❌ Dress image not found")
if dress_mask is None:
    raise ValueError("❌ Dress mask not found")

img_h, img_w = user_img.shape[:2]

# =============================
# LOAD TORSO BOX
# =============================
with open(BOX_JSON_PATH, "r") as f:
    box = json.load(f)

x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]

# =============================
# CLAMP BOX
# =============================
x1 = max(0, min(x1, img_w - 1))
y1 = max(0, min(y1, img_h - 1))
x2 = max(0, min(x2, img_w))
y2 = max(0, min(y2, img_h))

if x2 <= x1 or y2 <= y1:
    raise ValueError("❌ Torso box invalid")

# =============================
# DEBUG BOX
# =============================
debug = user_img.copy()
cv2.rectangle(debug, (x1, y1), (x2, y2), (0, 255, 0), 2)
cv2.imwrite("debug_box_tryon.png", debug)

# =============================
# EXTRACT ROI
# =============================
roi = user_img[y1:y2, x1:x2]
roi_h, roi_w = roi.shape[:2]

# =============================
# CROP DRESS USING MASK
# =============================
ys, xs = np.where(dress_mask > 0)
dx1, dx2 = xs.min(), xs.max()
dy1, dy2 = ys.min(), ys.max()

dress_crop = dress_img[dy1:dy2, dx1:dx2]
mask_crop = dress_mask[dy1:dy2, dx1:dx2]

# =============================
# RESIZE TO ROI
# =============================
dress_resized = cv2.resize(dress_crop, (roi_w, roi_h))
mask_resized = cv2.resize(mask_crop, (roi_w, roi_h))

# =============================
# STEP 3.5 — SHAPE-AWARE WARPING
# =============================

h, w = roi_h, roi_w

# ---- 1. Waist narrowing (simple perspective warp)
top_width = w
bottom_width = int(w * 0.88)   # tighten waist (adjustable)

src_pts = np.float32([
    [0, 0],
    [w, 0],
    [w, h],
    [0, h]
])

dst_pts = np.float32([
    [0, 0],
    [w, 0],
    [w//2 + bottom_width//2, h],
    [w//2 - bottom_width//2, h]
])

M = cv2.getPerspectiveTransform(src_pts, dst_pts)

dress_warped = cv2.warpPerspective(dress_resized, M, (w, h))
mask_warped = cv2.warpPerspective(mask_resized, M, (w, h))

# ---- 2. Trim sleeves lightly
trim_px = int(0.08 * w)
mask_warped[:, :trim_px] = 0
mask_warped[:, w-trim_px:] = 0

# =============================
# PREPARE MASK
# =============================
mask_warped = (mask_warped > 127).astype(np.float32)
mask_3ch = np.stack([mask_warped] * 3, axis=-1)

# =============================
# BLEND
# =============================
roi_f = roi.astype(np.float32)
dress_f = dress_warped.astype(np.float32)

combined = dress_f * mask_3ch + roi_f * (1 - mask_3ch)

user_img[y1:y2, x1:x2] = combined.astype(np.uint8)

# =============================
# SAVE RESULT
# =============================
cv2.imwrite(OUTPUT_PATH, user_img)

print("✅ TRY-ON WITH SHAPE-AWARE WARPING DONE")
print(f"📸 Saved as: {OUTPUT_PATH}")
print("🟩 Debug box saved as: debug_box_tryon.png")
