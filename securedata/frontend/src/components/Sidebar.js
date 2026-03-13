import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Toolbar,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Badge
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Speed as SpeedIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;
const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000';

const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Add cache-busting timestamp to force refresh
  const timestamp = Date.now();
  return `${API_BASE}${path}${path.includes('?') ? '&' : '?'}t=${timestamp}`;
};

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Messaging', icon: MessageIcon, path: '/messaging' },
  { text: 'Connections', icon: PeopleIcon, path: '/connections' },
  { text: 'Hide Data', icon: SecurityIcon, path: '/hide-data' },
  { text: 'Extract Data', icon: SearchIcon, path: '/extract-data' },
  { text: 'Performance', icon: SpeedIcon, path: '/performance' },
  { text: 'Login History', icon: HistoryIcon, path: '/login-history' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
];

const Sidebar = ({ user, pendingRequests = [], onLogout }) => {
  const navigate = useNavigate();

  const handleNav = (path) => {
    console.log('CLICK EVENT:', path);
    navigate(path);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          SECUREDATA
        </Typography>
      </Toolbar>
      <Divider />
      
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Avatar
          src={getFullImageUrl(user?.profile_image)}
          sx={{ width: 80, height: 80, mx: 'auto', mb: 1, bgcolor: 'primary.main' }}
        >
          {user?.full_name?.[0] || 'U'}
        </Avatar>
        <Typography variant="subtitle1" fontWeight="medium" noWrap>
          {user?.full_name || 'User'}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" noWrap>
          ID: {user?.id || 'N/A'}
        </Typography>
        <Chip label="Verified" color="success" size="small" sx={{ mt: 1 }} />
      </Box>
      
      <Divider />
      
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const hasPending = item.text === 'Connections' && pendingRequests.length > 0;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton 
                onClick={() => handleNav(item.path)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                }}
              >
                <ListItemIcon>
                  {hasPending ? (
                    <Badge badgeContent={pendingRequests.length} color="error">
                      <IconComponent />
                    </Badge>
                  ) : <IconComponent />}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      <Divider />
      
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={onLogout}
            sx={{ 
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
};

export default React.memo(Sidebar);
