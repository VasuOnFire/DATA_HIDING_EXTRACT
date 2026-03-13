import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
import logging

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """Send an email using SMTP"""
    try:
        # Check if SMTP is configured
        smtp_host = getattr(settings, 'SMTP_HOST', None)
        smtp_port = getattr(settings, 'SMTP_PORT', None)
        smtp_user = getattr(settings, 'SMTP_USER', None)
        smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        from_email = getattr(settings, 'FROM_EMAIL', smtp_user)
        
        if not all([smtp_host, smtp_port, smtp_user, smtp_password]):
            logger.warning("SMTP not configured. Email not sent.")
            return False
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email
        
        # Add text and HTML parts
        if text_content:
            msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        logger.info(f"Email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

def send_otp_email(to_email: str, otp_code: str, purpose: str = "signup") -> bool:
    """Send OTP verification email"""
    
    if purpose == "signup":
        subject = "SECUREDATA - Verify Your Account"
        title = "Account Verification"
        message = "Thank you for signing up with SECUREDATA. Please use the following OTP to verify your account:"
    elif purpose == "password_reset":
        subject = "SECUREDATA - Password Reset"
        title = "Password Reset"
        message = "You have requested to reset your password. Please use the following OTP to proceed:"
    else:
        subject = "SECUREDATA - Verification Code"
        title = "Verification Code"
        message = "Please use the following verification code:"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #1976d2; color: white; padding: 20px; text-align: center; }}
            .content {{ background: #f9f9f9; padding: 30px; margin: 20px 0; }}
            .otp {{ font-size: 32px; font-weight: bold; color: #1976d2; 
                   letter-spacing: 8px; padding: 20px; background: white; 
                   border: 2px dashed #1976d2; text-align: center; margin: 20px 0; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
            .warning {{ color: #d32f2f; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>SECUREDATA</h1>
                <p>Secure Communication Platform</p>
            </div>
            <div class="content">
                <h2>{title}</h2>
                <p>Hello,</p>
                <p>{message}</p>
                <div class="otp">{otp_code}</div>
                <p class="warning">This OTP will expire in 2 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2024 SECUREDATA. All rights reserved.</p>
                <p>This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    SECUREDATA - {title}
    
    Hello,
    
    {message}
    
    Your OTP code is: {otp_code}
    
    This OTP will expire in 2 minutes.
    
    If you did not request this, please ignore this email.
    
    © 2024 SECUREDATA
    """
    
    return send_email(to_email, subject, html_content, text_content)
