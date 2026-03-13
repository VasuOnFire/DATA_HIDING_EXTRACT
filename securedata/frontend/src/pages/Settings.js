import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Switch,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { userAPI } from '../api';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, setTheme } = useAuthStore();
  
  const [darkMode, setDarkMode] = useState(user?.theme === 'dark');
  const [notifications, setNotifications] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleThemeToggle = async () => {
    const newTheme = darkMode ? 'light' : 'dark';
    setDarkMode(!darkMode);
    setTheme(newTheme);
    
    try {
      await userAPI.updateTheme(newTheme);
      setSuccess('Theme updated successfully');
    } catch (err) {
      setError('Failed to update theme');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    // This would make an API call to delete the account
    setShowDeleteDialog(false);
    logout();
    navigate('/login');
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
              Settings
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {/* Appearance */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Appearance
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                </ListItemIcon>
                <ListItemText
                  primary="Dark Mode"
                  secondary="Switch between light and dark themes"
                />
                <Switch
                  edge="end"
                  checked={darkMode}
                  onChange={handleThemeToggle}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Notifications
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Push Notifications"
                  secondary="Receive notifications for messages and connection requests"
                />
                <Switch
                  edge="end"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Security */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Security
            </Typography>
            <List>
              <ListItemButton onClick={() => navigate('/profile')}>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Change Password"
                  secondary="Update your account password"
                />
              </ListItemButton>
              <Divider />
              <ListItemButton onClick={() => navigate('/login-history')}>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Login History"
                  secondary="View your recent login activity"
                />
              </ListItemButton>
            </List>
          </CardContent>
        </Card>

        {/* About */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              About
            </Typography>
            <List>
              <ListItemButton onClick={() => setShowAboutDialog(true)}>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="About SECUREDATA"
                  secondary="Version 1.0.0"
                />
              </ListItemButton>
            </List>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold" color="error">
              Danger Zone
            </Typography>
            <List>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  secondary="Sign out of your account"
                  primaryTypographyProps={{ color: 'error' }}
                />
              </ListItemButton>
              <Divider />
              <ListItemButton onClick={() => setShowDeleteDialog(true)}>
                <ListItemIcon>
                  <DeleteIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Delete Account"
                  secondary="Permanently delete your account and all data"
                  primaryTypographyProps={{ color: 'error' }}
                />
              </ListItemButton>
            </List>
          </CardContent>
        </Card>
      </Container>

      {/* About Dialog */}
      <Dialog open={showAboutDialog} onClose={() => setShowAboutDialog(false)}>
        <DialogTitle>About SECUREDATA</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            SECUREDATA is a Hybrid Encryption & Steganography Communication Platform that provides dual-layer security for your sensitive communications.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>Features:</Typography>
          <Typography component="ul" variant="body2">
            <li>AES-256 + RSA-2048 Hybrid Encryption</li>
            <li>Image, Audio & Video Steganography</li>
            <li>Real-time Secure Messaging</li>
            <li>Auto-generated Cover Media</li>
            <li>JWT + OTP Authentication</li>
          </Typography>
          <Box mt={2}>
            <Chip label="Version 1.0.0" size="small" />
            <Chip label="Build 2024" size="small" sx={{ ml: 1 }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAboutDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle color="error">Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone. All your data will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete your account? This will remove:
          </Typography>
          <Typography component="ul" variant="body2">
            <li>Your profile and personal information</li>
            <li>All messages and chat history</li>
            <li>All steganography files</li>
            <li>Connection requests and contacts</li>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
