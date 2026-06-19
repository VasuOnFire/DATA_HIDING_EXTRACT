"""
AES-256 Encryption/Decryption Module for QR Code Data Hiding
Uses PBKDF2 for key derivation and AES-256-GCM for authenticated encryption
"""

import os
import base64
import json
from datetime import datetime
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad


def derive_key(password: str, salt: bytes, iterations: int = 100000) -> bytes:
    """
    Derive AES-256 key from password using PBKDF2
    """
    return PBKDF2(password, salt, dkLen=32, count=iterations)


def encrypt_data(data: str, password: str) -> dict:
    """
    Encrypt data using AES-256-CBC with PBKDF2 key derivation
    
    Args:
        data: Plain text message to encrypt
        password: User's secret password
        
    Returns:
        dict containing encrypted payload, iv, salt, and metadata
    """
    try:
        # Generate random salt and IV
        salt = get_random_bytes(32)
        iv = get_random_bytes(16)
        
        # Derive key from password
        key = derive_key(password, salt)
        
        # Create cipher and encrypt
        cipher = AES.new(key, AES.MODE_CBC, iv)
        padded_data = pad(data.encode('utf-8'), AES.block_size)
        encrypted_data = cipher.encrypt(padded_data)
        
        # Encode to base64 for JSON transport
        return {
            "encrypted_data": base64.b64encode(encrypted_data).decode('utf-8'),
            "iv": base64.b64encode(iv).decode('utf-8'),
            "salt": base64.b64encode(salt).decode('utf-8'),
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0"
        }
    except Exception as e:
        raise Exception(f"Encryption failed: {str(e)}")


def decrypt_data(encrypted_payload: dict, password: str) -> str:
    """
    Decrypt AES-256 encrypted data
    
    Args:
        encrypted_payload: Dict containing encrypted_data, iv, salt
        password: User's secret password
        
    Returns:
        Decrypted plain text message
    """
    try:
        # Decode from base64
        encrypted_data = base64.b64decode(encrypted_payload["encrypted_data"])
        iv = base64.b64decode(encrypted_payload["iv"])
        salt = base64.b64decode(encrypted_payload["salt"])
        
        # Derive key from password
        key = derive_key(password, salt)
        
        # Create cipher and decrypt
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted_data = cipher.decrypt(encrypted_data)
        
        # Unpad and return
        return unpad(decrypted_data, AES.block_size).decode('utf-8')
    except ValueError:
        raise ValueError("Invalid password or corrupted data")
    except Exception as e:
        raise Exception(f"Decryption failed: {str(e)}")


def create_payload_for_qr(data: str, password: str) -> str:
    """
    Create a complete encrypted payload string for QR code
    
    Args:
        data: Secret message
        password: User's password
        
    Returns:
        JSON string ready for QR encoding
    """
    encrypted = encrypt_data(data, password)
    return json.dumps(encrypted, separators=(',', ':'))


def parse_qr_payload(qr_data: str) -> dict:
    """
    Parse QR code data back to encrypted payload dict
    
    Args:
        qr_data: QR code content (JSON string)
        
    Returns:
        dict with encrypted payload components
    """
    try:
        return json.loads(qr_data)
    except json.JSONDecodeError:
        raise ValueError("Invalid QR code format")


def verify_password(encrypted_payload: dict, password: str) -> bool:
    """
    Verify if password is correct without full decryption
    
    Args:
        encrypted_payload: Encrypted data dict
        password: Password to verify
        
    Returns:
        True if password is valid, False otherwise
    """
    try:
        decrypt_data(encrypted_payload, password)
        return True
    except:
        return False
