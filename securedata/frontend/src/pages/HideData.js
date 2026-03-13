import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Grid,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Security as SecurityIcon,
  AutoFixHigh as AutoFixHighIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Audiotrack as AudioIcon,
  Videocam as VideoIcon
} from '@mui/icons-material';
import { stegoAPI } from '../api';

const HideData = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState(0);
  const [file, setFile] = useState(null);
  const [secretText, setSecretText] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('nature');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const themes = [
    { id: 'animals', name: 'Animals', icon: '🦁' },
    { id: 'village', name: 'Village', icon: '🏘️' },
    { id: 'forest', name: 'Forest', icon: '🌲' },
    { id: 'city', name: 'City', icon: '🏙️' },
    { id: 'ocean', name: 'Ocean', icon: '🌊' },
    { id: 'nature', name: 'Nature', icon: '🌿' },
  ];

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'audio/*': ['.wav'],
      'video/*': ['.mp4']
    },
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleEmbed = async () => {
    if (!secretText || !password) {
      setError('Please enter secret text and password');
      return;
    }

    if (activeTab === 0 && !file) {
      setError('Please select a file to hide data in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      
      if (activeTab === 0) {
        // Embed in uploaded file
        response = await stegoAPI.embedInImage(file, secretText, password);
      } else {
        // Auto-generate cover media
        const mediaType = file?.type?.startsWith('audio') ? 'audio' : 'image';
        response = await stegoAPI.autoGenerate(secretText, password, mediaType, selectedTheme);
      }

      setSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to hide data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (success?.download_url) {
      const link = document.createElement('a');
      link.href = success.download_url;
      link.download = success.stego_filename || 'stego_file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack} sx={{ color: 'white' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="medium">
              Hide Data
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Steganography - Hide Secret Data
            </Typography>
            
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ mb: 3 }}
            >
              <Tab 
                icon={<CloudUploadIcon />} 
                label="Upload Media" 
              />
              <Tab 
                icon={<AutoFixHighIcon />} 
                label="Auto Generate" 
              />
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Mode A: Upload Media */}
            {activeTab === 0 && (
              <Box>
                <Paper
                  {...getRootProps()}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'grey.300',
                    bgcolor: isDragActive ? 'primary.50' : 'grey.50',
                    cursor: 'pointer',
                    mb: 3
                  }}
                >
                  <input {...getInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    or click to select file
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip icon={<ImageIcon />} label="PNG, JPG" sx={{ mr: 1 }} />
                    <Chip icon={<AudioIcon />} label="WAV" sx={{ mr: 1 }} />
                    <Chip icon={<VideoIcon />} label="MP4" />
                  </Box>
                </Paper>

                {file && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Selected file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </Alert>
                )}
              </Box>
            )}

            {/* Mode B: Auto Generate */}
            {activeTab === 1 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Select Theme for Generated Media
                </Typography>
                <Grid container spacing={2}>
                  {themes.map((theme) => (
                    <Grid item xs={6} sm={4} md={2} key={theme.id}>
                      <Paper
                        onClick={() => setSelectedTheme(theme.id)}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: selectedTheme === theme.id ? 2 : 1,
                          borderColor: selectedTheme === theme.id ? 'primary.main' : 'grey.200',
                          bgcolor: selectedTheme === theme.id ? 'primary.50' : 'white'
                        }}
                      >
                        <Typography variant="h3" sx={{ mb: 1 }}>
                          {theme.icon}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {theme.name}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Secret Text Input */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Secret Message"
              placeholder="Enter the secret message you want to hide..."
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              sx={{ mb: 3 }}
              helperText="This text will be encrypted and hidden in the media file"
            />

            {/* Password Input */}
            <TextField
              fullWidth
              type="password"
              label="Password Key"
              placeholder="Enter a strong password for encryption"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              helperText="This password will be required to extract the data later"
            />

            {/* Action Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<SecurityIcon />}
              onClick={handleEmbed}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Hide Data'}
            </Button>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Encrypting and embedding data... This may take a moment.
                </Typography>
              </Box>
            )}

            {/* Success Result */}
            {success && (
              <Alert severity="success" sx={{ mt: 3 }}>
                <Typography fontWeight="medium" gutterBottom>
                  Data hidden successfully!
                </Typography>
                
                {success.metrics && (
                  <Box sx={{ mt: 1 }}>
                    <Chip label={`PSNR: ${success.metrics.psnr} dB`} size="small" sx={{ mr: 1 }} />
                    <Chip label={`SSIM: ${success.metrics.ssim}`} size="small" />
                  </Box>
                )}
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  sx={{ mt: 2 }}
                >
                  Download Stego File
                </Button>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default HideData;
