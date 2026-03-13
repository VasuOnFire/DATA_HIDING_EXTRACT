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
  Alert,
  LinearProgress,
  Paper,
  IconButton,
  Chip,
  Fade
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  LockOpen as LockOpenIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Audiotrack as AudioIcon,
  Videocam as VideoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { stegoAPI } from '../api';

const ExtractData = () => {
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
      setSuccess(null);
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

  const handleExtract = async () => {
    if (!file || !password) {
      setError('Please select a file and enter the password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await stegoAPI.extractFromImage(file, password);
      
      if (response.data.success) {
        setSuccess({
          message: response.data.extracted_text,
          filename: response.data.filename
        });
      } else {
        setError(response.data.error || 'Failed to extract data. Wrong password or no hidden data found.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Extraction failed. Invalid password or corrupted file.');
    } finally {
      setLoading(false);
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
              Extract Data
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Data Recovery - Extract Hidden Message
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Upload a stego file and enter the password to extract the hidden secret message.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* File Upload */}
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
              <SearchIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the stego file here' : 'Upload Stego File'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Drag and drop or click to select
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Chip icon={<ImageIcon />} label="Stego Images" sx={{ mr: 1 }} />
                <Chip icon={<AudioIcon />} label="Stego Audio" sx={{ mr: 1 }} />
                <Chip icon={<VideoIcon />} label="Stego Video" />
              </Box>
            </Paper>

            {file && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Selected file: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </Alert>
            )}

            {/* Password Input */}
            <TextField
              fullWidth
              type="password"
              label="Password Key"
              placeholder="Enter the password used during encryption"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              helperText="The same password used when hiding the data"
            />

            {/* Extract Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<LockOpenIcon />}
              onClick={handleExtract}
              disabled={loading || !file || !password}
              color="primary"
            >
              {loading ? 'Extracting...' : 'Extract Hidden Data'}
            </Button>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Extracting and decrypting data...
                </Typography>
              </Box>
            )}

            {/* Success Result */}
            {success && (
              <Fade in={true}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    mt: 4, 
                    p: 3, 
                    bgcolor: 'success.50',
                    border: '1px solid',
                    borderColor: 'success.main'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      Data Extracted Successfully!
                    </Typography>
                  </Box>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Hidden Message:
                  </Typography>
                  
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'white',
                      fontFamily: 'monospace',
                      wordBreak: 'break-word'
                    }}
                  >
                    <Typography variant="body1">
                      {success.message}
                    </Typography>
                  </Paper>

                  <Box mt={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(success.message);
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                  </Box>
                </Paper>
              </Fade>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ExtractData;
