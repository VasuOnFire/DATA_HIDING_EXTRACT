from Crypto.PublicKey import RSA
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256
import base64
import os
from config import settings

def generate_rsa_keypair():
    """Generate RSA-2048 keypair"""
    key = RSA.generate(2048)
    private_key = key.export_key().decode('utf-8')
    public_key = key.publickey().export_key().decode('utf-8')
    return private_key, public_key

def generate_aes_key():
    """Generate random AES-256 key"""
    return get_random_bytes(32)  # 256 bits

def derive_key_from_password(password: str, salt: bytes = None) -> tuple:
    """Derive AES key from password using PBKDF2"""
    if salt is None:
        salt = get_random_bytes(16)
    key = PBKDF2(password, salt, dkLen=32, count=settings.PBKDF2_ITERATIONS, hmac_hash_module=SHA256)
    return key, salt

def encrypt_aes(data: bytes, key: bytes) -> tuple:
    """Encrypt data using AES-256-CBC"""
    iv = get_random_bytes(16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted_data = cipher.encrypt(pad(data, AES.block_size))
    return encrypted_data, iv

def decrypt_aes(encrypted_data: bytes, key: bytes, iv: bytes) -> bytes:
    """Decrypt data using AES-256-CBC"""
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted_data = unpad(cipher.decrypt(encrypted_data), AES.block_size)
    return decrypted_data

def encrypt_rsa(data: bytes, public_key_pem: str) -> bytes:
    """Encrypt data using RSA public key"""
    public_key = RSA.import_key(public_key_pem)
    cipher = PKCS1_OAEP.new(public_key)
    encrypted_data = cipher.encrypt(data)
    return encrypted_data

def decrypt_rsa(encrypted_data: bytes, private_key_pem: str) -> bytes:
    """Decrypt data using RSA private key"""
    private_key = RSA.import_key(private_key_pem)
    cipher = PKCS1_OAEP.new(private_key)
    decrypted_data = cipher.decrypt(encrypted_data)
    return decrypted_data

def hybrid_encrypt(data: bytes, public_key_pem: str) -> dict:
    """
    Hybrid encryption: AES-256 for data, RSA-2048 for AES key
    Returns encrypted payload with encrypted AES key and IV
    """
    # Generate random AES key
    aes_key = generate_aes_key()
    
    # Encrypt data with AES
    encrypted_data, iv = encrypt_aes(data, aes_key)
    
    # Encrypt AES key with RSA
    encrypted_aes_key = encrypt_rsa(aes_key, public_key_pem)
    
    return {
        'encrypted_data': base64.b64encode(encrypted_data).decode('utf-8'),
        'encrypted_aes_key': base64.b64encode(encrypted_aes_key).decode('utf-8'),
        'iv': base64.b64encode(iv).decode('utf-8')
    }

def hybrid_decrypt(encrypted_payload: dict, private_key_pem: str) -> bytes:
    """
    Hybrid decryption: RSA-2048 to get AES key, AES-256 to decrypt data
    """
    encrypted_data = base64.b64decode(encrypted_payload['encrypted_data'])
    encrypted_aes_key = base64.b64decode(encrypted_payload['encrypted_aes_key'])
    iv = base64.b64decode(encrypted_payload['iv'])
    
    # Decrypt AES key with RSA
    aes_key = decrypt_rsa(encrypted_aes_key, private_key_pem)
    
    # Decrypt data with AES
    decrypted_data = decrypt_aes(encrypted_data, aes_key, iv)
    
    return decrypted_data

def encrypt_with_password(data: bytes, password: str) -> dict:
    """
    Encrypt data using password-derived key
    Returns encrypted payload with salt and IV
    """
    # Derive key from password
    key, salt = derive_key_from_password(password)
    
    # Encrypt data
    encrypted_data, iv = encrypt_aes(data, key)
    
    return {
        'encrypted_data': base64.b64encode(encrypted_data).decode('utf-8'),
        'salt': base64.b64encode(salt).decode('utf-8'),
        'iv': base64.b64encode(iv).decode('utf-8')
    }

def decrypt_with_password(encrypted_payload: dict, password: str) -> bytes:
    """
    Decrypt data using password-derived key
    """
    encrypted_data = base64.b64decode(encrypted_payload['encrypted_data'])
    salt = base64.b64decode(encrypted_payload['salt'])
    iv = base64.b64decode(encrypted_payload['iv'])
    
    # Derive key from password
    key, _ = derive_key_from_password(password, salt)
    
    # Decrypt data
    decrypted_data = decrypt_aes(encrypted_data, key, iv)
    
    return decrypted_data

def encrypt_message_for_chat(message: str, recipient_public_key: str) -> dict:
    """Encrypt a chat message for a specific recipient"""
    message_bytes = message.encode('utf-8')
    return hybrid_encrypt(message_bytes, recipient_public_key)

def decrypt_chat_message(encrypted_payload: dict, recipient_private_key: str) -> str:
    """Decrypt a chat message"""
    decrypted_bytes = hybrid_decrypt(encrypted_payload, recipient_private_key)
    return decrypted_bytes.decode('utf-8')
