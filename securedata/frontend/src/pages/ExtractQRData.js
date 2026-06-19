import React, { useState, useRef, useEffect } from 'react';
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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCodeScanner as QRScannerIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Upload as UploadIcon,
  CameraAlt as CameraIcon,
  LockOpen as LockOpenIcon,
  Key as KeyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { qrAPI } from '../api';

const ExtractQRData = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const [tabValue, setTabValue] = useState(0);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [extractedMessage, setExtractedMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showResult, setShowResult] = useState(false);

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
    neonGreen: '#00ff88',
    neonRed: '#ff4757'
  };

  const handleBack = () => {
    stopCamera();
    navigate('/dashboard');
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    stopCamera();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedPreview(e.target.result);
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        // Start scanning loop
        scanIntervalRef.current = setInterval(() => {
          scanQRFromCamera();
        }, 500);
      }
    } catch (err) {
      setError('Could not access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const scanQRFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Try to decode QR using the canvas
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Simple approach: we'll use the backend for decoding
        // For now, we'll just capture the image and send it
      } catch (e) {
        // Ignore errors during scanning
      }
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'camera-qr.png', { type: 'image/png' });
    
    setUploadedFile(file);
    setUploadedPreview(canvas.toDataURL('image/png'));
    stopCamera();
    setTabValue(0); // Switch to upload tab
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter the secret password');
      return;
    }
    
    if (!uploadedFile && !scannedData) {
      setError('Please upload a QR code image first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (scannedData) {
        // Use direct data extraction for scanned QR
        response = await qrAPI.extractFromData(scannedData, password);
      } else if (uploadedFile) {
        // Use file upload extraction
        response = await qrAPI.extractFromQR(uploadedFile, password);
      }
      
      setExtractedMessage(response.data.message);
      setSuccess(true);
      setShowResult(true);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to extract data';
      if (errorMsg.includes('Invalid') || errorMsg.includes('password')) {
        setError('Invalid secret key or corrupted QR code. Please check your password and try again.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPassword('');
    setUploadedFile(null);
    setUploadedPreview(null);
    setScannedData(null);
    setExtractedMessage('');
    setSuccess(false);
    setShowResult(false);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualQRInput = (event) => {
    const data = event.target.value.trim();
    if (data) {
      setScannedData(data);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
                <QRScannerIcon fontSize="small" />
                Extract Data from QR
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, color: colors.text }}>
                Scan or upload a QR code to reveal the hidden secret
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Main Card */}
        <Grow in={true}>
          <Card sx={{
            bgcolor: colors.cardBg,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${colors.cardBorder}`,
            color: colors.text
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: colors.text }}>
                <LockOpenIcon sx={{ mr: 1, verticalAlign: 'middle', color: colors.neonBlue }} />
                Reveal Hidden Message
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {/* Tabs for Upload / Camera */}
              <Box sx={{ borderBottom: 1, borderColor: colors.cardBorder, mb: 3 }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{
                    '& .MuiTabs-flexContainer': { justifyContent: 'center' },
                    '& .MuiTab-root': { color: colors.textSecondary },
                    '& .Mui-selected': { color: colors.neonBlue + ' !important' }
                  }}
                >
                  <Tab icon={<UploadIcon />} label="Upload QR" />
                  <Tab icon={<CameraIcon />} label="Camera Scan" />
                </Tabs>
              </Box>

              {/* Upload Tab */}
              {tabValue === 0 && (
                <Fade in={true}>
                  <Box>
                    {!uploadedPreview ? (
                      <Box
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          border: `2px dashed ${colors.cardBorder}`,
                          borderRadius: 3,
                          p: 6,
                          textAlign: 'center',
                          cursor: 'pointer',
                          bgcolor: alpha(colors.neonBlue, 0.05),
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: colors.neonBlue,
                            bgcolor: alpha(colors.neonBlue, 0.1)
                          }
                        }}
                      >
                        <UploadIcon sx={{ fontSize: 60, color: colors.neonBlue, mb: 2 }} />
                        <Typography variant="h6" sx={{ color: colors.text, mb: 1 }}>
                          Drop QR Code Image Here
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                          or click to browse (PNG, JPG, JPEG)
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box
                          component="img"
                          src={uploadedPreview}
                          alt="Uploaded QR"
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 250,
                            borderRadius: 2,
                            boxShadow: `0 8px 32px ${alpha(colors.neonBlue, 0.3)}`
                          }}
                        />
                        <Button
                          onClick={() => {
                            setUploadedFile(null);
                            setUploadedPreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          size="small"
                          sx={{ mt: 1, color: colors.textSecondary }}
                        >
                          Remove
                        </Button>
                      </Box>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </Box>
                </Fade>
              )}

              {/* Camera Tab */}
              {tabValue === 1 && (
                <Fade in={true}>
                  <Box>
                    {!cameraActive ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CameraIcon sx={{ fontSize: 60, color: colors.neonBlue, mb: 2 }} />
                        <Typography variant="h6" sx={{ color: colors.text, mb: 2 }}>
                          Scan QR Code with Camera
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<CameraIcon />}
                          onClick={startCamera}
                          sx={{
                            bgcolor: colors.neonBlue,
                            color: 'white',
                            '&:hover': { bgcolor: alpha(colors.neonBlue, 0.8) }
                          }}
                        >
                          Start Camera
                        </Button>
                        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: colors.textSecondary }}>
                          Or paste QR data manually:
                        </Typography>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Paste raw QR data here..."
                          onChange={handleManualQRInput}
                          sx={{
                            mt: 1,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: colors.inputBg,
                              color: colors.text,
                              '& fieldset': { borderColor: colors.cardBorder }
                            }
                          }}
                        />
                      </Box>
                    ) : (
                      <Box sx={{ position: 'relative', textAlign: 'center' }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{
                            width: '100%',
                            maxHeight: 400,
                            borderRadius: 12,
                            boxShadow: `0 8px 32px ${alpha(colors.neonBlue, 0.3)}`
                          }}
                        />
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                          <Button
                            variant="contained"
                            onClick={captureAndScan}
                            sx={{
                              bgcolor: colors.neonGreen,
                              color: '#000',
                              fontWeight: 'bold',
                              '&:hover': { bgcolor: alpha(colors.neonGreen, 0.8) }
                            }}
                          >
                            Capture & Scan
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={stopCamera}
                            sx={{
                              borderColor: colors.neonRed,
                              color: colors.neonRed,
                              '&:hover': { bgcolor: alpha(colors.neonRed, 0.1) }
                            }}
                          >
                            Stop
                          </Button>
                        </Box>
                      </Box>
                    )}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </Box>
                </Fade>
              )}

              {/* Password Input */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: colors.textSecondary }}>
                  <KeyIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                  Enter the secret password to decrypt the message:
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Secret Password"
                  placeholder="Enter the password used when creating this QR code"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: colors.inputBg,
                      color: colors.text,
                      '& fieldset': { borderColor: colors.cardBorder },
                      '&:hover fieldset': { borderColor: colors.neonBlue },
                    },
                    '& .MuiInputLabel-root': { color: colors.textSecondary }
                  }}
                  InputProps={{
                    startAdornment: <KeyIcon sx={{ mr: 1, color: colors.textSecondary }} />,
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
              </Box>

              {loading && <LinearProgress sx={{ mt: 3 }} />}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleExtract}
                disabled={loading || (!uploadedFile && !scannedData) || !password.trim()}
                sx={{
                  mt: 3,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${colors.neonGreen} 0%, ${colors.neonBlue} 100%)`,
                  color: '#000',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${colors.neonBlue} 0%, ${colors.neonGreen} 100%)`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px ${alpha(colors.neonGreen, 0.4)}`
                  },
                  '&:disabled': {
                    background: alpha(colors.neonGreen, 0.3),
                    color: 'rgba(0,0,0,0.3)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Decrypting...' : '🔓 Extract Secret Message'}
              </Button>
            </CardContent>
          </Card>
        </Grow>

        {/* Security Info */}
        <Fade in={true} style={{ transitionDelay: '200ms' }}>
          <Card sx={{
            mt: 3,
            bgcolor: alpha(colors.neonRed, 0.1),
            border: `1px solid ${alpha(colors.neonRed, 0.3)}`,
            color: colors.text
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.text }}>
                <WarningIcon fontSize="small" />
                Security Warning
              </Typography>
              <Box component="ul" sx={{ pl: 2, color: colors.textSecondary, m: 0 }}>
                <li>Only decrypt QR codes from trusted sources</li>
                <li>Ensure you are using the correct password</li>
                <li>Invalid passwords will not reveal any data (AES-256 security)</li>
                <li>Report suspicious QR codes to your administrator</li>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Container>

      {/* Result Dialog */}
      <Dialog
        open={showResult}
        onClose={() => setShowResult(false)}
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
        <DialogTitle sx={{
          color: colors.text,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${colors.cardBorder}`
        }}>
          <CheckCircleIcon sx={{ color: colors.neonGreen }} />
          Secret Message Revealed!
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Card sx={{
            bgcolor: alpha(colors.neonGreen, 0.1),
            border: `1px solid ${alpha(colors.neonGreen, 0.3)}`,
            p: 2
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: colors.textSecondary }}>
              Decrypted Message:
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: colors.text,
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                bgcolor: alpha(colors.neonGreen, 0.05),
                p: 2,
                borderRadius: 1
              }}
            >
              {extractedMessage}
            </Typography>
          </Card>
          <Chip
            icon={<CheckCircleIcon />}
            label="AES-256 Decryption Successful"
            sx={{
              mt: 2,
              bgcolor: alpha(colors.neonGreen, 0.2),
              color: colors.neonGreen,
              borderColor: colors.neonGreen
            }}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleReset}
            sx={{
              bgcolor: colors.neonBlue,
              color: 'white',
              '&:hover': { bgcolor: alpha(colors.neonBlue, 0.8) }
            }}
          >
            Decrypt Another
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              navigator.clipboard.writeText(extractedMessage);
            }}
            sx={{
              borderColor: colors.cardBorder,
              color: colors.text,
              '&:hover': { borderColor: colors.neonBlue }
            }}
          >
            Copy Message
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExtractQRData;
