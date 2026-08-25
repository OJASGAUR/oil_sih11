"""
OpenCV-based oil spill detection on SAR imagery.
Detects dark patches (low backscatter regions) that indicate oil on the ocean surface.
"""
import cv2
import numpy as np
import base64
import os
import uuid
from pathlib import Path

# Directory to save generated mask images
MASKS_DIR = Path(__file__).parent.parent / "static" / "masks"
MASKS_DIR.mkdir(parents=True, exist_ok=True)


def process_sar_image(image_bytes: bytes) -> dict:
    """
    Process a SAR image to detect potential oil spill regions.
    
    Returns:
        dict with:
        - original_b64: base64 encoded original image
        - overlay_b64: base64 encoded image with spill overlay
        - mask_b64: base64 encoded binary mask
        - contours_count: number of dark regions found
        - total_dark_pixels: pixel count of detected spill area
        - coverage_percent: percentage of image covered by dark spots
        - mask_filename: saved filename for the mask
    """
    # Decode image from bytes
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"error": "Could not decode image"}
    
    h, w = img.shape[:2]
    total_pixels = h * w
    
    # Step 1: Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Step 2: SAR-specific speckle noise reduction
    # Bilateral filter preserves edges (spill boundaries) while smoothing speckle
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)
    # Additional median blur to further reduce salt-and-pepper speckle
    blurred = cv2.medianBlur(denoised, 7)
    
    # Step 3: Adaptive thresholding to find dark regions
    # Oil spills appear DARK on SAR because oil dampens surface roughness
    # We use Otsu's method which automatically finds the optimal threshold
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Step 4: Morphological operations to clean up noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    
    # Step 5: Find contours of dark regions
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter out very small contours (noise) — keep only significant dark patches
    min_area = total_pixels * 0.005  # At least 0.5% of the image
    significant_contours = [c for c in contours if cv2.contourArea(c) > min_area]
    
    # Step 6: Create the visual overlay
    overlay = img.copy()
    mask_colored = np.zeros_like(img)
    
    for contour in significant_contours:
        # Fill the detected region with semi-transparent red
        cv2.drawContours(mask_colored, [contour], -1, (0, 0, 255), -1)  # Red fill
        cv2.drawContours(overlay, [contour], -1, (0, 255, 255), 2)       # Cyan border
    
    # Blend the red fill with the original image (semi-transparent overlay)
    alpha = 0.4
    overlay = cv2.addWeighted(overlay, 1.0, mask_colored, alpha, 0)
    
    # Add label text
    cv2.putText(overlay, "OIL SPILL DETECTION OVERLAY", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    
    if significant_contours:
        cv2.putText(overlay, f"Regions Detected: {len(significant_contours)}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    else:
        cv2.putText(overlay, "No significant dark regions detected", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    
    # Step 7: Calculate statistics
    dark_pixels = int(np.sum(binary > 0))
    coverage = round((dark_pixels / total_pixels) * 100, 2)
    
    # Step 8: Encode images to base64 for API response
    _, orig_buf = cv2.imencode('.png', img)
    _, overlay_buf = cv2.imencode('.png', overlay)
    _, mask_buf = cv2.imencode('.png', binary)
    
    original_b64 = base64.b64encode(orig_buf).decode('utf-8')
    overlay_b64 = base64.b64encode(overlay_buf).decode('utf-8')
    mask_b64 = base64.b64encode(mask_buf).decode('utf-8')
    
    # Step 9: Save the mask to disk so the frontend can also fetch it via URL
    mask_id = str(uuid.uuid4())[:8]
    mask_filename = f"mask_{mask_id}.png"
    overlay_filename = f"overlay_{mask_id}.png"
    
    cv2.imwrite(str(MASKS_DIR / mask_filename), binary)
    cv2.imwrite(str(MASKS_DIR / overlay_filename), overlay)
    
    return {
        "original_b64": original_b64,
        "overlay_b64": overlay_b64,
        "mask_b64": mask_b64,
        "contours_count": len(significant_contours),
        "total_dark_pixels": dark_pixels,
        "coverage_percent": coverage,
        "image_width": w,
        "image_height": h,
        "mask_filename": mask_filename,
        "overlay_filename": overlay_filename,
    }
