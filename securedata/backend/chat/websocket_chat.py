from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from database.models import Message, User
from encryption.hybrid_encryption import encrypt_message_for_chat, decrypt_chat_message

# Active connections store
class ConnectionManager:
    def __init__(self):
        # Map user_id to their websocket connection
        self.active_connections: Dict[int, WebSocket] = {}
        # Track user online status
        self.online_users: Set[int] = set()
        # Track typing status
        self.typing_users: Dict[int, int] = {}  # user_id -> typing_to_user_id
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.online_users.add(user_id)
        
        # Notify contacts that user is online
        await self.broadcast_status(user_id, "online")
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        self.online_users.discard(user_id)
        if user_id in self.typing_users:
            del self.typing_users[user_id]
        
        # Notify contacts that user is offline
        asyncio.create_task(self.broadcast_status(user_id, "offline"))
    
    async def broadcast_status(self, user_id: int, status: str):
        """Broadcast online/offline status to relevant users"""
        # In a real app, we'd get the user's contacts from DB
        message = {
            "type": "status",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast to all for simplicity (in production, filter to contacts only)
        for conn_user_id, connection in self.active_connections.items():
            if conn_user_id != user_id:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to specific user"""
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def send_typing_indicator(self, sender_id: int, receiver_id: int, is_typing: bool):
        """Send typing indicator to receiver"""
        if is_typing:
            self.typing_users[sender_id] = receiver_id
        else:
            if sender_id in self.typing_users:
                del self.typing_users[sender_id]
        
        if receiver_id in self.active_connections:
            await self.active_connections[receiver_id].send_json({
                "type": "typing",
                "user_id": sender_id,
                "is_typing": is_typing,
                "timestamp": datetime.utcnow().isoformat()
            })

# Global connection manager
manager = ConnectionManager()

async def chat_websocket(websocket: WebSocket, db: Session):
    """Main WebSocket handler for chat"""
    # Wait for authentication message
    try:
        auth_msg = await websocket.receive_text()
        auth_data = json.loads(auth_msg)
        
        # Verify token
        from auth.security import verify_token
        token = auth_data.get("token")
        payload = verify_token(token)
        
        if not payload or "user_id" not in payload:
            await websocket.close(code=4001, reason="Unauthorized")
            return
        
        user_id = payload["user_id"]
        
        # Get user details
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return
        
        # Connect to manager
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                message_type = message_data.get("type", "message")
                
                if message_type == "message":
                    await handle_chat_message(user_id, message_data, db, manager)
                elif message_type == "typing":
                    receiver_id = message_data.get("receiver_id")
                    is_typing = message_data.get("is_typing", False)
                    await manager.send_typing_indicator(user_id, receiver_id, is_typing)
                elif message_type == "ping":
                    await websocket.send_json({"type": "pong"})
                    
        except WebSocketDisconnect:
            manager.disconnect(user_id)
            
    except Exception as e:
        await websocket.close(code=4000, reason=str(e))

async def handle_chat_message(sender_id: int, message_data: dict, db: Session, manager: ConnectionManager):
    """Process and store a chat message"""
    receiver_id = message_data.get("receiver_id")
    content = message_data.get("content")
    message_type = message_data.get("message_type", "text")
    
    # Get receiver's public key
    receiver = db.query(User).filter(User.id == receiver_id).first()
    sender = db.query(User).filter(User.id == sender_id).first()
    
    if not receiver or not sender:
        return
    
    # Encrypt message for receiver using hybrid encryption
    encrypted_payload = encrypt_message_for_chat(content, receiver.public_key)
    
    # Store message in database
    new_message = Message(
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=encrypted_payload['encrypted_data'],
        message_type=message_type,
        encrypted_aes_key=encrypted_payload['encrypted_aes_key'],
        iv=encrypted_payload['iv']
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Prepare message for real-time delivery
    message_to_send = {
        "type": "message",
        "id": new_message.id,
        "sender_id": sender_id,
        "sender_unique_id": sender.unique_id,
        "sender_name": sender.full_name,
        "receiver_id": receiver_id,
        "content": encrypted_payload['encrypted_data'],
        "message_type": message_type,
        "encrypted_aes_key": encrypted_payload['encrypted_aes_key'],
        "iv": encrypted_payload['iv'],
        "timestamp": new_message.created_at.isoformat(),
        "is_edited": False,
        "is_deleted": False
    }
    
    # Send to receiver if online
    await manager.send_personal_message(message_to_send, receiver_id)
    
    # Send confirmation to sender
    await manager.send_personal_message({
        **message_to_send,
        "type": "message_sent",
        "status": "delivered"
    }, sender_id)

async def edit_message(user_id: int, message_id: int, new_content: str, db: Session):
    """Edit an existing message"""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == user_id,
        Message.is_deleted == False
    ).first()
    
    if not message:
        return False
    
    # Get receiver's public key
    receiver = db.query(User).filter(User.id == message.receiver_id).first()
    
    # Re-encrypt with new content
    encrypted_payload = encrypt_message_for_chat(new_content, receiver.public_key)
    
    message.content = encrypted_payload['encrypted_data']
    message.encrypted_aes_key = encrypted_payload['encrypted_aes_key']
    message.iv = encrypted_payload['iv']
    message.is_edited = True
    
    db.commit()
    
    # Notify both parties
    edit_notification = {
        "type": "message_edited",
        "message_id": message_id,
        "new_content": encrypted_payload['encrypted_data'],
        "encrypted_aes_key": encrypted_payload['encrypted_aes_key'],
        "iv": encrypted_payload['iv'],
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.send_personal_message(edit_notification, message.receiver_id)
    await manager.send_personal_message(edit_notification, user_id)
    
    return True

async def delete_message(user_id: int, message_id: int, db: Session):
    """Soft delete a message"""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == user_id
    ).first()
    
    if not message:
        return False
    
    message.is_deleted = True
    message.content = None
    db.commit()
    
    # Notify both parties
    delete_notification = {
        "type": "message_deleted",
        "message_id": message_id,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.send_personal_message(delete_notification, message.receiver_id)
    await manager.send_personal_message(delete_notification, user_id)
    
    return True

# Video/audio call signaling (WebRTC)
async def handle_call_signal(user_id: int, signal_data: dict, manager: ConnectionManager):
    """Handle WebRTC signaling for video/audio calls"""
    receiver_id = signal_data.get("receiver_id")
    signal_type = signal_data.get("signal_type")  # offer, answer, ice-candidate
    signal_payload = signal_data.get("payload")
    
    signal_message = {
        "type": "call_signal",
        "signal_type": signal_type,
        "sender_id": user_id,
        "payload": signal_payload,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.send_personal_message(signal_message, receiver_id)
