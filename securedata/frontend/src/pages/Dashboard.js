import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Grid,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Message as MessageIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { connectionsAPI } from '../api';
import Sidebar from '../components/Sidebar';

const DRAWER_WIDTH = 280;

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuthStore();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    hiddenFiles: 0,
    connections: 0,
    securityScore: 95
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      // Temporarily disabled to test blinking
      /*
      try {
        const [connectionsRes, pendingRes] = await Promise.all([
          connectionsAPI.getConnections(),
          connectionsAPI.getPendingRequests()
        ]);
        
        if (isMounted) {
          setContacts(connectionsRes.data);
          setPendingRequests(pendingRes.data);
          setStats(prev => ({ ...prev, connections: connectionsRes.data.length }));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
      */
    };
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          <Sidebar user={user} pendingRequests={pendingRequests} onLogout={handleLogout} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          <Sidebar user={user} pendingRequests={pendingRequests} onLogout={handleLogout} />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Toolbar />
        
        {/* TEST BUTTON - Remove after debugging */}
        <button 
          onClick={() => {
            console.log('TEST BUTTON CLICKED');
            navigate('/messaging');
          }}
          style={{ padding: '10px 20px', marginBottom: '20px', background: 'red', color: 'white' }}
        >
          TEST NAVIGATE TO MESSAGING
        </button>
        
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Your secure communication dashboard
          </Typography>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Connections
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="primary">
                    {stats.connections}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Security Score
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {stats.securityScore}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Hidden Files
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="info.main">
                    {stats.hiddenFiles}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Encryption Type
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="warning.main">
                    AES-256 + RSA
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Typography variant="h5" gutterBottom fontWeight="medium">
            Quick Actions
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/messaging')}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <MessageIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6">Start Chat</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/hide-data')}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SecurityIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6">Hide Data</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/connections')}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PeopleIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6">Add Contact</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SettingsIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6">Settings</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Activity */}
          {pendingRequests.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom fontWeight="medium">
                Pending Connection Requests
              </Typography>
              <Card>
                <CardContent>
                  {pendingRequests.map((request) => (
                    <Box key={request.request_id} sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {request.sender_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {request.sender_id}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;
