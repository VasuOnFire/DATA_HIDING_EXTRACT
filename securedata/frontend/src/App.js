import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import useAuthStore from './store/authStore';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import OTPVerification from './pages/OTPVerification';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Messaging from './pages/Messaging';
import HideData from './pages/HideData';
import ExtractData from './pages/ExtractData';
import LoginHistory from './pages/LoginHistory';
import Settings from './pages/Settings';
import Connections from './pages/Connections';
import Performance from './pages/Performance';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token } = useAuthStore();
  
  // Also check localStorage directly for token during rehydration
  const hasStoredAuth = () => {
    try {
      const storage = localStorage.getItem('securedata-auth');
      if (!storage) return false;
      const { state } = JSON.parse(storage);
      return !!(state?.token && state?.isAuthenticated);
    } catch {
      return false;
    }
  };
  
  const isAuth = isAuthenticated || token || hasStoredAuth();
  
  return isAuth ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, token } = useAuthStore();
  
  const hasStoredAuth = () => {
    try {
      const storage = localStorage.getItem('securedata-auth');
      if (!storage) return false;
      const { state } = JSON.parse(storage);
      return !!(state?.token && state?.isAuthenticated);
    } catch {
      return false;
    }
  };
  
  const isAuth = isAuthenticated || token || hasStoredAuth();
  
  return !isAuth ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />
        <Route path="/verify-otp" element={
          <PublicRoute>
            <OTPVerification />
          </PublicRoute>
        } />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/messaging" element={
          <ProtectedRoute>
            <Messaging />
          </ProtectedRoute>
        } />
        <Route path="/hide-data" element={
          <ProtectedRoute>
            <HideData />
          </ProtectedRoute>
        } />
        <Route path="/extract-data" element={
          <ProtectedRoute>
            <ExtractData />
          </ProtectedRoute>
        } />
        <Route path="/login-history" element={
          <ProtectedRoute>
            <LoginHistory />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/connections" element={
          <ProtectedRoute>
            <Connections />
          </ProtectedRoute>
        } />
        <Route path="/performance" element={
          <ProtectedRoute>
            <Performance />
          </ProtectedRoute>
        } />
        
        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Box>
  );
}

export default App;
