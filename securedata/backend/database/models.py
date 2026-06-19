from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, ForeignKey, Text, LargeBinary, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

Base = declarative_base()

def generate_unique_id():
    """Generate unique user ID like SEC-92X3A"""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    import random
    random_part = ''.join(random.choices(chars, k=5))
    return f"SEC-{random_part}"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    unique_id = Column(String(10), unique=True, default=generate_unique_id, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    profile_image = Column(String(255), nullable=True)
    theme = Column(String(10), default="light")
    is_active = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # RSA Keys for hybrid encryption
    public_key = Column(Text, nullable=True)
    private_key = Column(Text, nullable=True)
    
    # Relationships
    login_history = relationship("LoginHistory", back_populates="user", cascade="all, delete-orphan")
    sent_requests = relationship("ConnectionRequest", foreign_keys="ConnectionRequest.sender_id", back_populates="sender")
    received_requests = relationship("ConnectionRequest", foreign_keys="ConnectionRequest.receiver_id", back_populates="receiver")
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    messages_received = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user")

class LoginHistory(Base):
    __tablename__ = "login_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    login_time = Column(DateTime, default=datetime.utcnow)
    device_type = Column(String(50))
    browser = Column(String(100))
    os = Column(String(50))
    ip_address = Column(String(45))
    location = Column(String(100))
    is_active = Column(Boolean, default=True)
    
    user = relationship("User", back_populates="login_history")

class ConnectionRequest(Base):
    __tablename__ = "connection_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_requests")

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_id])

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=True)  # Encrypted content
    message_type = Column(String(20), default="text")  # text, image, audio, video
    media_url = Column(String(255), nullable=True)
    encrypted_aes_key = Column(Text, nullable=True)  # RSA encrypted AES key
    iv = Column(String(255), nullable=True)  # Initialization vector
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id], back_populates="messages_sent")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="messages_received")

class OTP(Base):
    __tablename__ = "otps"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(20), default="signup")  # signup, login, password_reset
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)

class StegoMedia(Base):
    __tablename__ = "stego_media"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String(255))
    stego_filename = Column(String(255))
    media_type = Column(String(20))  # image, audio, video
    encryption_method = Column(String(50))
    payload_size = Column(Integer)
    psnr = Column(Float, nullable=True)
    ssim = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class QRCodeHistory(Base):
    __tablename__ = "qr_code_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for non-logged in users
    qr_filename = Column(String(255), nullable=False)
    encrypted_payload = Column(Text, nullable=False)  # Stored encrypted data
    iv = Column(String(255), nullable=False)  # Initialization vector
    salt = Column(String(255), nullable=False)  # Salt for key derivation
    timestamp = Column(DateTime, default=datetime.utcnow)
    scan_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

class Folder(Base):
    __tablename__ = "folders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    folder_name = Column(String(255), nullable=False)
    is_locked = Column(Boolean, default=False)
    folder_password = Column(String(255), nullable=True)  # Bcrypt hashed password
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    files = relationship("SecureFile", back_populates="folder", cascade="all, delete-orphan")

class SecureFile(Base):
    __tablename__ = "secure_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # image, audio, video, pdf, document
    encrypted_path = Column(String(500), nullable=False)  # Path to encrypted file
    file_size = Column(Integer, nullable=True)  # File size in bytes
    encryption_key = Column(String(255), nullable=True)  # Encryption key for decryption
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    folder = relationship("Folder", back_populates="files")

# Database engine and session
def get_engine(database_url: str = None):
    if database_url is None:
        from config import settings
        database_url = settings.DATABASE_URL
    return create_engine(database_url)

def init_db(engine):
    Base.metadata.create_all(bind=engine)

def get_session_maker(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)
