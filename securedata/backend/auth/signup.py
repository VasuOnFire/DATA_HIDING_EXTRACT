from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from database.models import User
from auth.security import hash_password, verify_password, create_access_token, create_refresh_token
from auth.otp import create_otp
from encryption.hybrid_encryption import generate_rsa_keypair
from pydantic import BaseModel, EmailStr
from datetime import timedelta
from services.email_service import send_otp_email

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    requires_otp: bool = False

def validate_password(password: str) -> bool:
    """Validate password strength"""
    if len(password) < 8:
        return False
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    return has_upper and has_lower and has_digit and has_special

def signup_user(db: Session, request: SignupRequest):
    """Register a new user"""
    # Check if passwords match
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Validate password strength
    if not validate_password(request.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character"
        )
    
    # Check if email exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate RSA keypair for hybrid encryption
    private_key, public_key = generate_rsa_keypair()
    
    # Create user
    hashed_password = hash_password(request.password)
    new_user = User(
        full_name=request.full_name,
        email=request.email,
        phone=request.phone,
        password_hash=hashed_password,
        public_key=public_key,
        private_key=private_key,
        is_active=False,
        is_verified=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate OTP
    otp_code = create_otp(db, new_user.id, "signup")
    
    # Send OTP email
    email_sent = send_otp_email(request.email, otp_code, "signup")
    
    return {
        "message": "User registered successfully. Please verify with OTP.",
        "user_id": new_user.unique_id,
        "email_sent": email_sent,
        "otp": otp_code,  # Only returned for testing or if email fails
        "requires_otp": True
    }

def login_user(db: Session, request: LoginRequest, device_info: dict):
    """Authenticate user"""
    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if user is verified
    if not user.is_verified:
        # Generate OTP for unverified users
        otp_code = create_otp(db, user.id, "login")
        return {
            "requires_otp": True,
            "user_id": user.unique_id,
            "otp": otp_code,
            "message": "Please verify your account with OTP"
        }
    
    # Record login history for successful login
    from database.models import LoginHistory
    login_record = LoginHistory(
        user_id=user.id,
        device_type=device_info.get("device_type", "unknown"),
        browser=device_info.get("browser", "unknown"),
        os=device_info.get("os", "unknown"),
        ip_address=device_info.get("ip_address", "unknown"),
        location=device_info.get("location", "unknown"),
        is_active=True
    )
    db.add(login_record)
    db.commit()
    
    # Generate tokens for verified users
    access_token = create_access_token(
        {"user_id": user.id, "email": user.email, "unique_id": user.unique_id},
        timedelta(minutes=30)
    )
    refresh_token = create_refresh_token({"user_id": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": user.unique_id,
        "requires_otp": False,
        "user": {
            "id": user.unique_id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "theme": user.theme,
            "profile_image": user.profile_image
        }
    }

def forgot_password_request(db: Session, email: str):
    """Request password reset"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate OTP for password reset
    otp_code = create_otp(db, user.id, "password_reset")
    
    return {
        "message": "Password reset OTP sent",
        "user_id": user.unique_id,
        "otp": otp_code  # In production, send via email
    }

def reset_password(db: Session, email: str, otp_code: str, new_password: str):
    """Reset password with OTP"""
    from auth.otp import verify_otp
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify OTP
    if not verify_otp(db, user.id, otp_code, "password_reset"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Validate new password
    if not validate_password(new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character"
        )
    
    # Update password
    user.password_hash = hash_password(new_password)
    db.commit()
    
    return {"message": "Password reset successful"}
