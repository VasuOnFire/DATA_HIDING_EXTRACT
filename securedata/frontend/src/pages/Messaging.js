import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Badge,
  Divider,
  Paper,
  InputAdornment,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { connectionsAPI, chatAPI } from '../api';

const Messaging = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadContacts();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    const ws = new WebSocket(`ws://localhost:8000/ws/chat`);
    
    ws.onopen = () => {
      setWsConnected(true);
      // Send authentication
      ws.send(JSON.stringify({ token }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'message':
        if (selectedContact && data.sender_id === selectedContact.id) {
          setMessages(prev => [...prev, data]);
        }
        break;
      case 'message_sent':
        // Confirm message sent
        break;
      case 'typing':
        setTypingUsers(prev => ({
          ...prev,
          [data.user_id]: data.is_typing
        }));
        break;
      case 'status':
        // Update user online status
        break;
      default:
        break;
    }
  };

  const loadContacts = async () => {
    try {
      const response = await connectionsAPI.getConnections();
      setContacts(response.data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  const loadMessages = async (contactId) => {
    try {
      const response = await chatAPI.getMessages(contactId);
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedContact || !wsRef.current) return;
    
    const messageData = {
      type: 'message',
      receiver_id: selectedContact.id,
      content: newMessage,
      message_type: 'text'
    };
    
    wsRef.current.send(JSON.stringify(messageData));
    
    // Optimistically add message
    const optimisticMessage = {
      id: Date.now(),
      sender_id: user.id,
      content: newMessage,
      message_type: 'text',
      timestamp: new Date().toISOString(),
      is_sent: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
  };

  const sendTypingIndicator = (isTyping) => {
    if (!selectedContact || !wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'typing',
      receiver_id: selectedContact.id,
      is_typing: isTyping
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
        <Container maxWidth="xl">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack} sx={{ color: 'white' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="medium">
              Messages
            </Typography>
            <Chip
              size="small"
              label={wsConnected ? 'Connected' : 'Disconnected'}
              color={wsConnected ? 'success' : 'error'}
              sx={{ ml: 'auto' }}
            />
          </Box>
        </Container>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Contacts Sidebar */}
        <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
          <List>
            {contacts.map((contact) => (
              <ListItem
                key={contact.id}
                button
                selected={selectedContact?.id === contact.id}
                onClick={() => setSelectedContact(contact)}
                sx={{
                  bgcolor: selectedContact?.id === contact.id ? 'action.selected' : 'inherit'
                }}
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
          
          {contacts.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No contacts yet. Add connections to start messaging.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar src={selectedContact.profile_image}>
                    {selectedContact.full_name?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {selectedContact.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedContact.online ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {messages.map((message, index) => {
                  const isOwn = message.sender_id === user.id;
                  
                  return (
                    <Box
                      key={message.id || index}
                      sx={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        mb: 1
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          maxWidth: '70%',
                          bgcolor: isOwn ? 'primary.main' : 'white',
                          color: isOwn ? 'white' : 'text.primary',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="body1">
                          {message.content || '[Encrypted Message]'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                          {formatTime(message.timestamp)}
                          {isOwn && (
                            <DoneAllIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
                          )}
                        </Typography>
                      </Paper>
                    </Box>
                  );
                })}
                
                {typingUsers[selectedContact.id] && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {selectedContact.full_name} is typing...
                  </Typography>
                )}
                
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTypingIndicator(e.target.value.length > 0);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconButton size="small">
                          <AttachFileIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          color="primary" 
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                        >
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Select a contact to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Messaging;
