"""
QR Code Reader Module
Reads and decodes QR codes from images using OpenCV's QRCodeDetector
"""

import cv2
import numpy as np
from PIL import Image
import base64
from io import BytesIO


def decode_qr_from_cv_image(img) -> str:
    """
    Internal helper: Decode QR from OpenCV image using built-in QRCodeDetector
    
    Args:
        img: OpenCV image (BGR format)
        
    Returns:
        Decoded QR content as string
    """
    # Use OpenCV's built-in QRCodeDetector (no external libs needed)
    detector = cv2.QRCodeDetector()
    
    # Detect and decode
    data, bbox, _ = detector.detectAndDecode(img)
    
    if data:
        return data
    
    # Try with grayscale if color failed
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        data, _, _ = detector.detectAndDecode(gray)
        if data:
            return data
    
    raise ValueError("No QR code found in image")


def decode_qr_from_image(image_path: str) -> str:
    """
    Decode QR code from image file path
    
    Args:
        image_path: Path to image file
        
    Returns:
        Decoded QR content as string
    """
    try:
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Could not read image file")
        
        return decode_qr_from_cv_image(img)
        
    except Exception as e:
        raise Exception(f"QR decoding failed: {str(e)}")


def decode_qr_from_base64(base64_string: str) -> str:
    """
    Decode QR code from base64 image string
    
    Args:
        base64_string: Base64 encoded image (with or without data URI prefix)
        
    Returns:
        Decoded QR content as string
    """
    try:
        # Remove data URI prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64 to image
        img_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode base64 image")
        
        return decode_qr_from_cv_image(img)
        
    except Exception as e:
        raise Exception(f"QR decoding failed: {str(e)}")


def decode_qr_from_upload(file_bytes: bytes) -> str:
    """
    Decode QR code from uploaded file bytes
    
    Args:
        file_bytes: Raw file bytes
        
    Returns:
        Decoded QR content as string
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode image from uploaded file")
        
        return decode_qr_from_cv_image(img)
        
    except Exception as e:
        raise Exception(f"QR decoding failed: {str(e)}")


def validate_qr_payload(qr_data: str) -> bool:
    """
    Validate if QR data appears to be a valid encrypted payload
    
    Args:
        qr_data: Raw QR code content
        
    Returns:
        True if valid format, False otherwise
    """
    import json
    try:
        data = json.loads(qr_data)
        required_fields = ["encrypted_data", "iv", "salt"]
        return all(field in data for field in required_fields)
    except:
        return False
