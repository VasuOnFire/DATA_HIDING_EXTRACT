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
import numpy as np
from PIL import Image

# Import modules
from config import settings
from database.models import get_engine, init_db, get_session_maker, User, LoginHistory, ConnectionRequest, Contact, Message, OTP
from auth.signup import signup_user, login_user, forgot_password_request, reset_password, SignupRequest, LoginRequest
from auth.otp import verify_otp, create_otp, resend_otp
from auth.security import verify_token, create_access_token
from encryption.hybrid_encryption import generate_rsa_keypair, hybrid_encrypt, hybrid_decrypt, encrypt_with_password, decrypt_with_password
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
    """Extract device info from request"""
    user_agent = request.headers.get("user-agent", "")
    forwarded_for = request.headers.get("x-forwarded-for")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host
    
    return {
        "device_type": "mobile" if any(x in user_agent.lower() for x in ['mobile', 'android', 'iphone']) else "desktop",
        "browser": request.headers.get("sec-ch-ua", "unknown"),
        "os": "unknown",
        "ip_address": ip,
        "location": "unknown"
    }

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
            
            # Generate tokens
            access_token = create_access_token({"user_id": user.id, "email": user.email, "unique_id": user.unique_id})
            
            return {
                "success": True,
                "message": "OTP verified successfully",
                "access_token": access_token,
                "user": {
                    "id": user.unique_id,
                    "full_name": user.full_name,
                    "email": user.email
                }
            }
        else:
            return {"success": True, "message": "OTP verified"}
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

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ==================== STATIC FILES ====================

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Serve frontend
@app.get("/")
async def serve_frontend():
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build", "index.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    return {"message": "SECUREDATA API - Frontend not built yet"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
