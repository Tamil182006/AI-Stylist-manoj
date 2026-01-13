#!/usr/bin/env python3
"""
Hybrid Clothing Extractor - Tries AI first, falls back to manual method
"""

import sys
import json
from pathlib import Path
import cv2
import numpy as np

# Try to import rembg (AI method)
try:
    from rembg import remove
    from PIL import Image
    import io
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("[WARNING] Rembg not available, using fallback method", file=sys.stderr)

# Import mediapipe for fallback
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False


class HybridClothingExtractor:
    def __init__(self):
        """Initialize extractor with fallback support"""
        if MEDIAPIPE_AVAILABLE:
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=True,
                model_complexity=1,
                enable_segmentation=True  # Enable segmentation for better extraction
            )

    def extract(self, input_path, output_path):
        """
        Extract clothing - tries AI first, falls back to manual if needed
        """
        try:
            # METHOD 1: Try Rembg AI (best quality)
            if REMBG_AVAILABLE:
                print("[INFO] Trying AI extraction (Rembg)...", file=sys.stderr)
                return self._extract_with_ai(input_path, output_path)
            
            # METHOD 2: Fallback to MediaPipe with segmentation
            elif MEDIAPIPE_AVAILABLE:
                print("[INFO] Using MediaPipe segmentation...", file=sys.stderr)
                return self._extract_with_segmentation(input_path, output_path)
            
            # METHOD 3: Basic color-based extraction
            else:
                print("[INFO] Using basic color extraction...", file=sys.stderr)
                return self._extract_basic(input_path, output_path)

        except Exception as e:
            print(f"[ERROR] All extraction methods failed: {str(e)}", file=sys.stderr)
            return {"success": False, "error": str(e)}

    def _extract_with_ai(self, input_path, output_path):
        """Method 1: AI-powered extraction using Rembg"""
        try:
            with open(input_path, 'rb') as f:
                input_data = f.read()
            
            # Remove background with AI
            output_data = remove(input_data)
            
            # Convert to image
            output_image = Image.open(io.BytesIO(output_data))
            
            # Crop to content
            bbox = output_image.getbbox()
            if bbox:
                padding = 20
                width, height = output_image.size
                x1 = max(0, bbox[0] - padding)
                y1 = max(0, bbox[1] - padding)
                x2 = min(width, bbox[2] + padding)
                y2 = min(height, bbox[3] + padding)
                output_image = output_image.crop((x1, y1, x2, y2))
            
            # Save
            output_image.save(output_path, format='PNG')
            
            print("[SUCCESS] AI extraction complete", file=sys.stderr)
            return {"success": True, "output": output_path, "method": "rembg_ai"}
            
        except Exception as e:
            print(f"[WARNING] AI extraction failed: {e}", file=sys.stderr)
            raise

    def _extract_with_segmentation(self, input_path, output_path):
        """Method 2: MediaPipe segmentation-based extraction"""
        try:
            # Load image
            image = cv2.imread(input_path)
            if image is None:
                raise ValueError("Failed to load image")
            
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process with MediaPipe
            result = self.pose.process(rgb)
            
            if result.segmentation_mask is not None:
                # Use segmentation mask
                mask = result.segmentation_mask
                mask = (mask > 0.5).astype(np.uint8) * 255
                
                # Refine mask
                kernel = np.ones((5, 5), np.uint8)
                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
                mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
                
                # Apply mask
                b, g, r = cv2.split(image)
                rgba = cv2.merge([b, g, r, mask])
                
                # Save
                cv2.imwrite(output_path, rgba)
                
                print("[SUCCESS] Segmentation extraction complete", file=sys.stderr)
                return {"success": True, "output": output_path, "method": "mediapipe_segmentation"}
            else:
                # No segmentation available, try pose-based
                return self._extract_with_pose(image, output_path)
                
        except Exception as e:
            print(f"[WARNING] Segmentation failed: {e}", file=sys.stderr)
            raise

    def _extract_with_pose(self, image, output_path):
        """Method 3: Pose-based extraction with large padding"""
        try:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = self.pose.process(rgb)
            
            if not result.pose_landmarks:
                return self._extract_basic_from_array(image, output_path)
            
            h, w, _ = image.shape
            lm = result.pose_landmarks.landmark
            
            def pt(p):
                return int(p.x * w), int(p.y * h)
            
            # Get body landmarks with LARGE padding
            ls = pt(lm[self.mp_pose.PoseLandmark.LEFT_SHOULDER])
            rs = pt(lm[self.mp_pose.PoseLandmark.RIGHT_SHOULDER])
            lh = pt(lm[self.mp_pose.PoseLandmark.LEFT_HIP])
            rh = pt(lm[self.mp_pose.PoseLandmark.RIGHT_HIP])
            
            # INCREASED PADDING (80px instead of 30px)
            padding = 80
            x1 = max(0, min(ls[0], rs[0], lh[0], rh[0]) - padding)
            x2 = min(w, max(ls[0], rs[0], lh[0], rh[0]) + padding)
            y1 = max(0, min(ls[1], rs[1]) - padding)
            y2 = min(h, max(lh[1], rh[1]) + padding)
            
            # Extract ROI
            roi = image[y1:y2, x1:x2]
            
            # Create mask
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Refine
            kernel = np.ones((7, 7), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            
            # Apply
            b, g, r = cv2.split(roi)
            rgba = cv2.merge([b, g, r, mask])
            
            # Create full-size result
            full_result = np.zeros((h, w, 4), dtype=np.uint8)
            full_result[y1:y2, x1:x2] = rgba
            
            cv2.imwrite(output_path, full_result)
            
            print("[SUCCESS] Pose-based extraction complete", file=sys.stderr)
            return {"success": True, "output": output_path, "method": "mediapipe_pose"}
            
        except Exception as e:
            print(f"[WARNING] Pose extraction failed: {e}", file=sys.stderr)
            raise

    def _extract_basic(self, input_path, output_path):
        """Method 4: Basic color-based extraction"""
        image = cv2.imread(input_path)
        if image is None:
            raise ValueError("Failed to load image")
        
        return self._extract_basic_from_array(image, output_path)

    def _extract_basic_from_array(self, image, output_path):
        """Basic extraction from image array"""
        try:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Detect background
            background_mask = cv2.inRange(hsv, (0, 0, 200), (180, 40, 255))
            clothing_mask = cv2.bitwise_not(background_mask)
            
            # Clean up
            kernel = np.ones((7, 7), np.uint8)
            clothing_mask = cv2.morphologyEx(clothing_mask, cv2.MORPH_CLOSE, kernel)
            clothing_mask = cv2.morphologyEx(clothing_mask, cv2.MORPH_OPEN, kernel)
            
            # Apply
            b, g, r = cv2.split(image)
            rgba = cv2.merge([b, g, r, clothing_mask])
            
            cv2.imwrite(output_path, rgba)
            
            print("[SUCCESS] Basic extraction complete", file=sys.stderr)
            return {"success": True, "output": output_path, "method": "basic_color"}
            
        except Exception as e:
            print(f"[ERROR] Basic extraction failed: {e}", file=sys.stderr)
            raise


def main():
    """Command-line interface"""
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python clothing_extractor.py <input_image> <output_image>"
        }))
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not Path(input_path).exists():
        print(json.dumps({
            "success": False,
            "error": f"Input file not found: {input_path}"
        }))
        sys.exit(1)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    extractor = HybridClothingExtractor()
    result = extractor.extract(input_path, output_path)
    
    print(json.dumps(result))


if __name__ == "__main__":
    main()
