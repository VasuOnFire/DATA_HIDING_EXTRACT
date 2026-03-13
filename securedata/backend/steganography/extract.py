import numpy as np
from PIL import Image
import cv2
from steganography.embed import extract_data_lsb, binary_to_text, STEGO_HEADER, decrypt_with_password

def extract_from_image_file(image_file, password):
    """
    Extract and decrypt data from a stego image file
    Returns: The decrypted secret message
    """
    try:
        # Load image
        if isinstance(image_file, str):
            image = Image.open(image_file)
        else:
            image = Image.open(image_file)
        
        # Convert to numpy array
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image_array = np.array(image)
        
        # Extract binary data
        binary_data = extract_data_lsb(image_array)
        
        # Convert binary to text
        import json
        payload_json = binary_to_text(binary_data)
        encrypted_payload = json.loads(payload_json)
        
        # Decrypt
        decrypted_data = decrypt_with_password(encrypted_payload, password)
        
        return {
            'success': True,
            'message': decrypted_data.decode('utf-8'),
            'filename': getattr(image_file, 'filename', 'unknown')
        }
    
    except ValueError as e:
        return {
            'success': False,
            'error': str(e),
            'message': None
        }
    except Exception as e:
        return {
            'success': False,
            'error': f"Extraction failed: {str(e)}",
            'message': None
        }

def extract_from_audio_file(audio_file, password):
    """
    Extract and decrypt data from a stego audio file
    Returns: The decrypted secret message
    """
    try:
        from steganography.embed import extract_from_audio
        
        message = extract_from_audio(audio_file, password)
        
        return {
            'success': True,
            'message': message,
            'filename': getattr(audio_file, 'filename', 'unknown')
        }
    
    except ValueError as e:
        return {
            'success': False,
            'error': str(e),
            'message': None
        }
    except Exception as e:
        return {
            'success': False,
            'error': f"Extraction failed: {str(e)}",
            'message': None
        }

def verify_stego_file(file_path):
    """
    Check if a file contains steganographic data
    Returns: True if valid stego file, False otherwise
    """
    try:
        # Check file extension
        if file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
            # Image file
            image = Image.open(file_path)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image_array = np.array(image)
            flat_array = image_array.flatten()
            
            # Check header
            header_bits = ''.join(str(flat_array[i] & 1) for i in range(104))
            header_bytes = bytes([int(header_bits[i:i+8], 2) for i in range(0, 104, 8)])
            return header_bytes == STEGO_HEADER
            
        elif file_path.lower().endswith('.wav'):
            # Audio file
            import wave
            import struct
            
            wav = wave.open(file_path, 'rb')
            params = wav.getparams()
            frames = wav.readframes(min(200, params.nframes))
            wav.close()
            
            if params.sampwidth == 1:
                samples = list(frames)
            elif params.sampwidth == 2:
                fmt = '<h' if params.nchannels == 1 else '<hh'
                sample_count = len(frames) // (params.sampwidth * params.nchannels)
                samples = list(struct.unpack(fmt * sample_count, frames[:sample_count * params.sampwidth * params.nchannels]))
            else:
                return False
            
            header_bits = ''.join(str(samples[i] & 1) for i in range(104))
            header_bytes = bytes([int(header_bits[i:i+8], 2) for i in range(0, 104, 8)])
            return header_bytes == STEGO_HEADER
        
        return False
    except Exception:
        return False
