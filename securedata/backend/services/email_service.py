"""Email service for sending OTP emails via SMTP."""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

def send_otp_email(to_email: str, otp: str, full_name: str) -> bool:
    """Send OTP email to user."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", smtp_user)
    
    if not smtp_user or not smtp_password:
        # Print OTP to console if email is not configured
        print(f"\n[OTP for {full_name} ({to_email}): {otp}]\n")
        return True
    
    try:
        msg = MIMEMultipart()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = "SECUREDATA - Your OTP Code"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #1976d2;">SECUREDATA Verification</h2>
            <p>Hello {full_name},</p>
            <p>Your OTP code is:</p>
            <h1 style="color: #1976d2; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
            <p>This code will expire in 2 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">SECUREDATA - Hybrid Encryption Platform</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, "html"))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        # Fallback: print OTP to console
        print(f"\n[OTP for {full_name} ({to_email}): {otp}]\n")
        return True


def send_password_reset_email(to_email: str, reset_token: str, full_name: str) -> bool:
    """Send password reset email to user."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", smtp_user)
    
    # For local development, just print the reset link
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
    print(f"\n[Password Reset for {full_name} ({to_email}): {reset_url}]\n")
    
    if not smtp_user or not smtp_password:
        return True
    
    try:
        msg = MIMEMultipart()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = "SECUREDATA - Password Reset Request"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #1976d2;">SECUREDATA Password Reset</h2>
            <p>Hello {full_name},</p>
            <p>You requested a password reset. Click the link below:</p>
            <p><a href="{reset_url}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>Or copy this link: {reset_url}</p>
            <p>This link will expire in 30 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">SECUREDATA - Hybrid Encryption Platform</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, "html"))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return True
