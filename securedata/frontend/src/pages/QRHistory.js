import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Alert,
  Fade,
  Grow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  History as HistoryIcon,
  QrCode2 as QRIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  Visibility as VisibilityIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon
} from '@mui/icons-material';
import { qrAPI } from '../api';

const QRHistory = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const colors = {
    bg: isDarkMode
      ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
      : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8f0 50%, #f0f0f8 100%)',
    headerBg: isDarkMode ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)',
    cardBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    text: isDarkMode ? 'white' : theme.palette.text.primary,
    textSecondary: isDarkMode ? 'rgba(255,255,255,0.7)' : theme.palette.text.secondary,
    neonBlue: '#00d4ff',
    neonPurple: '#9d4edd',
    neonGreen: '#00ff88'
  };

  useEffect(() => {
    fetchQRHistory();
  }, []);

  const fetchQRHistory = async () => {
    try {
      setLoading(true);
      const response = await qrAPI.getQRHistory();
      setHistory(response.data.history || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch QR history');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleDownload = async (downloadUrl, filename) => {
    try {
      // Extract QR ID from download URL
      const qrId = downloadUrl.split('/').pop();
      
      // Use the configured API client which handles authentication automatically
      const response = await qrAPI.downloadQR(qrId);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download QR code. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <Box display="flex" alignItems="center" justifyContent="space-between">
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
                  <HistoryIcon fontSize="small" />
                  QR Code History
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, color: colors.text }}>
                  View all generated QR codes
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              onClick={() => navigate('/hide-qr')}
              sx={{
                borderColor: colors.neonBlue,
                color: colors.neonBlue,
                '&:hover': {
                  bgcolor: alpha(colors.neonBlue, 0.1),
                  borderColor: colors.neonBlue
                }
              }}
            >
              <QRIcon sx={{ mr: 1 }} />
              Generate New QR
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grow in={true}>
          <Card sx={{
            bgcolor: colors.cardBg,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${colors.cardBorder}`,
            color: colors.text
          }}>
            <CardContent>
              {history.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <QRIcon sx={{ fontSize: 80, color: alpha(colors.neonBlue, 0.3), mb: 3 }} />
                  <Typography variant="h6" sx={{ color: colors.text, mb: 2 }}>
                    No QR Codes Generated Yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3 }}>
                    You haven't created any QR codes. Generate your first encrypted QR code now!
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/hide-qr')}
                    sx={{
                      background: `linear-gradient(135deg, ${colors.neonBlue} 0%, ${colors.neonPurple} 100%)`,
                      color: 'white',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${colors.neonPurple} 0%, ${colors.neonBlue} 100%)`
                      }
                    }}
                  >
                    <QRIcon sx={{ mr: 1 }} />
                    Create Your First QR
                  </Button>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>ID</TableCell>
                        <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Filename</TableCell>
                        <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Created</TableCell>
                        <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Scans</TableCell>
                        <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((record, index) => (
                        <Fade in={true} key={record.id} style={{ transitionDelay: `${index * 100}ms` }}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                bgcolor: alpha(colors.neonBlue, 0.05)
                              },
                              borderBottom: `1px solid ${colors.cardBorder}`
                            }}
                          >
                            <TableCell sx={{ color: colors.text }}>
                              #{record.id}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: colors.neonBlue, fontFamily: 'monospace' }}>
                                {record.qr_filename}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: colors.textSecondary }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarIcon fontSize="small" />
                                {formatDate(record.timestamp)}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={record.scan_count}
                                size="small"
                                sx={{
                                  bgcolor: alpha(colors.neonPurple, 0.2),
                                  color: colors.neonPurple,
                                  fontWeight: 'bold'
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {record.is_active ? (
                                <Chip
                                  icon={<ActiveIcon fontSize="small" />}
                                  label="Active"
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(colors.neonGreen, 0.2),
                                    color: colors.neonGreen
                                  }}
                                />
                              ) : (
                                <Chip
                                  icon={<InactiveIcon fontSize="small" />}
                                  label="Inactive"
                                  size="small"
                                  sx={{
                                    bgcolor: alpha('#ff4757', 0.2),
                                    color: '#ff4757'
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Download QR Code">
                                <IconButton
                                  onClick={() => handleDownload(record.download_url, record.qr_filename)}
                                  sx={{
                                    color: colors.neonBlue,
                                    '&:hover': { bgcolor: alpha(colors.neonBlue, 0.1) }
                                  }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View QR">
                                <IconButton
                                  onClick={() => {
                                    const qrId = record.download_url.split('/').pop();
                                    qrAPI.downloadQR(qrId).then(response => {
                                      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
                                      window.open(url, '_blank');
                                    }).catch(err => {
                                      console.error('View error:', err);
                                      setError('Failed to view QR code');
                                    });
                                  }}
                                  sx={{
                                    color: colors.textSecondary,
                                    '&:hover': { bgcolor: alpha(colors.neonBlue, 0.1) }
                                  }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        </Fade>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grow>
      </Container>
    </Box>
  );
};

export default QRHistory;
