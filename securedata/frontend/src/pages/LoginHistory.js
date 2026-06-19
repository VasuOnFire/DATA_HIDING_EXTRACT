import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
  Fade,
  Grid,
  Divider,
  Button,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Smartphone as SmartphoneIcon,
  Computer as ComputerIcon,
  Tablet as TabletIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  AccessTime as AccessTimeIcon,
  Public as PublicIcon,
  Devices as DevicesIcon,
  Fingerprint as FingerprintIcon
} from '@mui/icons-material';
import { historyAPI } from '../api';

const LoginHistory = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching login history...');
      const response = await historyAPI.getLoginHistory();
      console.log('Login history response:', response.data);
      
      if (Array.isArray(response.data)) {
        setHistory(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Failed to load login history:', err);
      setError(err.response?.data?.detail || 'Failed to load login history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const getDeviceIcon = (deviceType) => {
    const type = deviceType?.toLowerCase() || '';
    if (type.includes('mobile') || type.includes('android') || type.includes('iphone')) {
      return <SmartphoneIcon sx={{ color: '#4CAF50' }} />;
    } else if (type.includes('tablet') || type.includes('ipad')) {
      return <TabletIcon sx={{ color: '#FF9800' }} />;
    } else {
      return <ComputerIcon sx={{ color: '#2196F3' }} />;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(timestamp);
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <TableBody>
      {[1, 2, 3, 4, 5].map((item) => (
        <TableRow key={item}>
          <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell><Skeleton variant="text" width={120} /></TableCell>
          <TableCell><Skeleton variant="text" width={180} /></TableCell>
          <TableCell><Skeleton variant="rectangular" width={80} height={32} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  // Stats summary
  const stats = {
    total: history.length,
    active: history.filter(h => h.is_active).length,
    mobile: history.filter(h => h.device_type?.toLowerCase().includes('mobile')).length,
    desktop: history.filter(h => h.device_type?.toLowerCase().includes('desktop')).length
  };

  // Theme-based colors
  const colors = {
    bg: isDarkMode 
      ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
      : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8f0 50%, #f0f0f8 100%)',
    headerBg: isDarkMode ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)',
    headerBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    headerText: isDarkMode ? 'white' : theme.palette.text.primary,
    cardBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tableBg: isDarkMode ? 'rgba(0,0,0,0.3)' : theme.palette.background.paper,
    tableBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tableHeaderBg: isDarkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
    text: isDarkMode ? 'white' : theme.palette.text.primary,
    textSecondary: isDarkMode ? 'rgba(255,255,255,0.7)' : theme.palette.text.secondary,
    ipBg: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    stats: [
      { bg: isDarkMode ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.08)', color: '#2196F3' },
      { bg: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.08)', color: '#4CAF50' },
      { bg: isDarkMode ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.08)', color: '#FF9800' },
      { bg: isDarkMode ? 'rgba(156, 39, 176, 0.1)' : 'rgba(156, 39, 176, 0.08)', color: '#9C27B0' },
    ],
    successBg: isDarkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
    successColor: isDarkMode ? '#4CAF50' : '#2e7d32',
    warningBg: isDarkMode ? 'rgba(211, 47, 47, 0.2)' : 'rgba(211, 47, 47, 0.1)',
    warningColor: isDarkMode ? '#ffcdd2' : theme.palette.error.dark,
    securityTipBg: isDarkMode ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
    securityTipTitle: isDarkMode ? '#64b5f6' : theme.palette.primary.main,
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    rowBorder: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: isDarkMode ? '#0a0a0a' : '#f5f5f5',
      background: colors.bg
    }}>
      {/* Glassmorphism Header */}
      <Box sx={{ 
        background: colors.headerBg,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${colors.headerBorder}`,
        color: colors.headerText, 
        p: 2 
      }}>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton 
                onClick={handleBack} 
                sx={{ 
                  color: colors.headerText,
                  '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.headerText }}>
                  <SecurityIcon fontSize="small" />
                  Login History
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, color: colors.headerText }}>
                  Monitor your account security
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ 
                color: colors.headerText, 
                borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                '&:hover': { borderColor: colors.headerText, bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Stats Cards */}
        {!loading && !error && (
          <Fade in={!loading}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  bgcolor: colors.stats[0].bg, 
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${colors.cardBorder}`,
                  color: colors.text
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <DevicesIcon sx={{ fontSize: 32, color: colors.stats[0].color, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" sx={{ color: colors.text }}>{stats.total}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, color: colors.text }}>Total Logins</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  bgcolor: colors.stats[1].bg, 
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${colors.cardBorder}`,
                  color: colors.text
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <CheckCircleIcon sx={{ fontSize: 32, color: colors.stats[1].color, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" sx={{ color: colors.text }}>{stats.active}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, color: colors.text }}>Active Sessions</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  bgcolor: colors.stats[2].bg, 
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${colors.cardBorder}`,
                  color: colors.text
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <SmartphoneIcon sx={{ fontSize: 32, color: colors.stats[2].color, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" sx={{ color: colors.text }}>{stats.mobile}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, color: colors.text }}>Mobile Logins</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  bgcolor: colors.stats[3].bg, 
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${colors.cardBorder}`,
                  color: colors.text
                }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <ComputerIcon sx={{ fontSize: 32, color: colors.stats[3].color, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" sx={{ color: colors.text }}>{stats.desktop}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, color: colors.text }}>Desktop Logins</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Fade>
        )}

        {/* Main Content Card */}
        <Card sx={{ 
          bgcolor: colors.cardBg, 
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.cardBorder}`,
          color: colors.text
        }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.text }}>
                <FingerprintIcon color="primary" />
                Security Activity Log
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, color: colors.textSecondary }}>
                Track your account login activity and device information for security monitoring.
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3, bgcolor: colors.warningBg, color: colors.warningColor }}
                action={
                  <Button color="inherit" size="small" onClick={handleRefresh}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            )}

            <TableContainer 
              component={Paper} 
              variant="outlined" 
              sx={{ 
                bgcolor: colors.tableBg, 
                border: `1px solid ${colors.tableBorder}`,
                borderRadius: 2
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: colors.tableHeaderBg }}>
                    <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Device</TableCell>
                    <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Browser / OS</TableCell>
                    <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Location</TableCell>
                    <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>IP Address</TableCell>
                    <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Time</TableCell>
                    <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                {loading ? (
                  <LoadingSkeleton />
                ) : (
                  <TableBody>
                    {history.length > 0 ? (
                      history.map((record, index) => (
                        <Fade in={true} key={index} style={{ transitionDelay: `${index * 50}ms` }}>
                          <TableRow 
                            hover 
                            sx={{ 
                              '&:hover': { bgcolor: colors.hoverBg },
                              borderBottom: `1px solid ${colors.rowBorder}`
                            }}
                          >
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                {getDeviceIcon(record.device_type)}
                                <Typography variant="body2" sx={{ color: colors.text }}>
                                  {record.device_type || 'Unknown'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium" sx={{ color: colors.text }}>
                                  {record.browser || 'Unknown Browser'}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.6, color: colors.text }}>
                                  {record.os || 'Unknown OS'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <LocationIcon fontSize="small" sx={{ opacity: 0.5, color: colors.text }} />
                                <Typography variant="body2" sx={{ color: colors.text }}>
                                  {record.location || 'Unknown'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  bgcolor: colors.ipBg,
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  display: 'inline-block',
                                  color: colors.text,
                                  fontSize: '0.75rem'
                                }}
                              >
                                {record.ip_address || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={formatDate(record.login_time)}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <AccessTimeIcon fontSize="small" sx={{ opacity: 0.5, color: colors.text }} />
                                  <Typography variant="body2" sx={{ color: colors.text }}>
                                    {formatRelativeTime(record.login_time)}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {record.is_active ? (
                                <Chip
                                  icon={<CheckCircleIcon />}
                                  label="Success"
                                  color="success"
                                  size="small"
                                  sx={{ 
                                    bgcolor: colors.successBg,
                                    color: colors.successColor,
                                    fontWeight: 'bold'
                                  }}
                                />
                              ) : (
                                <Chip
                                  icon={<ErrorIcon />}
                                  label="Expired"
                                  color="default"
                                  size="small"
                                  variant="outlined"
                                  sx={{ 
                                    color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
                                  }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        </Fade>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <WarningIcon sx={{ fontSize: 48, opacity: 0.3, color: colors.text, mb: 2 }} />
                            <Typography variant="h6" sx={{ color: colors.text, mb: 1 }}>
                              No Login History Available
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.6, color: colors.text, maxWidth: 400, mx: 'auto' }}>
                              Your login activity will appear here after you successfully log in. 
                              This helps you monitor account security and detect suspicious activity.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                )}
              </Table>
            </TableContainer>

            {/* Security Tips - Glassmorphism Style */}
            <Box sx={{ 
              mt: 4, 
              p: 3, 
              bgcolor: colors.securityTipBg, 
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: `1px solid ${colors.cardBorder}`
            }}>
              <Typography variant="h6" gutterBottom sx={{ color: colors.securityTipTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon fontSize="small" />
                Security Tips
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" component="div" sx={{ pl: 2, color: colors.text, opacity: 0.8 }}>
                    <li>Review login history regularly for suspicious activity</li>
                    <li>Always log out from shared or public devices</li>
                    <li>Use strong, unique passwords</li>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" component="div" sx={{ pl: 2, color: colors.text, opacity: 0.8 }}>
                    <li>Enable two-factor authentication</li>
                    <li>Report unrecognized activity immediately</li>
                    <li>Keep your devices secure with updates</li>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginHistory;
