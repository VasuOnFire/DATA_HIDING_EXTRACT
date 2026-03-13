import numpy as np
from PIL import Image
import cv2
import io
import base64
from Crypto.Random import get_random_bytes
from encryption.hybrid_encryption import encrypt_with_password, decrypt_with_password

# Magic header to identify stego files
STEGO_HEADER = b'SECUREDATA_v1'

def text_to_binary(text):
    """Convert text to binary string"""
    binary = ''.join(format(ord(char), '08b') for char in text)
    return binary

def binary_to_text(binary):
    """Convert binary string to text"""
    text = ''
    for i in range(0, len(binary), 8):
        byte = binary[i:i+8]
        if len(byte) == 8:
            text += chr(int(byte, 2))
    return text

def embed_data_lsb(image_array, binary_data):
    """Embed binary data into image using LSB steganography"""
    # Handle RGBA (4 channels) - convert to RGB
    if len(image_array.shape) == 3 and image_array.shape[2] == 4:
        # Drop the alpha channel
        image_array = image_array[:, :, :3]
    
    flat_array = image_array.flatten()
    
    # Add header and length info
    header_binary = ''.join(format(byte, '08b') for byte in STEGO_HEADER)
    length_binary = format(len(binary_data), '032b')
    full_binary = header_binary + length_binary + binary_data
    
    if len(full_binary) > len(flat_array):
        raise ValueError("Data too large for this image")
    
    # Embed data
    for i, bit in enumerate(full_binary):
        flat_array[i] = (flat_array[i] & 0xFE) | int(bit)
    
    return flat_array.reshape(image_array.shape)

def extract_data_lsb(image_array):
    """Extract binary data from image using LSB steganography"""
    flat_array = image_array.flatten()
    
    # Extract header (13 bytes = 104 bits)
    header_bits = ''
    for i in range(104):
        header_bits += str(flat_array[i] & 1)
    
    header_bytes = bytes([int(header_bits[i:i+8], 2) for i in range(0, 104, 8)])
    
    if header_bytes != STEGO_HEADER:
        raise ValueError("No valid steganographic data found")
    
    # Extract length (4 bytes = 32 bits)
    length_bits = ''
    for i in range(104, 136):
        length_bits += str(flat_array[i] & 1)
    
    data_length = int(length_bits, 2)
    
    # Extract data
    data_bits = ''
    for i in range(136, 136 + data_length):
        data_bits += str(flat_array[i] & 1)
    
    return data_bits

def embed_in_image(image_file, secret_text, password):
    """
    Hide encrypted secret text inside an image
    Returns: stego image bytes
    """
    # Load image
    if isinstance(image_file, str):
        image = Image.open(image_file)
    else:
        image = Image.open(image_file)
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    image_array = np.array(image)
    
    # Encrypt the secret text
    encrypted_payload = encrypt_with_password(secret_text.encode('utf-8'), password)
    
    # Convert payload to JSON string then binary
    import json
    payload_json = json.dumps(encrypted_payload)
    binary_data = text_to_binary(payload_json)
    
    # Embed in image
    stego_array = embed_data_lsb(image_array, binary_data)
    stego_image = Image.fromarray(stego_array.astype(np.uint8))
    
    # Save to bytes
    img_byte_arr = io.BytesIO()
    stego_image.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    return img_byte_arr.getvalue()

def extract_from_image(image_file, password):
    """
    Extract and decrypt secret text from stego image
    Returns: decrypted secret text
    """
    # Load image
    if isinstance(image_file, str):
        image = Image.open(image_file)
    else:
        image = Image.open(image_file)
    
    image_array = np.array(image)
    
    # Extract binary data
    binary_data = extract_data_lsb(image_array)
    
    # Convert to text
    payload_json = binary_to_text(binary_data)
    
    # Parse JSON
    import json
    encrypted_payload = json.loads(payload_json)
    
    # Decrypt
    decrypted_data = decrypt_with_password(encrypted_payload, password)
    
    return decrypted_data.decode('utf-8')

