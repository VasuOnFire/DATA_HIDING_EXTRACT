from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.requests import Request
from sqlalchemy.orm import Session, sessionmaker
from datetime import datetime, timedelta
from typing import Optional, List
import json
import os
import io
import base64
import numpy as np
from PIL import Image

# Import modules
from config import settings
from database.models import get_engine, init_db, get_session_maker, User, LoginHistory, ConnectionRequest, Contact, Message, OTP, QRCodeHistory, Folder, SecureFile
from auth.signup import signup_user, login_user, forgot_password_request, reset_password, SignupRequest, LoginRequest
from auth.otp import verify_otp, create_otp, resend_otp
from auth.security import verify_token, create_access_token
from encryption.hybrid_encryption import generate_rsa_keypair, hybrid_encrypt, hybrid_decrypt, encrypt_with_password, decrypt_with_password
from encryption.qr_crypto import encrypt_data, decrypt_data, create_payload_for_qr, parse_qr_payload
from qr_handler.generator import generate_secure_qr
from qr_handler.reader import decode_qr_from_upload, validate_qr_payload
from steganography.embed import embed_in_image, embed_in_audio, calculate_psnr, calculate_ssim
from steganography.extract import extract_from_image_file, extract_from_audio_file
from steganography.auto_generate import generate_automated_image, generate_automated_audio
from chat.websocket_chat import chat_websocket, manager, edit_message, delete_message
from performance.metrics import get_analyzer
from storage.media_storage import save_upload_file, save_profile_image, save_chat_media, save_stego_file, get_file_url

