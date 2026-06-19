import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  IconButton,
  Alert,
  Fade,
  Grow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCode2 as QRIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { qrAPI } from '../api';

const HideQRData = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const qrRef = useRef(null);

  const [secretMessage, setSecretMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedQR, setGeneratedQR] = useState(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Theme-based colors
  const colors = {
    bg: isDarkMode
      ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
      : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8f0 50%, #f0f0f8 100%)',
    headerBg: isDarkMode ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)',
    cardBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    text: isDarkMode ? 'white' : theme.palette.text.primary,
    textSecondary: isDarkMode ? 'rgba(255,255,255,0.7)' : theme.palette.text.secondary,
    inputBg: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
    neonBlue: '#00d4ff',
    neonPurple: '#9d4edd'
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    
    if (!secretMessage.trim()) {
      setError('Please enter a secret message');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a secret password');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await qrAPI.generateQR(secretMessage, password);
      setGeneratedQR(response.data);
      setSuccess(true);
      setShowQRDialog(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedQR?.base64_image) {
      const link = document.createElement('a');
      link.href = generatedQR.base64_image;
      link.download = `secure-qr-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (generatedQR?.base64_image && navigator.share) {
      try {
        const response = await fetch(generatedQR.base64_image);
        const blob = await response.blob();
        const file = new File([blob], 'secure-qr.png', { type: 'image/png' });
        
        await navigator.share({
          title: 'Secure QR Code',
          text: 'Here is your encrypted QR code',
          files: [file]
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    }
  };

  const handleCopyImage = () => {
    if (generatedQR?.base64_image) {
      navigator.clipboard.writeText(generatedQR.base64_image);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setSecretMessage('');
    setPassword('');
    setGeneratedQR(null);
    setSuccess(false);
    setError('');
    setShowQRDialog(false);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: isDarkMode ? '#0a0a0a' : '#f5f5f5',
      background: colors.bg
    }}>
      {/* Header */}
      <Box sx={{
        background: colors.headerBg,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${colors.cardBorder}`,
        color: colors.text,
        p: 2
      }}>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={handleBack}
              sx={{
                color: colors.text,
                '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.text }}>
                <QRIcon fontSize="small" />
                Hide Data in QR
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, color: colors.text }}>
                Encrypt and hide your secrets in a QR code
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Info Card */}
        <Fade in={true}>
          <Card sx={{
            mb: 3,
            bgcolor: alpha(colors.neonBlue, 0.1),
            border: `1px solid ${alpha(colors.neonBlue, 0.3)}`,
            color: colors.text
          }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8, color: colors.text }}>
                <strong>🔒 How it works:</strong> Your secret message is encrypted using AES-256 encryption
                and embedded into a QR code. Only someone with the correct password can extract and decrypt
                the hidden message.
              </Typography>
            </CardContent>
          </Card>
        </Fade>

        {/* Main Form Card */}
        <Grow in={true}>
          <Card sx={{
            bgcolor: colors.cardBg,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${colors.cardBorder}`,
            color: colors.text
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: colors.text }}>
                <LockIcon sx={{ mr: 1, verticalAlign: 'middle', color: colors.neonBlue }} />
                Encrypt Your Message
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleGenerateQR}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Secret Message"
                  placeholder="Enter your secret message here..."
                  value={secretMessage}
                  onChange={(e) => setSecretMessage(e.target.value)}
                  disabled={loading}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: colors.inputBg,
                      color: colors.text,
                      '& fieldset': { borderColor: colors.cardBorder },
                      '&:hover fieldset': { borderColor: colors.neonBlue },
                    },
                    '& .MuiInputLabel-root': { color: colors.textSecondary }
                  }}
                  InputProps={{
                    startAdornment: <MessageIcon sx={{ mr: 1, color: colors.textSecondary }} />
                  }}
                />

                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Secret Password"
                  placeholder="Enter a strong password to encrypt your message"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: colors.inputBg,
                      color: colors.text,
                      '& fieldset': { borderColor: colors.cardBorder },
                      '&:hover fieldset': { borderColor: colors.neonBlue },
                    },
                    '& .MuiInputLabel-root': { color: colors.textSecondary }
                  }}
                  InputProps={{
                    startAdornment: <LockIcon sx={{ mr: 1, color: colors.textSecondary }} />,
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: colors.textSecondary }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                />

                <Typography variant="caption" sx={{ display: 'block', mb: 3, color: colors.textSecondary }}>
                  💡 <strong>Tip:</strong> Remember this password! Without it, the message cannot be recovered.
                </Typography>

                {loading && <LinearProgress sx={{ mb: 3 }} />}

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !secretMessage.trim() || !password.trim()}
                  sx={{
                    py: 1.5,
                    background: `linear-gradient(135deg, ${colors.neonBlue} 0%, ${colors.neonPurple} 100%)`,
                    color: 'white',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${colors.neonPurple} 0%, ${colors.neonBlue} 100%)`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(colors.neonBlue, 0.4)}`
                    },
                    '&:disabled': {
                      background: alpha(colors.neonBlue, 0.3)
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {loading ? 'Generating Encrypted QR...' : '🔐 Generate Secure QR Code'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grow>

        {/* Additional Info */}
        <Fade in={true} style={{ transitionDelay: '200ms' }}>
          <Card sx={{
            mt: 3,
            bgcolor: alpha(colors.neonPurple, 0.1),
            border: `1px solid ${alpha(colors.neonPurple, 0.3)}`,
            color: colors.text
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text }}>
                🛡️ Security Features
              </Typography>
              <Box component="ul" sx={{ pl: 2, color: colors.textSecondary }}>
                <li>AES-256 encryption with PBKDF2 key derivation</li>
                <li>Random salt and initialization vector (IV)</li>
                <li>Base64 encoded payload for QR compatibility</li>
                <li>High error correction for reliable scanning</li>
                <li>Timestamp embedded for tracking</li>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Container>

      {/* QR Code Display Dialog */}
      <Dialog
        open={showQRDialog}
        onClose={() => setShowQRDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: colors.cardBg,
            color: colors.text,
            border: `1px solid ${colors.cardBorder}`
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text }}>
          🎉 Your Encrypted QR Code is Ready!
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {generatedQR?.base64_image && (
              <Box
                component="img"
                src={generatedQR.base64_image}
                alt="Generated QR Code"
                sx={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 2,
                  boxShadow: `0 8px 32px ${alpha(colors.neonBlue, 0.3)}`
                }}
              />
            )}
            <Typography variant="body2" sx={{ mt: 2, color: colors.textSecondary }}>
              Scan this QR code and enter the password to reveal your secret message.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{
              bgcolor: colors.neonBlue,
              color: 'white',
              '&:hover': { bgcolor: alpha(colors.neonBlue, 0.8) }
            }}
          >
            Download
          </Button>
          <Button
            variant="outlined"
            startIcon={copied ? <CheckCircleIcon /> : <CopyIcon />}
            onClick={handleCopyImage}
            sx={{
              borderColor: colors.cardBorder,
              color: colors.text,
              '&:hover': { borderColor: colors.neonBlue, bgcolor: alpha(colors.neonBlue, 0.1) }
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          {navigator.share && (
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              sx={{
                borderColor: colors.cardBorder,
                color: colors.text,
                '&:hover': { borderColor: colors.neonPurple, bgcolor: alpha(colors.neonPurple, 0.1) }
              }}
            >
              Share
            </Button>
          )}
        </DialogActions>
        <Box sx={{ textAlign: 'center', pb: 2 }}>
          <Button
            onClick={handleReset}
            size="small"
            sx={{ color: colors.textSecondary }}
          >
            Create Another QR
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default HideQRData;
