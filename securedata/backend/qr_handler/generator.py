"""
QR Code Generator Module
Generates high-quality QR codes with encrypted data
"""

import os
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import RadialGradiantColorMask
from PIL import Image
import base64
from io import BytesIO


def generate_qr_code(data: str, box_size: int = 10, border: int = 4, 
                     error_correction=qrcode.constants.ERROR_CORRECT_H) -> Image.Image:
    """
    Generate a high-quality QR code image
    
    Args:
        data: String data to encode
        box_size: Size of each box in pixels
        border: Border width in boxes
        error_correction: Error correction level
        
    Returns:
        PIL Image object
    """
    qr = qrcode.QRCode(
        version=None,  # Auto-fit
        error_correction=error_correction,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    # Create image with custom styling
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=RadialGradiantColorMask(
            center_color=(25, 118, 210),  # Primary blue
            edge_color=(13, 71, 161)      # Darker blue
        )
    )
    
    return img


def qr_to_base64(img: Image.Image, format: str = "PNG") -> str:
    """
    Convert QR image to base64 string
    
    Args:
        img: PIL Image object
        format: Image format (PNG, JPEG)
        
    Returns:
        Base64 encoded image string
    """
    buffered = BytesIO()
    img.save(buffered, format=format)
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
    return f"data:image/{format.lower()};base64,{img_str}"


def save_qr_image(img: Image.Image, filepath: str, format: str = "PNG") -> str:
    """
    Save QR image to file
    
    Args:
        img: PIL Image object
        filepath: Output file path
        format: Image format
        
    Returns:
        Absolute file path
    """
    # Ensure directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Save image
    img.save(filepath, format=format)
    return filepath


def generate_secure_qr(encrypted_payload: str, output_path: str = None) -> dict:
    """
    Generate a complete secure QR code with encrypted data
    
    Args:
        encrypted_payload: JSON string of encrypted data
        output_path: Optional path to save file
        
    Returns:
        dict with base64 image and file path
    """
    # Generate QR
    qr_img = generate_qr_code(encrypted_payload)
    
    # Convert to base64 for immediate display
    base64_img = qr_to_base64(qr_img)
    
    result = {
        "base64_image": base64_img,
        "width": qr_img.size[0],
        "height": qr_img.size[1]
    }
    
    # Save to file if path provided
    if output_path:
        saved_path = save_qr_image(qr_img, output_path)
        result["file_path"] = saved_path
    
    return result