# Create FastAPI app
app = FastAPI(
    title="SECUREDATA API",
    description="Hybrid Encryption & Steganography Communication Platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
engine = get_engine()
SessionLocal = get_session_maker(engine)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db(engine)
    # Ensure upload directories exist
    os.makedirs(f"{settings.UPLOAD_DIR}/media", exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/stego", exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/profiles", exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/qr", exist_ok=True)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def get_device_info(request):
    """Extract detailed device info from request headers"""
    user_agent = request.headers.get("user-agent", "")
    forwarded_for = request.headers.get("x-forwarded-for")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host
    
    # Device type detection
    ua_lower = user_agent.lower()
    if any(x in ua_lower for x in ['mobile', 'android', 'iphone', 'ipad']):
        device_type = "Mobile"
    elif any(x in ua_lower for x in ['tablet', 'ipad']):
        device_type = "Tablet"
    else:
        device_type = "Desktop"
    
    # OS detection
    os_type = "Unknown"
    if "windows" in ua_lower:
        os_type = "Windows"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        os_type = "macOS"
    elif "linux" in ua_lower:
        os_type = "Linux"
    elif "android" in ua_lower:
        os_type = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_type = "iOS"
    
    # Browser detection
    browser = "Unknown"
    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "edg" in ua_lower:
        browser = "Edge"
    elif "opera" in ua_lower:
        browser = "Opera"
    
    return {
        "device_type": device_type,
        "browser": browser,
        "os": os_type,
        "ip_address": ip,
        "location": "Unknown",
        "user_agent": user_agent
    }

def record_login_history(db, user_id, device_info, status="success"):
    """Record login history entry"""
    from database.models import LoginHistory
    login_record = LoginHistory(
        user_id=user_id,
        device_type=device_info.get("device_type", "Unknown"),
        browser=device_info.get("browser", "Unknown"),
        os=device_info.get("os", "Unknown"),
        ip_address=device_info.get("ip_address", "Unknown"),
        location=device_info.get("location", "Unknown"),
        is_active=(status == "success")
    )
    db.add(login_record)
    db.commit()
    return login_record

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    result = signup_user(db, request)
    return JSONResponse(content=result)

@app.post("/api/auth/login")
async def login(request: LoginRequest, request_obj: Request, db: Session = Depends(get_db)):
    device_info = get_device_info(request_obj)
    result = login_user(db, request, device_info)
    return JSONResponse(content=result)

@app.post("/api/auth/verify-otp")
async def verify_otp_endpoint(
    request_obj: Request,
    user_id: str,
    otp_code: str,
    purpose: str = "signup",
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if verify_otp(db, user.id, otp_code, purpose):
        if purpose == "signup":
            user.is_verified = True
            user.is_active = True
            db.commit()
        
        # Generate tokens for both signup and login
        access_token = create_access_token({"user_id": user.id, "email": user.email, "unique_id": user.unique_id})
        
        # Record login history for login purpose
        if purpose == "login":
            device_info = get_device_info(request_obj)
            record_login_history(db, user.id, device_info, status="success")
        
        return {
            "success": True,
            "message": "OTP verified successfully",
            "access_token": access_token,
            "user": {
                "id": user.unique_id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "theme": user.theme,
                "profile_image": user.profile_image
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

@app.post("/api/auth/resend-otp")
async def resend_otp_endpoint(user_id: str, purpose: str = "signup", db: Session = Depends(get_db)):
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp_code = resend_otp(db, user.id, purpose)
    return {"message": "OTP resent", "otp": otp_code}

@app.post("/api/auth/forgot-password")
async def forgot_password(email: str, db: Session = Depends(get_db)):
    result = forgot_password_request(db, email)
    return result

@app.post("/api/auth/reset-password")
async def reset_password_endpoint(
    email: str,
    otp_code: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    result = reset_password(db, email, otp_code, new_password)
    return result

# ==================== USER ENDPOINTS ====================

@app.get("/api/user/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "id": current_user.unique_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "profile_image": current_user.profile_image,
        "theme": current_user.theme
    }

@app.put("/api/user/profile")
async def update_profile(
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if full_name:
        current_user.full_name = full_name
    if phone:
        current_user.phone = phone
    
    db.commit()
    return {"message": "Profile updated"}

@app.post("/api/user/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_path = await save_profile_image(file)
    # Store the relative URL (not the full file path) in database
    relative_url = get_file_url(file_path)
    current_user.profile_image = relative_url
    db.commit()
    return {"message": "Profile image updated", "image_url": relative_url}

@app.put("/api/user/password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from auth.security import verify_password, hash_password
    
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    current_user.password_hash = hash_password(new_password)
    db.commit()
    return {"message": "Password changed successfully"}

@app.put("/api/user/theme")
async def update_theme(
    theme: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.theme = theme
    db.commit()
    return {"message": "Theme updated", "theme": theme}

# ==================== LOGIN HISTORY ====================

@app.get("/api/user/login-history")
async def get_login_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(LoginHistory).filter(
        LoginHistory.user_id == current_user.id
    ).order_by(LoginHistory.login_time.desc()).all()
    
    return [
        {
            "login_time": h.login_time.isoformat(),
            "device_type": h.device_type,
            "browser": h.browser,
            "os": h.os,
            "ip_address": h.ip_address,
            "location": h.location,
            "is_active": h.is_active
        }
        for h in history
    ]

# ==================== CONNECTIONS ====================

@app.post("/api/connections/request")
async def send_connection_request(
    unique_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    receiver = db.query(User).filter(User.unique_id == unique_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")
    
    # Check if already connected
    existing_contact = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_id == receiver.id
    ).first()
    
    if existing_contact:
        raise HTTPException(status_code=400, detail="Already connected")
    
    # Check if request already exists
    existing_request = db.query(ConnectionRequest).filter(
        ConnectionRequest.sender_id == current_user.id,
        ConnectionRequest.receiver_id == receiver.id,
        ConnectionRequest.status == "pending"
    ).first()
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Connection request already sent")
    
    new_request = ConnectionRequest(
        sender_id=current_user.id,
        receiver_id=receiver.id
    )
    db.add(new_request)
    db.commit()
    
    return {"message": "Connection request sent"}

@app.post("/api/connections/respond")
async def respond_to_connection(
    request_id: int,
    action: str,  # accept or reject
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn_request = db.query(ConnectionRequest).filter(
        ConnectionRequest.id == request_id,
        ConnectionRequest.receiver_id == current_user.id,
        ConnectionRequest.status == "pending"
    ).first()
    
    if not conn_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if action == "accept":
        conn_request.status = "accepted"
        
        # Create mutual contacts
        contact1 = Contact(user_id=current_user.id, contact_id=conn_request.sender_id)
        contact2 = Contact(user_id=conn_request.sender_id, contact_id=current_user.id)
        db.add(contact1)
        db.add(contact2)
        
    elif action == "reject":
        conn_request.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    db.commit()
    return {"message": f"Request {action}ed"}

@app.get("/api/connections")
async def get_connections(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    
    result = []
    for contact in contacts:
        user = db.query(User).filter(User.id == contact.contact_id).first()
        if user:
            result.append({
                "id": user.unique_id,
                "full_name": user.full_name,
                "profile_image": user.profile_image,
                "online": user.id in manager.online_users
            })
    
    return result

@app.get("/api/connections/pending")
async def get_pending_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requests = db.query(ConnectionRequest).filter(
        ConnectionRequest.receiver_id == current_user.id,
        ConnectionRequest.status == "pending"
    ).all()
    
    return [
        {
            "request_id": r.id,
            "sender_id": r.sender.unique_id,
            "sender_name": r.sender.full_name,
            "created_at": r.created_at.isoformat()
        }
        for r in requests
    ]

# ==================== CHAT ENDPOINTS ====================

@app.get("/api/chat/messages/{contact_id}")
async def get_chat_messages(
    contact_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get contact's database ID
    contact = db.query(User).filter(User.unique_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Verify they are contacts
    is_contact = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_id == contact.id
    ).first()
    
    if not is_contact:
        raise HTTPException(status_code=403, detail="Not connected with this user")
    
    messages = db.query(Message).filter(
        ((Message.sender_id == current_user.id) & (Message.receiver_id == contact.id)) |
        ((Message.sender_id == contact.id) & (Message.receiver_id == current_user.id))
    ).order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        {
            "id": m.id,
            "sender_id": m.sender.unique_id,
            "content": m.content if not m.is_deleted else None,
            "message_type": m.message_type,
            "encrypted_aes_key": m.encrypted_aes_key if not m.is_deleted else None,
            "iv": m.iv if not m.is_deleted else None,
            "timestamp": m.created_at.isoformat(),
            "is_edited": m.is_edited,
            "is_deleted": m.is_deleted,
            "media_url": m.media_url
        }
        for m in reversed(messages)
    ]

# ==================== WEBSOCKET ====================

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await chat_websocket(websocket, db)

# ==================== STEGANOGRAPHY ENDPOINTS ====================

@app.post("/api/stego/embed")
async def embed_in_media_endpoint(
    file: UploadFile = File(...),
    secret_text: str = Form(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Read file
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Check file size
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / (1024*1024)}MB")
        
        # Determine media type and embed accordingly
        file_ext = file.filename.lower().split('.')[-1] if file.filename else ''
        
        if file_ext in ['png', 'jpg', 'jpeg', 'bmp', 'gif']:
            # Handle image
            from steganography.embed import embed_in_image as embed_func
            stego_bytes = embed_func(io.BytesIO(content), secret_text, password)
            media_type = "image"
            
            # Calculate metrics
            original_img = Image.open(io.BytesIO(content))
            stego_img = Image.open(io.BytesIO(stego_bytes))
            
            if original_img.mode != 'RGB':
                original_img = original_img.convert('RGB')
            if stego_img.mode != 'RGB':
                stego_img = stego_img.convert('RGB')
            
            psnr = calculate_psnr(np.array(original_img), np.array(stego_img))
            ssim = calculate_ssim(np.array(original_img), np.array(stego_img))
            
        elif file_ext in ['wav']:
            # Handle audio
            from steganography.embed import embed_in_audio as embed_func
            stego_bytes = embed_func(io.BytesIO(content), secret_text, password)
            media_type = "audio"
            psnr = None
            ssim = None
            
        elif file_ext in ['mp4', 'avi', 'mov']:
            # Handle video (embed in first frame)
            from steganography.embed import embed_in_video as embed_func
            stego_bytes = embed_func(io.BytesIO(content), secret_text, password)
            media_type = "video"
            psnr = None
            ssim = None
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
        
        # Save file
        from database.models import StegoMedia
        file_path = await save_stego_file(stego_bytes, file.filename)
        
        # Record in database
        stego_record = StegoMedia(
            user_id=current_user.id,
            original_filename=file.filename,
            stego_filename=os.path.basename(file_path),
            media_type=media_type,
            encryption_method="AES-256-PBKDF2",
            payload_size=len(secret_text.encode('utf-8')),
            psnr=psnr,
            ssim=ssim
        )
        db.add(stego_record)
        db.commit()
        
        response_data = {
            "success": True,
            "download_url": get_file_url(file_path),
            "media_type": media_type,
            "payload_size": len(secret_text.encode('utf-8'))
        }
        
        if psnr is not None:
            response_data["metrics"] = {
                "psnr": round(psnr, 2),
                "ssim": round(ssim, 4) if ssim is not None else None
            }
        
        return response_data
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to hide data: {str(e)}")

@app.post("/api/stego/extract")
async def extract_from_media_endpoint(
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # Read file
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Determine media type and extract accordingly
        file_ext = file.filename.lower().split('.')[-1] if file.filename else ''
        
        if file_ext in ['png', 'jpg', 'jpeg', 'bmp', 'gif']:
            # Handle image
            from steganography.embed import extract_from_image as extract_func
            result = extract_func(io.BytesIO(content), password)
            media_type = "image"
            
        elif file_ext in ['wav']:
            # Handle audio
            from steganography.embed import extract_from_audio as extract_func
            result = extract_func(io.BytesIO(content), password)
            media_type = "audio"
            
        elif file_ext in ['mp4', 'avi', 'mov']:
            # Handle video (extract from first frame)
            from steganography.embed import extract_from_video as extract_func
            result = extract_func(io.BytesIO(content), password)
            media_type = "video"
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
        
        return {
            "success": True,
            "extracted_text": result,
            "media_type": media_type
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract data: {str(e)}")

@app.post("/api/stego/auto-generate")
async def auto_generate_stego(
    secret_text: str = Form(...),
    password: str = Form(...),
    media_type: str = Form(...),  # image, audio, video
    theme: str = Form("nature"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if media_type == "image":
            stego_bytes = generate_automated_image(secret_text, password, theme)
            filename = f"stego_{theme}_{current_user.unique_id}.png"
        elif media_type == "audio":
            stego_bytes = generate_automated_audio(secret_text, password)
            filename = f"stego_audio_{current_user.unique_id}.wav"
        else:
            raise HTTPException(status_code=400, detail="Unsupported media type")
        
        file_path = await save_stego_file(stego_bytes, filename)
        
        return {
            "success": True,
            "download_url": get_file_url(file_path),
            "media_type": media_type,
            "theme": theme
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate stego file: {str(e)}")

# ==================== QR CODE ENDPOINTS ====================

@app.post("/api/qr/generate")
async def generate_qr_endpoint(
    secret_message: str = Form(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an encrypted QR code with secret message
    """
    try:
        # Create encrypted payload
        encrypted_payload = create_payload_for_qr(secret_message, password)
        
        # Generate QR code with timestamped filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"qr_{current_user.unique_id}_{timestamp}.png"
        output_path = os.path.join(settings.UPLOAD_DIR, "qr", filename)
        
        # Generate secure QR
        qr_result = generate_secure_qr(encrypted_payload, output_path)
        
        # Parse encrypted data for storage
        encrypted_data = parse_qr_payload(encrypted_payload)
        
        # Save to database
        qr_record = QRCodeHistory(
            user_id=current_user.id,
            qr_filename=filename,
            encrypted_payload=encrypted_data["encrypted_data"],
            iv=encrypted_data["iv"],
            salt=encrypted_data["salt"],
            timestamp=datetime.utcnow()
        )
        db.add(qr_record)
        db.commit()
        
        return {
            "success": True,
            "qr_id": qr_record.id,
            "base64_image": qr_result["base64_image"],
            "download_url": f"/uploads/qr/{filename}",
            "created_at": qr_record.timestamp.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")

@app.post("/api/qr/extract")
async def extract_qr_endpoint(
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    Extract secret message from QR code image
    """
    try:
        # Read uploaded file
        contents = await file.read()
        
        # Decode QR from uploaded image
        qr_data = decode_qr_from_upload(contents)
        
        # Validate QR format
        if not validate_qr_payload(qr_data):
            raise HTTPException(status_code=400, detail="Invalid QR code format or corrupted data")
        
        # Parse payload
        encrypted_payload = parse_qr_payload(qr_data)
        
        # Decrypt data
        decrypted_message = decrypt_data(encrypted_payload, password)
        
        return {
            "success": True,
            "message": decrypted_message,
            "timestamp": encrypted_payload.get("timestamp")
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid secret key or corrupted QR code")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract data: {str(e)}")

@app.post("/api/qr/extract-from-data")
async def extract_qr_from_data_endpoint(
    qr_data: str,  # Raw QR content (from camera scan)
    password: str
):
    """
    Extract secret message directly from QR code data (for camera scans)
    """
    try:
        # Validate QR format
        if not validate_qr_payload(qr_data):
            raise HTTPException(status_code=400, detail="Invalid QR code format")
        
        # Parse payload
        encrypted_payload = parse_qr_payload(qr_data)
        
        # Decrypt data
        decrypted_message = decrypt_data(encrypted_payload, password)
        
        return {
            "success": True,
            "message": decrypted_message,
            "timestamp": encrypted_payload.get("timestamp")
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid secret key or corrupted QR code")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract data: {str(e)}")

@app.get("/api/qr/history")
async def get_qr_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get QR code generation history for current user
    """
    try:
        history = db.query(QRCodeHistory).filter(
            QRCodeHistory.user_id == current_user.id
        ).order_by(QRCodeHistory.timestamp.desc()).all()
        
        result = []
        for record in history:
            result.append({
                "id": record.id,
                "qr_filename": record.qr_filename,
                "timestamp": record.timestamp.isoformat(),
                "scan_count": record.scan_count,
                "is_active": record.is_active,
                "download_url": f"/api/qr/download/{record.id}"
            })
        
        return {"history": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch QR history: {str(e)}")

@app.get("/api/qr/download/{qr_id}")
async def download_qr(
    qr_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download a QR code image by ID with authentication
    """
    try:
        # Get QR record
        qr_record = db.query(QRCodeHistory).filter(
            QRCodeHistory.id == qr_id,
            QRCodeHistory.user_id == current_user.id
        ).first()
        
        if not qr_record:
            raise HTTPException(status_code=404, detail="QR code not found")
        
        # Construct file path
        file_path = os.path.join(settings.UPLOAD_DIR, "qr", qr_record.qr_filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="QR code file not found on disk")
        
        # Return file
        return FileResponse(
            path=file_path,
            media_type="image/png",
            filename=qr_record.qr_filename,
            headers={
                "Content-Disposition": f"attachment; filename={qr_record.qr_filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download QR code: {str(e)}")

# ==================== PERFORMANCE METRICS ====================

@app.get("/api/performance/encryption")
async def get_encryption_performance():
    analyzer = get_analyzer()
    
    # Test data
    test_data = b"This is a test message for encryption performance analysis." * 100
    
    # Generate test keys
    from encryption.hybrid_encryption import generate_rsa_keypair, hybrid_encrypt, hybrid_decrypt
    private_key, public_key = generate_rsa_keypair()
    
    def encrypt_func(data):
        return hybrid_encrypt(data, public_key)
    
    def decrypt_func(encrypted):
        return hybrid_decrypt(encrypted, private_key)
    
    metrics = analyzer.measure_encryption_performance(encrypt_func, decrypt_func, test_data)
    report = analyzer.generate_report(metrics)
    
    return report

# ==================== SECURE STORAGE ====================

@app.post("/api/storage/folders")
async def create_folder(
    folder_name: str,
    is_locked: bool = False,
    folder_password: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new folder"""
    # Check if folder with same name exists for this user
    existing_folder = db.query(Folder).filter(
        Folder.user_id == current_user.id,
        Folder.folder_name == folder_name
    ).first()
    
    if existing_folder:
        raise HTTPException(status_code=400, detail="Folder with this name already exists")
    
    # Hash folder password if provided
    hashed_password = None
    if is_locked and folder_password:
        from auth.security import hash_password
        hashed_password = hash_password(folder_password)
    
    new_folder = Folder(
        user_id=current_user.id,
        folder_name=folder_name,
        is_locked=is_locked,
        folder_password=hashed_password
    )
    
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    
    return {
        "id": new_folder.id,
        "folder_name": new_folder.folder_name,
        "is_locked": new_folder.is_locked,
        "created_at": new_folder.created_at.isoformat()
    }

@app.get("/api/storage/folders")
async def get_folders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all folders for current user"""
    folders = db.query(Folder).filter(Folder.user_id == current_user.id).all()
    
    return [
        {
            "id": folder.id,
            "folder_name": folder.folder_name,
            "is_locked": folder.is_locked,
            "created_at": folder.created_at.isoformat(),
            "file_count": len(folder.files)
        }
        for folder in folders
    ]

@app.put("/api/storage/folders/{folder_id}")
async def update_folder(
    folder_id: int,
    folder_name: str = None,
    is_locked: bool = None,
    folder_password: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update folder (rename or lock/unlock)"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if folder_name:
        # Check if new name conflicts with existing folder
        existing = db.query(Folder).filter(
            Folder.user_id == current_user.id,
            Folder.folder_name == folder_name,
            Folder.id != folder_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Folder with this name already exists")
        
        folder.folder_name = folder_name
    
    if is_locked is not None:
        folder.is_locked = is_locked
        
        if is_locked and folder_password:
            from auth.security import hash_password
            folder.folder_password = hash_password(folder_password)
        elif not is_locked:
            folder.folder_password = None
    
    db.commit()
    db.refresh(folder)
    
    return {
        "id": folder.id,
        "folder_name": folder.folder_name,
        "is_locked": folder.is_locked,
        "created_at": folder.created_at.isoformat()
    }

@app.delete("/api/storage/folders/{folder_id}")
async def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a folder and all its files"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Delete files from storage
    for file in folder.files:
        try:
            file_path = os.path.join(settings.UPLOAD_DIR, "secure_storage", file.encrypted_path)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file {file.encrypted_path}: {e}")
    
    db.delete(folder)
    db.commit()
    
    return {"message": "Folder deleted successfully"}

@app.post("/api/storage/folders/{folder_id}/unlock")
async def unlock_folder(
    folder_id: int,
    folder_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlock a folder with password"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if not folder.is_locked:
        return {"unlocked": True, "message": "Folder is not locked"}
    
    from auth.security import verify_password
    if not verify_password(folder_password, folder.folder_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    return {"unlocked": True, "message": "Folder unlocked successfully"}

@app.post("/api/storage/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and encrypt a file to a folder"""
    # Verify folder exists and belongs to user
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Check file size
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / (1024*1024)}MB")
    
    # Determine file type
    file_ext = file.filename.lower().split('.')[-1] if file.filename else ''
    if file_ext in ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']:
        file_type = 'image'
    elif file_ext in ['mp3', 'wav', 'ogg', 'm4a']:
        file_type = 'audio'
    elif file_ext in ['mp4', 'avi', 'mov', 'mkv']:
        file_type = 'video'
    elif file_ext == 'pdf':
        file_type = 'pdf'
    else:
        file_type = 'document'
    
    # Generate encryption key and encrypt file
    from encryption.hybrid_encryption import encrypt_with_password
    import secrets
    
    encryption_key = secrets.token_hex(32)  # 256-bit key
    encryption_result = encrypt_with_password(file_content, encryption_key)
    
    # Save encrypted file
    secure_storage_dir = os.path.join(settings.UPLOAD_DIR, "secure_storage")
    os.makedirs(secure_storage_dir, exist_ok=True)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    encrypted_filename = f"{timestamp}_{file.filename}"
    encrypted_path = os.path.join(secure_storage_dir, encrypted_filename)
    
    # Write the encrypted data (base64 decoded) to file
    encrypted_bytes = base64.b64decode(encryption_result['encrypted_data'])
    with open(encrypted_path, 'wb') as f:
        f.write(encrypted_bytes)
    
    # Store file record with encryption metadata
    new_file = SecureFile(
        user_id=current_user.id,
        folder_id=folder_id,
        file_name=file.filename,
        file_type=file_type,
        encrypted_path=encrypted_filename,
        file_size=file_size,
        encryption_key=encryption_key
    )
    
    # Store encryption metadata separately (in a real app, this would be in the database)
    # For now, we'll store it as a JSON file alongside the encrypted file
    metadata = {
        'salt': encryption_result['salt'],
        'iv': encryption_result['iv'],
        'encryption_key': encryption_key  # In production, derive this from user's key
    }
    metadata_path = encrypted_path + '.meta'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f)
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return {
        "id": new_file.id,
        "file_name": new_file.file_name,
        "file_type": new_file.file_type,
        "file_size": new_file.file_size,
        "created_at": new_file.created_at.isoformat()
    }

@app.get("/api/storage/folders/{folder_id}/files")
async def get_folder_files(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all files in a folder"""
    # Verify folder exists and belongs to user
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    files = db.query(SecureFile).filter(SecureFile.folder_id == folder_id).all()
    
    return [
        {
            "id": file.id,
            "file_name": file.file_name,
            "file_type": file.file_type,
            "file_size": file.file_size,
            "created_at": file.created_at.isoformat(),
            "encryption_key": file.encryption_key
        }
        for file in files
    ]

@app.get("/api/storage/files/{file_id}/download")
async def download_file(
    file_id: int,
    encryption_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download and decrypt a file"""
    file_record = db.query(SecureFile).filter(
        SecureFile.id == file_id,
        SecureFile.user_id == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Read encrypted file
    encrypted_path = os.path.join(settings.UPLOAD_DIR, "secure_storage", file_record.encrypted_path)
    metadata_path = encrypted_path + '.meta'
    
    if not os.path.exists(encrypted_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Encryption metadata not found")
    
    # Read encrypted data and metadata
    with open(encrypted_path, 'rb') as f:
        encrypted_bytes = f.read()
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Reconstruct encryption payload
    encrypted_payload = {
        'encrypted_data': base64.b64encode(encrypted_bytes).decode('utf-8'),
        'salt': metadata['salt'],
        'iv': metadata['iv']
    }
    
    # Decrypt file
    from encryption.hybrid_encryption import decrypt_with_password
    try:
        decrypted_data = decrypt_with_password(encrypted_payload, encryption_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to decrypt file. Invalid key.")
    
    # Return decrypted file
    from fastapi.responses import Response
    return Response(
        content=decrypted_data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_record.file_name}"}
    )

@app.get("/api/storage/files/{file_id}/preview")
async def preview_file(
    file_id: int,
    encryption_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview a file (decrypt temporarily for viewing)"""
    try:
        # Get file record
        file_record = db.query(SecureFile).filter(
            SecureFile.id == file_id,
            SecureFile.user_id == current_user.id
        ).first()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read encrypted file
        encrypted_path = os.path.join(settings.UPLOAD_DIR, "secure_storage", file_record.encrypted_path)
        metadata_path = encrypted_path + '.meta'
        
        if not os.path.exists(encrypted_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="Encryption metadata not found")
        
        # Read encrypted data and metadata
        with open(encrypted_path, 'rb') as f:
            encrypted_bytes = f.read()
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Reconstruct encryption payload
        encrypted_payload = {
            'encrypted_data': base64.b64encode(encrypted_bytes).decode('utf-8'),
            'salt': metadata['salt'],
            'iv': metadata['iv']
        }
        
        # Decrypt file
        from encryption.hybrid_encryption import decrypt_with_password
        try:
            decrypted_data = decrypt_with_password(encrypted_payload, encryption_key)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Failed to decrypt file. Invalid key.")
        
        # Determine media type based on file type
        media_types = {
            'image': 'image/png',
            'video': 'video/mp4',
            'audio': 'audio/mpeg',
            'pdf': 'application/pdf',
            'document': 'application/octet-stream'
        }
        media_type = media_types.get(file_record.file_type, 'application/octet-stream')
        
        # Return decrypted file for preview
        from fastapi.responses import Response
        return Response(
            content=decrypted_data,
            media_type=media_type,
            headers={"Content-Disposition": f"inline; filename={file_record.file_name}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview file: {str(e)}")

@app.post("/api/storage/files/{file_id}/share")
async def share_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a secure share link for a file"""
    try:
        # Get file record
        file_record = db.query(SecureFile).filter(
            SecureFile.id == file_id,
            SecureFile.user_id == current_user.id
        ).first()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Generate a share token (in production, this would be stored in database with expiry)
        import secrets
        share_token = secrets.token_urlsafe(32)
        
        # Generate share URL
        share_url = f"{settings.ALLOWED_ORIGINS[0]}/share/{share_token}"
        
        # In production, store share_token with file_id and expiry in database
        # For now, return the share URL
        return {
            "share_url": share_url,
            "share_token": share_token,
            "file_name": file_record.file_name,
            "file_type": file_record.file_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate share link: {str(e)}")

@app.delete("/api/storage/files/{file_id}")
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a file"""
    file_record = db.query(SecureFile).filter(
        SecureFile.id == file_id,
        SecureFile.user_id == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete file from storage
    try:
        encrypted_path = os.path.join(settings.UPLOAD_DIR, "secure_storage", file_record.encrypted_path)
        if os.path.exists(encrypted_path):
            os.remove(encrypted_path)
    except Exception as e:
        print(f"Error deleting file {file_record.encrypted_path}: {e}")
    
    db.delete(file_record)
    db.commit()
    
    return {"message": "File deleted successfully"}

@app.get("/api/storage/files/search")
async def search_files(
    query: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search files by name"""
    files = db.query(SecureFile).filter(
        SecureFile.user_id == current_user.id,
        SecureFile.file_name.ilike(f"%{query}%")
    ).all()
    
    return [
        {
            "id": file.id,
            "file_name": file.file_name,
            "file_type": file.file_type,
            "file_size": file.file_size,
            "created_at": file.created_at.isoformat(),
            "folder_id": file.folder_id,
            "folder_name": file.folder.folder_name if file.folder else None
        }
        for file in files
    ]

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ==================== STATIC FILES ====================

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Serve frontend static files
frontend_build_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
if os.path.exists(frontend_build_path):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_build_path, "static")), name="static")

# Serve frontend
@app.api_route("/", methods=["GET", "HEAD"])
async def serve_frontend():
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build", "index.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    return {"message": "SECUREDATA API - Frontend not built yet"}

# Catch-all for React Router
@app.api_route("/{path:path}", methods=["GET", "HEAD"])
async def serve_frontend_catchall(path: str):
    # Skip API routes
    if path.startswith("api/") or path.startswith("ws/") or path == "health":
        raise HTTPException(status_code=404, detail="Not Found")
    
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build", "index.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    return {"message": "SECUREDATA API - Frontend not built yet"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
