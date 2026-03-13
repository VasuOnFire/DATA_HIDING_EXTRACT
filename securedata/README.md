# SECUREDATA

## Hybrid Encryption & Steganography Communication Platform

SECUREDATA is a full-stack cybersecurity web application that provides dual-layer security combining hybrid encryption (AES-256 + RSA-2048) and steganography to protect sensitive data during transmission and storage.

## Features

### Core Security Features
- **Hybrid Encryption**: AES-256 symmetric + RSA-2048 asymmetric encryption
- **Steganography Engine**: Hide encrypted data in images, audio, and video files
- **Auto Media Generation**: Automatically generate cover media (images, audio, video)
- **PBKDF2 Key Derivation**: Secure password-based key derivation

### Communication Features
- **Real-time Messaging**: WhatsApp-style chat with WebSockets
- **Encrypted Chat Messages**: End-to-end encryption for all messages
- **Connection System**: Connect using unique User IDs (e.g., SEC-92X3A)
- **Online Status & Typing Indicators**: Real-time presence detection

### Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **OTP Verification**: 6-digit OTP with 2-minute expiration
- **bcrypt Password Hashing**: Secure password storage
- **Login History Tracking**: Device, browser, OS, IP, and location tracking

### User Features
- **Profile Management**: Update profile, upload images, change passwords
- **Theme System**: Light and Dark mode support
- **Dashboard**: Overview of connections, security score, and quick actions
- **Performance Analysis**: Encryption/decryption metrics and stego quality (PSNR, SSIM)

## Technology Stack

### Backend
- **Framework**: Python FastAPI
- **Database**: PostgreSQL
- **Real-time**: WebSockets
- **Libraries**: PyCryptodome, OpenCV, Pillow, NumPy, scikit-image

### Frontend
- **Framework**: React.js
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand
- **Charts**: Recharts
- **HTTP Client**: Axios

## Project Structure

```
securedata/
├── backend/
│   ├── auth/             # Authentication (signup, login, OTP)
│   ├── chat/             # WebSocket chat system
│   ├── database/         # Database models and schema
│   ├── encryption/       # Hybrid encryption (AES + RSA)
│   ├── performance/      # Performance metrics
│   ├── steganography/    # Steganography engine (embed/extract)
│   ├── storage/          # Media storage utilities
│   ├── main.py           # FastAPI application entry
│   ├── config.py         # Configuration settings
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend container config
├── frontend/
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── api/          # API service layer
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand stores
│   │   ├── App.js        # Main application
│   │   └── index.js      # Entry point
│   ├── package.json      # Node dependencies
│   ├── nginx.conf        # Nginx configuration
│   └── Dockerfile        # Frontend container config
├── database/
│   └── schema.sql        # PostgreSQL schema
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # This file
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Local Development Setup

1. **Clone the repository**
```bash
cd securedata
```

2. **Set up the Backend**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python -c "from database.models import init_db, get_engine; init_db(get_engine())"

# Run the backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. **Set up the Frontend**
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/profile-image` - Upload profile image
- `PUT /api/user/password` - Change password
- `PUT /api/user/theme` - Update theme preference

### Connections
- `GET /api/connections` - List connections
- `GET /api/connections/pending` - List pending requests
- `POST /api/connections/request` - Send connection request
- `POST /api/connections/respond` - Accept/reject request

### Chat
- `GET /api/chat/messages/{contact_id}` - Get chat messages
- `WS /ws/chat` - WebSocket for real-time messaging

### Steganography
- `POST /api/stego/embed-image` - Hide data in image
- `POST /api/stego/extract-image` - Extract data from image
- `POST /api/stego/auto-generate` - Generate stego media

### Performance
- `GET /api/performance/encryption` - Get encryption metrics

## Security Specifications

| Feature | Specification |
|---------|--------------|
| Symmetric Encryption | AES-256-CBC |
| Asymmetric Encryption | RSA-2048 |
| Key Derivation | PBKDF2 (100,000 iterations) |
| Hash Algorithm | SHA-256 |
| Password Hashing | bcrypt |
| Token Algorithm | HS256 (JWT) |
| Steganography | LSB (Least Significant Bit) |
| OTP Expiry | 2 minutes |

## Steganography Quality Metrics

| Metric | Good | Excellent |
|--------|------|-----------|
| PSNR | > 30 dB | > 40 dB |
| SSIM | > 0.85 | > 0.95 |

## Supported File Formats

### Input (for hiding data)
- **Images**: PNG, JPG, JPEG, BMP
- **Audio**: WAV
- **Video**: MP4 (frame embedding)

### Output (stego files)
- **Images**: PNG (recommended for lossless)
- **Audio**: WAV
- **Video**: MP4

## System Requirements

### Minimum
- RAM: 512 MB
- Disk: 40 GB
- OS: Windows, Linux, macOS

### Recommended
- RAM: 2 GB+
- Disk: 100 GB SSD
- Multi-core processor

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Style
- Backend: PEP 8
- Frontend: ESLint with React rules

## License

This project is for educational and demonstration purposes.

## Security Notice

This application is designed for secure communication. However:
- Never store decrypted secret data
- Always use strong passwords
- Keep your private keys secure
- Report any security vulnerabilities immediately

## Support

For issues, questions, or contributions, please contact the development team.

---

**SECUREDATA** - Protecting Your Digital Communications
