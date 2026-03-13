import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Timer as TimerIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { performanceAPI } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const Performance = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await performanceAPI.getEncryptionMetrics();
      setMetrics(response.data);
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Sample data for charts (in production, this would come from the API)
  const encryptionData = [
    { name: 'Small (1KB)', encryption: 12, decryption: 8 },
    { name: 'Medium (100KB)', encryption: 45, decryption: 32 },
    { name: 'Large (1MB)', encryption: 120, decryption: 95 },
  ];

  const stegoData = [
    { name: 'Image', psnr: 42.5, ssim: 0.98 },
    { name: 'Audio', psnr: 38.2, ssim: 0.95 },
    { name: 'Video', psnr: 40.1, ssim: 0.96 },
  ];

  const qualityRatings = [
    { range: 'PSNR > 40 dB, SSIM > 0.95', rating: 'Excellent', color: 'success' },
    { range: 'PSNR > 35 dB, SSIM > 0.90', rating: 'Very Good', color: 'success' },
    { range: 'PSNR > 30 dB, SSIM > 0.85', rating: 'Good', color: 'info' },
    { range: 'PSNR > 25 dB, SSIM > 0.70', rating: 'Fair', color: 'warning' },
    { range: 'PSNR < 25 dB or SSIM < 0.70', rating: 'Poor', color: 'error' },
  ];

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
              Performance Analysis
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          System Performance Metrics
        </Typography>

        {loading ? (
          <LinearProgress />
        ) : (
          <Grid container spacing={3}>
            {/* Encryption Performance Card */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <SecurityIcon color="primary" />
                    <Typography variant="h6" fontWeight="medium">
                      Encryption Performance
                    </Typography>
                  </Box>

                  {metrics && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {metrics.encryption_time_ms?.toFixed(2) || '--'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Encryption Time (ms)
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {metrics.decryption_time_ms?.toFixed(2) || '--'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Decryption Time (ms)
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  )}

                  <Typography variant="subtitle2" gutterBottom>
                    Processing Time by Payload Size
                  </Typography>
                  <Box sx={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={encryptionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="encryption" fill="#1976d2" name="Encrypt (ms)" />
                        <Bar dataKey="decryption" fill="#4caf50" name="Decrypt (ms)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Steganography Quality Card */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AssessmentIcon color="primary" />
                    <Typography variant="h6" fontWeight="medium">
                      Stego Quality Metrics
                    </Typography>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main" fontWeight="bold">
                          42.5
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Avg PSNR (dB)
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main" fontWeight="bold">
                          0.98
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Avg SSIM
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle2" gutterBottom>
                    Quality Scores by Media Type
                  </Typography>
                  <Box sx={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stegoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 1]} />
                        <Tooltip />
                        <Line yAxisId="left" type="monotone" dataKey="psnr" stroke="#1976d2" name="PSNR (dB)" />
                        <Line yAxisId="right" type="monotone" dataKey="ssim" stroke="#4caf50" name="SSIM" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Security Specifications */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Security Specifications
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 'medium' }}>
                            Symmetric Encryption
                          </TableCell>
                          <TableCell>
                            <Chip label="AES-256-CBC" color="primary" size="small" />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 'medium' }}>
                            Asymmetric Encryption
                          </TableCell>
                          <TableCell>
                            <Chip label="RSA-2048" color="primary" size="small" />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 'medium' }}>
                            Key Derivation
                          </TableCell>
                          <TableCell>
                            <Chip label="PBKDF2 (100k iterations)" color="primary" size="small" />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 'medium' }}>
                            Hash Algorithm
                          </TableCell>
                          <TableCell>
                            <Chip label="SHA-256" color="primary" size="small" />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 'medium' }}>
                            Steganography Method
                          </TableCell>
                          <TableCell>
                            <Chip label="LSB (Least Significant Bit)" color="primary" size="small" />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Quality Rating Scale */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Quality Rating Scale
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Steganography quality is measured using PSNR (Peak Signal-to-Noise Ratio) 
                    and SSIM (Structural Similarity Index).
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Metric Range</TableCell>
                          <TableCell>Rating</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {qualityRatings.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.range}</TableCell>
                            <TableCell>
                              <Chip
                                label={item.rating}
                                color={item.color}
                                size="small"
                                icon={<CheckCircleIcon />}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* System Information */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              System Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">High Performance</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Optimized encryption algorithms
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <SecurityIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Military-Grade</Typography>
                  <Typography variant="caption" color="text.secondary">
                    AES-256 + RSA-2048 encryption
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <StorageIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Minimal Overhead</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Efficient steganography embedding
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <TimerIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Real-time</Typography>
                  <Typography variant="caption" color="text.secondary">
                    WebSocket-based messaging
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Performance;
