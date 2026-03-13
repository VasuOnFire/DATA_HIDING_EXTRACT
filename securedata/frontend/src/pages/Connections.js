import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Tabs,
  Tab,
  Badge,
  Box as MuiBox
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Message as MessageIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { connectionsAPI } from '../api';
import useAuthStore from '../store/authStore';

const Connections = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState(0);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchId, setSearchId] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [connectionsRes, pendingRes] = await Promise.all([
        connectionsAPI.getConnections(),
        connectionsAPI.getPendingRequests()
      ]);
      setConnections(connectionsRes.data);
      setPendingRequests(pendingRes.data);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSendRequest = async () => {
    if (!searchId.trim()) {
      setError('Please enter a User ID');
      return;
    }

    if (searchId === user?.id) {
      setError('You cannot add yourself');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await connectionsAPI.sendRequest(searchId);
      setSuccess('Connection request sent successfully');
      setShowAddDialog(false);
      setSearchId('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = async (requestId, action) => {
    try {
      await connectionsAPI.respondToRequest(requestId, action);
      setSuccess(`Request ${action}ed`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to respond to request');
    }
  };

  const handleStartChat = (contactId) => {
    navigate('/messaging', { state: { contactId } });
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
              Connections
            </Typography>
            <MuiBox sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PersonAddIcon />}
              onClick={() => setShowAddDialog(true)}
            >
              Add Contact
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <Card>
          <CardContent>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ mb: 3 }}
            >
              <Tab 
                label={
                  <Badge badgeContent={connections.length} color="primary">
                    My Contacts
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge badgeContent={pendingRequests.length} color="error">
                    Pending Requests
                  </Badge>
                } 
              />
            </Tabs>

            {/* Contacts Tab */}
            {activeTab === 0 && (
              <>
                {connections.length > 0 ? (
                  <List>
                    {connections.map((contact) => (
                      <ListItem
                        key={contact.id}
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<MessageIcon />}
                            onClick={() => handleStartChat(contact.id)}
                          >
                            Message
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            variant="dot"
                            color={contact.online ? 'success' : 'default'}
                          >
                            <Avatar src={contact.profile_image}>
                              {contact.full_name?.[0]}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={contact.full_name}
                          secondary={contact.id}
                          primaryTypographyProps={{ fontWeight: 'medium' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary" gutterBottom>
                      No connections yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setShowAddDialog(true)}
                    >
                      Add Your First Contact
                    </Button>
                  </Box>
                )}
              </>
            )}

            {/* Pending Requests Tab */}
            {activeTab === 1 && (
              <>
                {pendingRequests.length > 0 ? (
                  <List>
                    {pendingRequests.map((request) => (
                      <ListItem
                        key={request.request_id}
                        secondaryAction={
                          <MuiBox>
                            <IconButton
                              color="success"
                              onClick={() => handleRespondToRequest(request.request_id, 'accept')}
                            >
                              <CheckIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleRespondToRequest(request.request_id, 'reject')}
                            >
                              <CloseIcon />
                            </IconButton>
                          </MuiBox>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar>
                            {request.sender_name?.[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={request.sender_name}
                          secondary={
                            <>
                              <Typography variant="caption" display="block">
                                ID: {request.sender_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(request.created_at).toLocaleDateString()}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      No pending connection requests
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Your ID Card */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Your Unique ID
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Share this ID with others to connect with you
            </Typography>
            <Chip
              label={user?.id}
              color="primary"
              size="large"
              sx={{ fontSize: '1.2rem', py: 2, px: 3 }}
              onClick={() => {
                navigator.clipboard.writeText(user?.id);
                setSuccess('ID copied to clipboard');
              }}
            />
          </CardContent>
        </Card>
      </Container>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Contact</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter the unique User ID of the person you want to connect with.
          </Typography>
          <TextField
            fullWidth
            label="User ID"
            placeholder="e.g., SEC-92X3A"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.toUpperCase())}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
            }}
            helperText="Format: SEC-XXXXX"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSendRequest}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Connections;
