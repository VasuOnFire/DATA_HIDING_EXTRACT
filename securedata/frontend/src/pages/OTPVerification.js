import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Security, Timer } from '@mui/icons-material';
import { authAPI } from '../api';
import useAuthStore from '../store/authStore';

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setPendingOTP } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const userId = location.state?.userId;
  const fromSignup = location.state?.fromSignup || false;
  const email = location.state?.email || '';
  const testOtp = location.state?.otp || ''; // OTP passed from signup for testing
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userId, navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.resendOTP(userId, fromSignup ? 'signup' : 'login');
      setTimeLeft(120);
      setError('');
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  const handleSubmit = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (timeLeft === 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOTP(
        userId, 
        otpCode, 
        fromSignup ? 'signup' : 'login'
      );

      const data = response.data;

      if (data.success) {
        setShowSuccess(true);
        
        if (data.access_token) {
          login(data.user, data.access_token);
        }
        
        // Navigate immediately without timeout for better reliability
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Card elevation={4} sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Security color="primary" sx={{ fontSize: 64, mb: 2 }} />
            
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Verify Your Identity
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Enter the 6-digit OTP sent to your device
            </Typography>

            {/* Show OTP for testing when email not configured */}
            {testOtp && (
              <Alert severity="info" sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Development Mode:</strong> Email not configured.
                </Typography>
                <Typography variant="h5" fontWeight="bold" letterSpacing={4}>
                  Your OTP: {testOtp}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Use this code to verify your account
                </Typography>
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="center" gap={1} mb={2}>
                {otp.map((digit, index) => (
                  <TextField
                    key={index}
                    inputRef={(el) => (inputRefs.current[index] = el)}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    inputProps={{
                      maxLength: 1,
                      style: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }
                    }}
                    sx={{ width: 56 }}
                    variant="outlined"
                  />
                ))}
              </Box>

              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <Timer color={timeLeft < 30 ? 'error' : 'action'} />
                <Typography
                  variant="body2"
                  color={timeLeft < 30 ? 'error' : 'text.secondary'}
                  fontWeight={timeLeft < 30 ? 'bold' : 'normal'}
                >
                  {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'Expired'}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || timeLeft === 0}
              sx={{ mb: 2 }}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                'Verify OTP'
              )}
            </Button>

            {timeLeft === 0 && (
              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={handleResend}
                sx={{ mb: 2 }}
              >
                Resend OTP
              </Button>
            )}

            <Typography variant="body2" color="text.secondary">
              User ID: <strong>{userId}</strong>
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Success Dialog */}
      <Dialog open={showSuccess}>
        <DialogTitle>Verification Successful!</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Your account has been verified successfully!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You will be redirected to the dashboard shortly...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            onClick={() => navigate('/dashboard')}
            autoFocus
          >
            Go to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OTPVerification;
