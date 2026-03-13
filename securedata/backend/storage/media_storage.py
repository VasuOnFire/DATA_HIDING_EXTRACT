import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
from config import settings

# File type configurations
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'}
ALLOWED_AUDIO_TYPES = {'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg'}
ALLOWED_VIDEO_TYPES = {'video/mp4', 'video/avi', 'video/mov', 'video/webm'}
ALLOWED_DOCUMENT_TYPES = {'application/pdf', 'text/plain'}

MAX_FILE_SIZE = settings.MAX_FILE_SIZE  # 100MB

def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename with preserved extension"""
    ext = Path(original_filename).suffix
    unique_id = str(uuid.uuid4())
    return f"{unique_id}{ext}"

def validate_file_type(content_type: str, allowed_types: set) -> bool:
    """Validate file content type"""
    return content_type in allowed_types

def validate_file_size(size: int) -> bool:
    """Validate file size"""
    return size <= MAX_FILE_SIZE

async def save_upload_file(upload_file: UploadFile, subfolder: str = "media") -> str:
    """
    Save an uploaded file to the storage directory
    Returns: Path to saved file
    """
    # Create directory if it doesn't exist
    upload_dir = Path(settings.UPLOAD_DIR) / subfolder
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    unique_filename = generate_unique_filename(upload_file.filename)
    file_path = upload_dir / unique_filename
    
    # Save file
    content = await upload_file.read()
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    await upload_file.seek(0)  # Reset file pointer
    
    return str(file_path)

async def save_profile_image(upload_file: UploadFile) -> str:
    """Save a profile image"""
    # Validate file type
    if not validate_file_type(upload_file.content_type, ALLOWED_IMAGE_TYPES):
        raise ValueError("Invalid image format. Allowed: JPEG, PNG, GIF, WebP, BMP")
    
    # Read and check size
    content = await upload_file.read()
    if not validate_file_size(len(content)):
        raise ValueError(f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024)}MB")
    
    await upload_file.seek(0)
    
    # Save file
    file_path = await save_upload_file(upload_file, "profiles")
    return file_path

async def save_chat_media(upload_file: UploadFile) -> tuple:
    """
    Save chat media file (image, audio, video)
    Returns: (file_path, media_type)
    """
    content = await upload_file.read()
    
    if not validate_file_size(len(content)):
        raise ValueError(f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024)}MB")
    
    await upload_file.seek(0)
    
    # Determine media type
    content_type = upload_file.content_type
    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = "image"
    elif content_type in ALLOWED_AUDIO_TYPES:
        media_type = "audio"
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = "video"
    else:
        raise ValueError("Unsupported file type for chat media")
    
    # Save file
    file_path = await save_upload_file(upload_file, f"chat/{media_type}")
    
    return file_path, media_type

async def save_stego_file(file_bytes: bytes, original_filename: str, subfolder: str = "stego") -> str:
    """Save a steganography output file"""
    upload_dir = Path(settings.UPLOAD_DIR) / subfolder
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    unique_filename = generate_unique_filename(original_filename)
    file_path = upload_dir / unique_filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_bytes)
    
    return str(file_path)

def get_file_url(file_path: str) -> str:
    """Convert file path to accessible URL"""
    # In production, this would return a CDN or storage URL
    # For now, return a relative path that can be served
    # Handle both relative and absolute paths
    path = Path(file_path)
    
    # Extract the relative path from 'uploads' folder
    parts = path.parts
    if 'uploads' in parts:
        uploads_index = parts.index('uploads')
        relative_parts = parts[uploads_index + 1:]
        return f"/uploads/{'/'.join(relative_parts)}"
    
    # If already a URL-like path, ensure it starts with /
    if file_path.startswith('uploads/'):
        return f"/{file_path}"
    
    return file_path

def delete_file(file_path: str) -> bool:
    """Delete a file from storage"""
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
        return False
    except Exception:
        return False

def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    try:
        return Path(file_path).stat().st_size
    except Exception:
        return 0

def get_media_duration(file_path: str) -> Optional[float]:
    """Get duration of audio/video file in seconds"""
    try:
        ext = Path(file_path).suffix.lower()
        
        if ext in ['.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mov']:
            # Use ffprobe or similar in production
            # For now, return None
            return None
    except Exception:
        pass
    return None