def embed_in_audio(audio_file, secret_text, password):
    """
    Hide encrypted secret text inside WAV audio
    Returns: stego audio bytes
    """
    import wave
    import struct
    
    # Read audio file
    if isinstance(audio_file, str):
        wav = wave.open(audio_file, 'rb')
    else:
        wav = wave.open(audio_file, 'rb')
    
    params = wav.getparams()
    frames = wav.readframes(params.nframes)
    wav.close()
    
    # Convert frames to list of integers
    if params.sampwidth == 1:
        samples = list(frames)
    elif params.sampwidth == 2:
        fmt = '<h' if params.nchannels == 1 else '<hh'
        samples = list(struct.unpack(fmt * params.nframes, frames))
    else:
        raise ValueError("Unsupported sample width")
    
    # Encrypt data
    encrypted_payload = encrypt_with_password(secret_text.encode('utf-8'), password)
    import json
    payload_json = json.dumps(encrypted_payload)
    binary_data = text_to_binary(payload_json)
    
    # Add header
    header_binary = ''.join(format(byte, '08b') for byte in STEGO_HEADER)
    length_binary = format(len(binary_data), '032b')
    full_binary = header_binary + length_binary + binary_data
    
    if len(full_binary) > len(samples):
        raise ValueError("Data too large for this audio file")
    
    # Embed in LSB of samples
    for i, bit in enumerate(full_binary):
        if params.sampwidth == 1:
            samples[i] = (samples[i] & 0xFE) | int(bit)
        else:
            samples[i] = (samples[i] & 0xFFFE) | int(bit)
    
    # Create output
    output = io.BytesIO()
    out_wav = wave.open(output, 'wb')
    out_wav.setparams(params)
    
    if params.sampwidth == 1:
        out_wav.writeframes(bytes(samples))
    else:
        fmt = '<h' if params.nchannels == 1 else '<hh'
        out_wav.writeframes(struct.pack(fmt * len(samples), *samples))
    
    out_wav.close()
    output.seek(0)
    
    return output.getvalue()

def extract_from_audio(audio_file, password):
    """
    Extract and decrypt secret text from stego audio
    Returns: decrypted secret text
    """
    import wave
    import struct
    
    # Read audio file
    if isinstance(audio_file, str):
        wav = wave.open(audio_file, 'rb')
    else:
        wav = wave.open(audio_file, 'rb')
    
    params = wav.getparams()
    frames = wav.readframes(params.nframes)
    wav.close()
    
    # Convert frames to list of integers
    if params.sampwidth == 1:
        samples = list(frames)
    elif params.sampwidth == 2:
        fmt = '<h' if params.nchannels == 1 else '<hh'
        samples = list(struct.unpack(fmt * params.nframes, frames))
    else:
        raise ValueError("Unsupported sample width")
    
    # Extract header
    header_bits = ''
    for i in range(104):
        if params.sampwidth == 1:
            header_bits += str(samples[i] & 1)
        else:
            header_bits += str(samples[i] & 1)
    
    header_bytes = bytes([int(header_bits[i:i+8], 2) for i in range(0, 104, 8)])
    
    if header_bytes != STEGO_HEADER:
        raise ValueError("No valid steganographic data found")
    
    # Extract length
    length_bits = ''
    for i in range(104, 136):
        if params.sampwidth == 1:
            length_bits += str(samples[i] & 1)
        else:
            length_bits += str(samples[i] & 1)
    
    data_length = int(length_bits, 2)
    
    # Extract data
    data_bits = ''
    for i in range(136, 136 + data_length):
        if params.sampwidth == 1:
            data_bits += str(samples[i] & 1)
        else:
            data_bits += str(samples[i] & 1)
    
    # Convert and decrypt
    import json
    payload_json = binary_to_text(data_bits)
    encrypted_payload = json.loads(payload_json)
    decrypted_data = decrypt_with_password(encrypted_payload, password)
    
    return decrypted_data.decode('utf-8')

