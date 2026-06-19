import axios from 'axios';

// Use relative URL when using proxy, or full URL for production
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Zustand persist uses 'securedata-auth' as the key
    const storage = localStorage.getItem('securedata-auth');
    if (storage) {
      const { state } = JSON.parse(storage);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('securedata-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (userId, otpCode, purpose = 'signup') => 
    api.post('/auth/verify-otp', null, { 
      params: { user_id: userId, otp_code: otpCode, purpose } 
    }),
  resendOTP: (userId, purpose = 'signup') => 
    api.post('/auth/resend-otp', null, { 
      params: { user_id: userId, purpose } 
    }),
  forgotPassword: (email) => api.post('/auth/forgot-password', null, { params: { email } }),
  resetPassword: (email, otpCode, newPassword) => 
    api.post('/auth/reset-password', null, { 
      params: { email, otp_code: otpCode, new_password: newPassword } 
    }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', null, { params: data }),
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/user/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  changePassword: (currentPassword, newPassword) => 
    api.put('/user/password', null, { 
      params: { current_password: currentPassword, new_password: newPassword } 
    }),
  updateTheme: (theme) => api.put('/user/theme', null, { params: { theme } }),
};

// Login History API
export const historyAPI = {
  getLoginHistory: () => api.get('/user/login-history'),
};

// Connections API
export const connectionsAPI = {
  getConnections: () => api.get('/connections'),
  getPendingRequests: () => api.get('/connections/pending'),
  sendRequest: (uniqueId) => api.post('/connections/request', null, { params: { unique_id: uniqueId } }),
  respondToRequest: (requestId, action) => 
    api.post('/connections/respond', null, { params: { request_id: requestId, action } }),
};

// Chat API
export const chatAPI = {
  getMessages: (contactId, limit = 50, offset = 0) => 
    api.get(`/chat/messages/${contactId}`, { params: { limit, offset } }),
};

// Steganography API
export const stegoAPI = {
  embedInMedia: (file, secretText, password) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('secret_text', secretText);
    formData.append('password', password);
    return api.post('/stego/embed', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  extractFromMedia: (file, password) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    return api.post('/stego/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  autoGenerate: (secretText, password, mediaType, theme = 'nature') => {
    const formData = new FormData();
    formData.append('secret_text', secretText);
    formData.append('password', password);
    formData.append('media_type', mediaType);
    formData.append('theme', theme);
    return api.post('/stego/auto-generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  // Keep old names for backward compatibility
  embedInImage: (file, secretText, password) => {
    return stegoAPI.embedInMedia(file, secretText, password);
  },
  extractFromImage: (file, password) => {
    return stegoAPI.extractFromMedia(file, password);
  },
};

// QR Code API
export const qrAPI = {
  generateQR: (secretMessage, password) => {
    const formData = new FormData();
    formData.append('secret_message', secretMessage);
    formData.append('password', password);
    return api.post('/qr/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  extractFromQR: (file, password) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    return api.post('/qr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  extractFromData: (qrData, password) => 
    api.post('/qr/extract-from-data', { qr_data: qrData, password }),
  getQRHistory: () => api.get('/qr/history'),
  downloadQR: (qrId) => api.get(`/qr/download/${qrId}`, { responseType: 'blob' }),
};

// Performance API
export const performanceAPI = {
  getEncryptionMetrics: () => api.get('/performance/encryption'),
};

// Secure Storage API
export const storageAPI = {
  // Folder operations
  getFolders: () => api.get('/storage/folders'),
  createFolder: (folderName, isLocked = false, folderPassword = null) => 
    api.post('/storage/folders', null, { 
      params: { folder_name: folderName, is_locked: isLocked, folder_password: folderPassword } 
    }),
  updateFolder: (folderId, folderName = null, isLocked = null, folderPassword = null) => 
    api.put(`/storage/folders/${folderId}`, null, { 
      params: { folder_name: folderName, is_locked: isLocked, folder_password: folderPassword } 
    }),
  deleteFolder: (folderId) => api.delete(`/storage/folders/${folderId}`),
  unlockFolder: (folderId, folderPassword) => 
    api.post(`/storage/folders/${folderId}/unlock`, null, { params: { folder_password: folderPassword } }),
  
  // File operations
  uploadFile: (file, folderId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', folderId);
    return api.post('/storage/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getFolderFiles: (folderId) => api.get(`/storage/folders/${folderId}/files`),
  downloadFile: (fileId, encryptionKey) => 
    api.get(`/storage/files/${fileId}/download`, { 
      params: { encryption_key: encryptionKey },
      responseType: 'blob'
    }),
  previewFile: (fileId, encryptionKey) =>
    api.get(`/storage/files/${fileId}/preview`, {
      params: { encryption_key: encryptionKey },
      responseType: 'blob'
    }),
  shareFile: (fileId) => api.post(`/storage/files/${fileId}/share`),
  deleteFile: (fileId) => api.delete(`/storage/files/${fileId}`),
  searchFiles: (query) => api.get('/storage/files/search', { params: { query } }),
};

// Health Check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
