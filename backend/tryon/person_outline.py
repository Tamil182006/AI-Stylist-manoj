import cv2
import mediapipe as mp
import math
import json

# =============================
# CONFIG
# =============================
INPUT_IMAGE_PATH = "input.jpg"
OUTPUT_IMAGE_PATH = "step1_output.jpg"
BOX_JSON_PATH = "torso_box.json"

TORSO_RATIO = 1.3        # Torso height relative to shoulder width
TOP_OFFSET_RATIO = 0.1  # Lift box slightly upward
MIN_BOX_SIZE = 40       # Safety: minimum box dimension in pixels

# =============================
# LOAD IMAGE
# =============================
image = cv2.imread(INPUT_IMAGE_PATH)
if image is None:
    raise ValueError("❌ Could not read input image. Check path or filename.")

image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
height, width, _ = image.shape

# =============================
# MEDIAPIPE SETUP
# =============================
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.5
)

# =============================
# POSE DETECTION
# =============================
results = pose.process(image_rgb)

if not results.pose_landmarks:
    raise RuntimeError("❌ No human pose detected.")

landmarks = results.pose_landmarks.landmark

# =============================
# LANDMARK EXTRACTION
# =============================
LEFT_SHOULDER = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
RIGHT_SHOULDER = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]

def to_pixel(lm):
    return int(lm.x * width), int(lm.y * height)

ls_x, ls_y = to_pixel(LEFT_SHOULDER)
rs_x, rs_y = to_pixel(RIGHT_SHOULDER)

# =============================
# TORSO GEOMETRY (ROBUST + CLAMPED)
# =============================
center_x = (ls_x + rs_x) // 2
center_y = (ls_y + rs_y) // 2

shoulder_width = int(math.dist((ls_x, ls_y), (rs_x, rs_y)))
shoulder_width = max(shoulder_width, MIN_BOX_SIZE)

top_offset = int(shoulder_width * TOP_OFFSET_RATIO)
box_height = int(shoulder_width * TORSO_RATIO)

box_x1 = center_x - shoulder_width // 2
box_x2 = center_x + shoulder_width // 2
box_y1 = center_y - top_offset
box_y2 = box_y1 + box_height

# =============================
# CLAMP TO IMAGE BOUNDS
# =============================
box_x1 = max(0, box_x1)
box_y1 = max(0, box_y1)
box_x2 = min(width - 1, box_x2)
box_y2 = min(height - 1, box_y2)

# =============================
# SAVE TORSO BOX (THIS IS IMPORTANT)
# =============================
with open(BOX_JSON_PATH, "w") as f:
    json.dump(
        {
            "x1": box_x1,
            "y1": box_y1,
            "x2": box_x2,
            "y2": box_y2
        },
        f,
        indent=2
    )

print("📦 Torso box saved to torso_box.json")

# =============================
# DRAW DEBUG OUTPUT
# =============================
output = image.copy()

cv2.circle(output, (ls_x, ls_y), 6, (255, 0, 0), -1)
cv2.circle(output, (rs_x, rs_y), 6, (255, 0, 0), -1)
cv2.line(output, (ls_x, ls_y), (rs_x, rs_y), (0, 255, 0), 2)

cv2.rectangle(
    output,
    (box_x1, box_y1),
    (box_x2, box_y2),
    (0, 0, 255),
    2
)

# =============================
# SAVE OUTPUT IMAGE
# =============================
cv2.imwrite(OUTPUT_IMAGE_PATH, output)

print("✅ STEP 1 COMPLETE")
print(f"📸 Output saved as: {OUTPUT_IMAGE_PATH}")
print("📐 Torso box computed and stored correctly")
