import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  TextField,
  Button,
  Grid,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { userAPI } from '../api';

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000';

const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [imgError, setImgError] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    phone: user?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const response = await userAPI.uploadProfileImage(file);
      updateUser({ profile_image: response.data.image_url });
      setSuccess('Profile image updated successfully');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await userAPI.updateProfile({
        full_name: formData.fullName,
        phone: formData.phone
      });
      updateUser({ full_name: formData.fullName, phone: formData.phone });
      setEditMode(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      await userAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
        <Container maxWidth="md">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack} sx={{ color: 'white' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="medium">
              Profile
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {/* Profile Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Box position="relative" display="inline-block">
              <Avatar
                key={user?.profile_image}
                src={getFullImageUrl(user?.profile_image)}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2, fontSize: 48, bgcolor: 'primary.main' }}
                imgProps={{
                  onError: (e) => {
                    setImgError(`Failed: ${e.target.src}`);
                  }
                }}
              >
                {user?.full_name?.[0] || 'U'}
              </Avatar>
              {imgError && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1, fontSize: '10px' }}>
                  {imgError}
                </Typography>
              )}
              <input
                accept="image/*"
                type="file"
                id="profile-image-input"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <label htmlFor="profile-image-input">
                <IconButton
                  component="span"
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: -8,
                    bgcolor: 'white',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                  size="small"
                >
                  <PhotoCameraIcon />
                </IconButton>
              </label>
            </Box>

            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {user?.full_name}
            </Typography>
            
            <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: 'primary.light', px: 2, py: 0.5, borderRadius: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight="medium" color="primary.contrastText">
                ID: {user?.id}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="medium">
                Profile Information
              </Typography>
              <Button
                startIcon={<EditIcon />}
                onClick={() => setEditMode(!editMode)}
                variant={editMode ? "outlined" : "text"}
              >
                {editMode ? 'Cancel' : 'Edit'}
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={user?.email}
                  disabled
                  helperText="Email cannot be changed"
                />
              </Grid>
            </Grid>

            {editMode && (
              <Box mt={3}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Security
            </Typography>
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={() => setShowPasswordDialog(true)}
              fullWidth
            >
              Change Password
            </Button>
          </CardContent>
        </Card>
      </Container>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              margin="normal"
              helperText="Min 8 chars, uppercase, lowercase, digit, special char"
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained" disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
