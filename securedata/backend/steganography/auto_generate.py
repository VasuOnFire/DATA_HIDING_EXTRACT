import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import io
import wave
import struct
import random
import math
from steganography.embed import embed_data_lsb, text_to_binary, encrypt_with_password, STEGO_HEADER

# Image generation themes and configurations
IMAGE_THEMES = {
    'animals': ['forest', 'safari', 'ocean', 'mountain'],
    'village': ['countryside', 'fields', 'cottages', 'farm'],
    'forest': ['jungle', 'woods', 'trees', 'nature'],
    'city': ['skyline', 'streets', 'buildings', 'urban'],
    'ocean': ['sea', 'waves', 'beach', 'coastal'],
    'nature': ['landscape', 'mountains', 'rivers', 'valley']
}

def create_gradient_background(width, height, colors):
    """Create a smooth gradient background"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # Create vertical gradient
    for y in range(height):
        ratio = y / height
        r = int(colors[0][0] * (1 - ratio) + colors[1][0] * ratio)
        g = int(colors[0][1] * (1 - ratio) + colors[1][1] * ratio)
        b = int(colors[0][2] * (1 - ratio) + colors[1][2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    return img

def add_noise_texture(image_array, intensity=0.02):
    """Add subtle texture to image"""
    noise = np.random.normal(0, intensity * 255, image_array.shape)
    result = image_array.astype(float) + noise
    return np.clip(result, 0, 255).astype(np.uint8)

def add_vignette(img, intensity=0.3):
    """Add vignette effect for professional look"""
    width, height = img.size
    vignette = Image.new('L', (width, height), 255)
    draw = ImageDraw.Draw(vignette)
    
    # Draw radial gradient from center
    for i in range(min(width, height) // 2, 0, -1):
        alpha = int(255 * (1 - intensity * (1 - i / (min(width, height) // 2))))
        draw.ellipse([width//2 - i, height//2 - i, width//2 + i, height//2 + i], 
                     fill=alpha)
    
    img_array = np.array(img)
    vignette_array = np.array(vignette) / 255.0
    
    # Apply vignette to each channel
    for c in range(3):
        img_array[:, :, c] = (img_array[:, :, c] * vignette_array).astype(np.uint8)
    
    return Image.fromarray(img_array)

def add_shapes(draw, width, height, theme):
    """Add theme-appropriate shapes/patterns with more detail"""
    if theme == 'animals':
        # Create animal paw prints and fur patterns
        # Background spots
        for _ in range(30):
            x = random.randint(0, width)
            y = random.randint(0, height)
            size = random.randint(15, 50)
            color_variation = random.randint(-30, 30)
            base_color = (180 + color_variation, 140 + color_variation, 100 + color_variation)
            draw.ellipse([x, y, x + size, y + size], fill=base_color)
        
        # Paw prints
        for _ in range(8):
            x = random.randint(100, width - 150)
            y = random.randint(100, height - 150)
            scale = random.randint(30, 50)
            # Main pad
            pad_color = (80, 60, 50)
            draw.ellipse([x, y, x + scale, y + scale*0.8], fill=pad_color)
            # Toes
            toe_size = scale * 0.35
            for i, offset in enumerate([(-0.4, -0.3), (0, -0.5), (0.4, -0.3)]):
                tx = x + scale * 0.5 + offset[0] * scale * 0.8
                ty = y + offset[1] * scale * 0.8
                draw.ellipse([tx, ty, tx + toe_size, ty + toe_size], fill=pad_color)
    
    elif theme == 'forest':
        # Ground/foliage at bottom
        for y_base in range(height - 150, height, 10):
            for x in range(0, width, 20):
                y_offset = random.randint(-20, 20)
                color = (random.randint(34, 80), random.randint(100, 150), random.randint(34, 70))
                draw.ellipse([x, y_base + y_offset, x + 30, y_base + y_offset + 20], fill=color)
        
        # Trees with trunks and foliage
        for _ in range(25):
            x = random.randint(50, width - 50)
            trunk_width = random.randint(8, 15)
            trunk_height = random.randint(150, 300)
            y_bottom = random.randint(height - 100, height)
            
            # Trunk
            trunk_color = (101, 67, 33)
            draw.rectangle([x, y_bottom - trunk_height, x + trunk_width, y_bottom], fill=trunk_color)
            
            # Tree crown (multiple overlapping circles for natural look)
            crown_color = (random.randint(34, 100), random.randint(120, 180), random.randint(34, 80))
            crown_size = random.randint(60, 100)
            for i in range(5):
                cx = x + random.randint(-crown_size//2, crown_size//2)
                cy = y_bottom - trunk_height + random.randint(-crown_size//3, crown_size//3)
                draw.ellipse([cx, cy, cx + crown_size, cy + crown_size], fill=crown_color)
    
    elif theme == 'city':
        # Sky gradient effect with buildings at different depths
        building_colors = [
            (60, 70, 90),    # Dark foreground
            (80, 90, 110),   # Mid
            (100, 110, 130)  # Background
        ]
        
        # Background buildings (smaller, lighter)
        for _ in range(10):
            x = random.randint(0, width - 40)
            w = random.randint(30, 60)
            h = random.randint(80, 200)
            y = height - h
            draw.rectangle([x, y, x + w, height], fill=building_colors[2])
        
        # Mid buildings
        for _ in range(8):
            x = random.randint(0, width - 60)
            w = random.randint(50, 100)
            h = random.randint(150, 350)
            y = height - h
            draw.rectangle([x, y, x + w, height], fill=building_colors[1])
            # Windows
            for wy in range(y + 15, height - 10, 25):
                for wx in range(x + 8, x + w - 8, 12):
                    if random.random() > 0.4:
                        draw.rectangle([wx, wy, wx + 6, wy + 14], fill=(255, 255, 180))
        
        # Foreground buildings (larger, darker)
        for _ in range(5):
            x = random.randint(0, width - 80)
            w = random.randint(70, 120)
            h = random.randint(200, 450)
            y = height - h
            draw.rectangle([x, y, x + w, height], fill=building_colors[0])
            # Windows
            for wy in range(y + 10, height - 10, 20):
                for wx in range(x + 10, x + w - 10, 15):
                    if random.random() > 0.3:
                        draw.rectangle([wx, wy, wx + 8, wy + 12], fill=(255, 240, 150))
    
    elif theme == 'ocean':
        # Create waves at different layers
        wave_colors = [
            (200, 230, 255),  # Light foam
            (150, 200, 255),  # Light blue
            (100, 170, 240),  # Mid blue
            (50, 130, 220),   # Deep blue
            (20, 100, 200)    # Deepest
        ]
        
        for layer, color in enumerate(wave_colors):
            y_offset = 80 + layer * 60
            amplitude = 20 + layer * 5
            
            for x in range(0, width + 50, 30):
                y = y_offset + math.sin(x / 80 + layer) * amplitude
                size = 40 + layer * 10
                draw.ellipse([x - size/2, y, x + size/2, y + size/3], fill=color)
                
        # Add some whitecaps/foam
        for _ in range(50):
            x = random.randint(0, width)
            y = random.randint(150, height - 50)
            size = random.randint(5, 15)
            draw.ellipse([x, y, x + size, y + size/2], fill=(255, 255, 255))
    
    elif theme == 'village':
        # Ground/hills
        for x in range(0, width, 40):
            y_base = height - random.randint(50, 120)
            for i in range(5):
                draw.ellipse([x + i*10, y_base, x + i*10 + 30, y_base + 20], 
                           fill=(139, 119, 101))
        
        # Houses
        for _ in range(12):
            x = random.randint(50, width - 120)
            house_width = random.randint(70, 110)
            house_height = random.randint(60, 90)
            y_base = random.randint(height - 180, height - 80)
            
            # House body
            wall_color = (random.randint(220, 245), random.randint(200, 230), random.randint(170, 210))
            draw.rectangle([x, y_base - house_height, x + house_width, y_base], fill=wall_color)
            
            # Roof
            roof_color = (random.randint(140, 180), random.randint(70, 110), random.randint(50, 90))
            roof_height = random.randint(25, 40)
            draw.polygon([
                (x - 10, y_base - house_height),
                (x + house_width // 2, y_base - house_height - roof_height),
                (x + house_width + 10, y_base - house_height)
            ], fill=roof_color)
            
            # Door
            door_width = house_width // 5
            door_height = house_height // 2
            draw.rectangle([x + house_width//2 - door_width//2, y_base - door_height, 
                          x + house_width//2 + door_width//2, y_base], 
                         fill=(101, 67, 33))
            
            # Windows
            for wx in [x + 15, x + house_width - 35]:
                draw.rectangle([wx, y_base - house_height + 15, wx + 20, y_base - house_height + 40], 
                             fill=(135, 206, 250))
    
    elif theme == 'nature':
        # Sun
        sun_x = width - 120
        sun_y = 100
        for r in range(50, 0, -5):
            intensity = 255 - (50 - r) * 3
            draw.ellipse([sun_x - r, sun_y - r, sun_x + r, sun_y + r], 
                        fill=(255, intensity, intensity // 2))
        
        # Mountains in background
        for _ in range(5):
            peak_x = random.randint(0, width)
            peak_y = random.randint(200, 350)
            base_width = random.randint(150, 300)
            mountain_color = (random.randint(100, 140), random.randint(110, 150), random.randint(130, 170))
            draw.polygon([
                (peak_x - base_width//2, height),
                (peak_x, peak_y),
                (peak_x + base_width//2, height)
            ], fill=mountain_color)
        
        # Grass/field at bottom
        for y in range(height - 100, height, 5):
            for x in range(0, width, 15):
                grass_height = random.randint(10, 25)
                grass_color = (random.randint(34, 100), random.randint(120, 200), random.randint(34, 80))
                draw.rectangle([x, y - grass_height, x + 3, y], fill=grass_color)
        
        # Flowers
        for _ in range(25):
            cx = random.randint(50, width - 50)
            cy = random.randint(height - 150, height - 30)
            
            # Stem
            draw.rectangle([cx - 2, cy - 30, cx + 2, cy], fill=(34, 139, 34))
            
            # Flower petals
            petal_color = random.choice([
                (255, 105, 180),  # Hot pink
                (255, 165, 0),    # Orange
                (255, 255, 0),    # Yellow
                (221, 160, 221),  # Plum
                (255, 192, 203)   # Pink
            ])
            
            for angle in range(0, 360, 45):
                rad = math.radians(angle)
                px = cx + int(15 * math.cos(rad))
                py = cy - 35 + int(15 * math.sin(rad))
                draw.ellipse([px - 8, py - 8, px + 8, py + 8], fill=petal_color)
            
            # Flower center
            draw.ellipse([cx - 6, cy - 41, cx + 6, cy - 29], fill=(139, 69, 19))

def generate_automated_image(secret_text, password, theme='nature', width=1024, height=1024):
    """
    Generate a themed cover image with embedded secret data
    """
    # Theme color schemes (top color, bottom color)
    theme_colors = {
        'animals': [(255, 200, 150), (200, 150, 100)],      # Warm savannah colors
        'village': [(255, 230, 200), (180, 160, 140)],      # Warm earth tones
        'forest': [(100, 150, 100), (34, 80, 34)],          # Green gradient
        'city': [(100, 120, 150), (40, 50, 70)],            # Cool blue-gray
        'ocean': [(150, 200, 255), (0, 80, 150)],          # Blue gradient
        'nature': [(200, 230, 255), (100, 180, 120)]        # Sky to grass
    }
    
    colors = theme_colors.get(theme, theme_colors['nature'])
    
    # Create gradient background
    img = create_gradient_background(width, height, colors)
    
    # Add theme-appropriate shapes
    draw = ImageDraw.Draw(img)
    add_shapes(draw, width, height, theme)
    
    # Convert to array for processing
    img_array = np.array(img)
    
    # Add subtle texture
    img_array = add_noise_texture(img_array, intensity=0.01)
    img = Image.fromarray(img_array)
    
    # Apply slight blur for natural look
    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    
    # Add vignette
    img = add_vignette(img, intensity=0.2)
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.1)
    
    # Convert back to array for embedding
    image_array = np.array(img)
    
    # Encrypt and embed data
    encrypted_payload = encrypt_with_password(secret_text.encode('utf-8'), password)
    import json
    payload_json = json.dumps(encrypted_payload)
    binary_data = text_to_binary(payload_json)
    
    # Add header and length
    header_binary = ''.join(format(byte, '08b') for byte in STEGO_HEADER)
    length_binary = format(len(binary_data), '032b')
    full_binary = header_binary + length_binary + binary_data
    
    # Check if image can hold the data
    max_bits = image_array.size
    if len(full_binary) > max_bits:
        raise ValueError(f"Secret message too long for this image. Max characters: ~{max_bits // 1600}")
    
    # Embed in LSB
    flat_array = image_array.flatten()
    for i, bit in enumerate(full_binary):
        flat_array[i] = (flat_array[i] & 0xFE) | int(bit)
    
    stego_array = flat_array.reshape(image_array.shape)
    stego_image = Image.fromarray(stego_array.astype(np.uint8))
    
    # Save to bytes
    img_byte_arr = io.BytesIO()
    stego_image.save(img_byte_arr, format='PNG', optimize=True)
    img_byte_arr.seek(0)
    
    return img_byte_arr.getvalue()

def generate_automated_audio(secret_text, password, duration=10, sample_rate=44100):
    """
    Generate cover audio with embedded secret data
    Duration in seconds
    """
    # Generate dynamic waveform
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples)
    
    # Create complex waveform
    frequency = 440  # Base frequency (A4)
    
    # Combine multiple waves for natural ambient sound
    wave1 = np.sin(2 * np.pi * frequency * t)
    wave2 = np.sin(2 * np.pi * (frequency * 1.5) * t) * 0.3
    wave3 = np.sin(2 * np.pi * (frequency * 0.5) * t) * 0.5
    
    # Add some noise for texture
    noise = np.random.normal(0, 0.1, num_samples)
    
    # Combine waves
    audio = wave1 + wave2 + wave3 + noise
    
    # Normalize
    audio = audio / np.max(np.abs(audio))
    
    # Convert to 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # Encrypt and prepare data
    encrypted_payload = encrypt_with_password(secret_text.encode('utf-8'), password)
    import json
    payload_json = json.dumps(encrypted_payload)
    binary_data = text_to_binary(payload_json)
    
    # Add header
    header_binary = ''.join(format(byte, '08b') for byte in STEGO_HEADER)
    length_binary = format(len(binary_data), '032b')
    full_binary = header_binary + length_binary + binary_data
    
    if len(full_binary) > len(audio_int16):
        raise ValueError("Secret text too long for generated audio")
    
    # Embed in LSB
    for i, bit in enumerate(full_binary):
        audio_int16[i] = (audio_int16[i] & 0xFFFE) | int(bit)
    
    # Create WAV file
    output = io.BytesIO()
    wav = wave.open(output, 'wb')
    wav.setnchannels(1)  # Mono
    wav.setsampwidth(2)  # 16-bit
    wav.setframerate(sample_rate)
    wav.writeframes(audio_int16.tobytes())
    wav.close()
    
    output.seek(0)
    return output.getvalue()

def generate_frames_for_video(width=1280, height=720, num_frames=300, fps=30):
    """Generate frames for cover video"""
    frames = []
    
    for frame_num in range(num_frames):
        # Create time-varying noise
        time_offset = frame_num / fps
        
        # Generate base pattern
        x = np.linspace(0, 4 * np.pi, width)
        y = np.linspace(0, 4 * np.pi, height)
        X, Y = np.meshgrid(x, y)
        
        # Animate the pattern
        pattern = (
            np.sin(X + time_offset * 0.5) * 0.5 +
            np.sin(Y + time_offset * 0.3) * 0.5 +
            np.sin(X + Y + time_offset) * 0.25
        )
        
        # Normalize
        pattern = (pattern - pattern.min()) / (pattern.max() - pattern.min()) * 255
        
        # Create RGB
        frame = np.stack([pattern, pattern * 0.8, pattern * 0.6], axis=2).astype(np.uint8)
        frames.append(frame)
    
    return frames

def generate_automated_video(secret_text, password, duration=10, fps=30, width=1280, height=720):
    """
    Generate cover video with embedded secret data (first frame only)
    """
    import cv2
    import tempfile
    import os
    
    num_frames = int(duration * fps)
    frames = generate_frames_for_video(width, height, num_frames, fps)
    
    # Encrypt data
    encrypted_payload = encrypt_with_password(secret_text.encode('utf-8'), password)
    import json
    payload_json = json.dumps(encrypted_payload)
    binary_data = text_to_binary(payload_json)
    
    # Add header
    header_binary = ''.join(format(byte, '08b') for byte in STEGO_HEADER)
    length_binary = format(len(binary_data), '032b')
    full_binary = header_binary + length_binary + binary_data
    
    # Embed in first frame only
    first_frame = frames[0].copy()
    flat_frame = first_frame.flatten()
    
    for i, bit in enumerate(full_binary):
        flat_frame[i] = (flat_frame[i] & 0xFE) | int(bit)
    
    frames[0] = flat_frame.reshape(first_frame.shape)
    
    # Create temporary video file
    temp_file = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    temp_path = temp_file.name
    temp_file.close()
    
    # Write video
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))
    
    for frame in frames:
        # Convert RGB to BGR for OpenCV
        bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        out.write(bgr_frame)
    
    out.release()
    
    # Read back as bytes
    with open(temp_path, 'rb') as f:
        video_bytes = f.read()
    
    # Clean up
    os.unlink(temp_path)
    
    return video_bytes

# Alias for easy access
generate_cover_image = generate_automated_image
generate_cover_audio = generate_automated_audio
generate_cover_video = generate_automated_video
