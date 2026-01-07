import sys
import cv2
import mediapipe as mp
import numpy as np
import json

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=2,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

def get_face_shape(landmarks, image_shape):
    h, w, _ = image_shape
    
    # Key landmarks for face shape
    coords = {}
    for idx, lm in enumerate(landmarks.landmark):
        coords[idx] = (int(lm.x * w), int(lm.y * h))

    # Calculate widths
    jaw_width = np.linalg.norm(np.array(coords[234]) - np.array(coords[454]))
    forehead_width = np.linalg.norm(np.array(coords[103]) - np.array(coords[332]))
    face_length = np.linalg.norm(np.array(coords[10]) - np.array(coords[152]))
    
    # Ratios
    ratio_len_wide = face_length / jaw_width
    ratio_forehead_jaw = forehead_width / jaw_width
    
    # Simple Rule-based Classification
    if ratio_len_wide > 1.5:
        shape = "Oblong"
    elif ratio_len_wide < 1.15:
        shape = "Square"
    elif ratio_forehead_jaw < 0.8:
        shape = "Round"
    elif ratio_forehead_jaw > 1.2:
        shape = "Heart"
    else:
        shape = "Oval"

    return shape

def get_skin_tone(image, landmarks):
    h, w, _ = image.shape
    
    # Use cheek area for skin tone
    lm_check_x = int(landmarks.landmark[50].x * w)
    lm_check_y = int(landmarks.landmark[50].y * h)
    
    # Ensure bounds
    if lm_check_x < 0 or lm_check_x >= w or lm_check_y < 0 or lm_check_y >= h:
        return "Medium"

    patch = image[lm_check_y:lm_check_y+20, lm_check_x:lm_check_x+20]
    
    if patch.size == 0:
        return "Medium"

    # Convert to HSV
    hsv_patch = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    avg_hsv = np.mean(hsv_patch, axis=(0,1))
    
    # Check Value (Brightness)
    brightness = avg_hsv[2]
    
    if brightness > 170:
        return "Fair"
    elif brightness < 100:
        return "Dark"
    else:
        return "Medium"

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        return

    image_path = sys.argv[1]
    occasion = sys.argv[2]

    try:
        image = cv2.imread(image_path)
        if image is None:
            print(json.dumps({"error": "Could not read image"}))
            return

        results = face_mesh.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if not results.multi_face_landmarks:
             print(json.dumps({"error": "No face detected"}))
             return
        
        if len(results.multi_face_landmarks) > 1:
             print(json.dumps({"error": "Multiple faces detected. Please upload a solo photo."}))
             return

        landmarks = results.multi_face_landmarks[0]
        
        face_shape = get_face_shape(landmarks, image.shape)
        skin_tone = get_skin_tone(image, landmarks)
        
        # Return ONLY face shape and skin tone
        output = {
            "faceShape": face_shape,
            "skinTone": skin_tone,
            "occasion": occasion
        }
        
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()