def embed_in_video(video_file, secret_text, password):
    """
    Hide encrypted secret text inside video (first frame only)
    Returns: stego video bytes
    """
    import cv2
    import tempfile
    import os
    
    input_tmp_path = None
    
    # Read video
    if isinstance(video_file, str):
        cap = cv2.VideoCapture(video_file)
    else:
        # Save to temp file first
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            tmp.write(video_file.read())
            input_tmp_path = tmp.name
        cap = cv2.VideoCapture(input_tmp_path)
    
    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Read all frames
    frames = []
    for _ in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()
    
    # Clean up temp input file
    if input_tmp_path and os.path.exists(input_tmp_path):
        os.unlink(input_tmp_path)
    
    if not frames:
        raise ValueError("Could not read video frames")
    
    # Embed data in first frame
    first_frame = frames[0]
    frame_array = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)
    
    # Encrypt data
    encrypted_payload = encrypt_with_password(secret_text.encode('utf-8'), password)
    import json
    payload_json = json.dumps(encrypted_payload)
    binary_data = text_to_binary(payload_json)
    
    # Add header
    header_binary = ''.join(format(byte, '08b') for byte in STEGO_HEADER)
    length_binary = format(len(binary_data), '032b')
    full_binary = header_binary + length_binary + binary_data
    
    if len(full_binary) > frame_array.size:
        raise ValueError("Secret text too long for video frame")
    
    # Embed in first frame
    flat_frame = frame_array.flatten()
    for i, bit in enumerate(full_binary):
        flat_frame[i] = (flat_frame[i] & 0xFE) | int(bit)
    
    frames[0] = flat_frame.reshape(frame_array.shape)
    
    # Create temporary video file for output
    temp_file = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    output_path = temp_file.name
    temp_file.close()
    
    # Write video
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    for frame in frames:
        # Convert RGB back to BGR for OpenCV
        bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        out.write(bgr_frame)
    
    out.release()
    
    # Read back as bytes
    with open(output_path, 'rb') as f:
        video_bytes = f.read()
    
    # Clean up output temp file
    os.unlink(output_path)
    
    return video_bytes

def extract_from_video(video_file, password):
    """
    Extract and decrypt secret text from stego video (first frame only)
    Returns: decrypted secret text
    """
    import cv2
    import tempfile
    import os
    
    # Read video
    if isinstance(video_file, str):
        cap = cv2.VideoCapture(video_file)
    else:
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            tmp.write(video_file.read())
            tmp_path = tmp.name
        cap = cv2.VideoCapture(tmp_path)
    
    # Read first frame
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise ValueError("Could not read video frame")
    
    # Convert to RGB
    frame_array = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Extract binary data
    binary_data = extract_data_lsb(frame_array)
    
    # Convert to text
    payload_json = binary_to_text(binary_data)
    
    # Parse JSON
    import json
    encrypted_payload = json.loads(payload_json)
    
    # Decrypt
    decrypted_data = decrypt_with_password(encrypted_payload, password)
    
    # Clean up temp file if created
    if isinstance(video_file, io.BytesIO):
        os.unlink(tmp_path)
    
    return decrypted_data.decode('utf-8')

def calculate_psnr(original, stego):
    """Calculate Peak Signal-to-Noise Ratio"""
    mse = np.mean((original.astype(float) - stego.astype(float)) ** 2)
    if mse == 0:
        return float('inf')
    max_pixel = 255.0
    psnr = 20 * np.log10(max_pixel / np.sqrt(mse))
    return psnr

def calculate_ssim(original, stego):
    """Calculate Structural Similarity Index"""
    from skimage.metrics import structural_similarity as ssim
    if len(original.shape) == 3:
        return ssim(original, stego, multichannel=True, channel_axis=2, data_range=255)
    return ssim(original, stego, data_range=255)
