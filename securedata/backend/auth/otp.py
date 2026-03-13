import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database.models import OTP
from config import settings

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def create_otp(db: Session, user_id: int, purpose: str = "signup") -> str:
    """Create and store a new OTP"""
    # Invalidate any existing unused OTPs for this user and purpose
    existing_otps = db.query(OTP).filter(
        OTP.user_id == user_id,
        OTP.purpose == purpose,
        OTP.is_used == False
    ).all()
    
    for otp in existing_otps:
        otp.is_used = True
    
    # Create new OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    
    otp_entry = OTP(
        user_id=user_id,
        otp_code=otp_code,
        purpose=purpose,
        expires_at=expires_at
    )
    
    db.add(otp_entry)
    db.commit()
    db.refresh(otp_entry)
    
    return otp_code

def verify_otp(db: Session, user_id: int, otp_code: str, purpose: str = "signup") -> bool:
    """Verify an OTP"""
    otp_entry = db.query(OTP).filter(
        OTP.user_id == user_id,
        OTP.otp_code == otp_code,
        OTP.purpose == purpose,
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()
    
    if otp_entry:
        otp_entry.is_used = True
        db.commit()
        return True
    
    return False

def is_otp_expired(db: Session, user_id: int, purpose: str = "signup") -> bool:
    """Check if there's a valid OTP for the user"""
    otp_entry = db.query(OTP).filter(
        OTP.user_id == user_id,
        OTP.purpose == purpose,
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()
    
    return otp_entry is None

def resend_otp(db: Session, user_id: int, purpose: str = "signup") -> str:
    """Resend OTP (create new one)"""
    return create_otp(db, user_id, purpose)
