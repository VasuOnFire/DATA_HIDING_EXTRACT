import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
  Modal,
  Tooltip
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  Lock,
  LockOpen,
  MoreVert,
  Add,
  CloudUpload,
  Search,
  Delete,
  Edit,
  Image,
  PictureAsPdf,
  Description,
  VideoLibrary,
  MusicNote,
  Download,
  Visibility,
  VisibilityOff,
  Share,
  Close,
  ZoomIn,
  ZoomOut
} from '@mui/icons-material';
import { storageAPI } from '../api';
import useAuthStore from '../store/authStore';

const SecureStorage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [lockFolderOpen, setLockFolderOpen] = useState(false);
  const [unlockFolderOpen, setUnlockFolderOpen] = useState(false);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  
  // Form states
  const [folderName, setFolderName] = useState('');
  const [folderPassword, setFolderPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Preview/Modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const response = await storageAPI.getFolders();
      setFolders(response.data);
    } catch (err) {
      setError('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (folderId) => {
    try {
      setLoading(true);
      console.log('Loading files for folder:', folderId);
      const response = await storageAPI.getFolderFiles(folderId);
      console.log('Files response:', response.data);
      setFiles(response.data);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      const isLocked = folderPassword.length > 0;
      if (isLocked && folderPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      await storageAPI.createFolder(folderName, isLocked, isLocked ? folderPassword : null);
      setCreateFolderOpen(false);
      setFolderName('');
      setFolderPassword('');
      setConfirmPassword('');
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create folder');
    }
  };

  const handleLockFolder = async () => {
    if (folderPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await storageAPI.updateFolder(selectedFolder.id, null, true, folderPassword);
      setLockFolderOpen(false);
      setFolderPassword('');
      setConfirmPassword('');
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to lock folder');
    }
  };

  const handleUnlockFolder = async () => {
    try {
      await storageAPI.unlockFolder(selectedFolder.id, folderPassword);
      setUnlockFolderOpen(false);
      setFolderPassword('');
      // After successful unlock, open the folder
      setCurrentFolder(selectedFolder);
      loadFiles(selectedFolder.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to unlock folder');
    }
  };

  const handleRenameFolder = async () => {
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      await storageAPI.updateFolder(selectedFolder.id, folderName);
      setRenameFolderOpen(false);
      setFolderName('');
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async () => {
    try {
      await storageAPI.deleteFolder(selectedFolder.id);
      setAnchorEl(null);
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete folder');
    }
  };

  const handleOpenFolder = (folder) => {
    if (folder.is_locked) {
      setSelectedFolder(folder);
      setUnlockFolderOpen(true);
    } else {
      setCurrentFolder(folder);
      loadFiles(folder.id);
    }
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setFiles([]);
  };

  const handleUploadFile = async () => {
    if (!uploadFile || !currentFolder) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      console.log('Uploading file:', uploadFile.name, 'to folder:', currentFolder.id);
      const response = await storageAPI.uploadFile(uploadFile, currentFolder.id);
      console.log('Upload response:', response.data);
      setUploadDialogOpen(false);
      setUploadFile(null);
      loadFiles(currentFolder.id);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadFile(files[0]);
    }
  };

  const handlePreview = async (file) => {
    try {
      const encryptionKey = file.encryption_key || 'default_preview_key';
      const response = await storageAPI.previewFile(file.id, encryptionKey);
      const url = URL.createObjectURL(response.data);
      setPreviewUrl(url);
      setPreviewFile(file);
      setZoomLevel(1);
      setPreviewOpen(true);
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to preview file');
    }
  };

  const handleDownload = async (file) => {
    try {
      const encryptionKey = file.encryption_key || 'default_preview_key';
      const response = await storageAPI.downloadFile(file.id, encryptionKey);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
    }
  };

  const handleShare = async (file) => {
    try {
      const response = await storageAPI.shareFile(file.id);
      // Copy share URL to clipboard
      navigator.clipboard.writeText(response.data.share_url);
      alert('Share link copied to clipboard!');
    } catch (err) {
      console.error('Share error:', err);
      setError('Failed to generate share link');
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewFile(null);
    setZoomLevel(1);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await storageAPI.deleteFile(fileId);
      loadFiles(currentFolder.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete file');
    }
  };

  const handleSearchFiles = async () => {
    if (!searchQuery.trim()) {
      setCurrentFolder(null);
      setFiles([]);
      return;
    }

    try {
      setLoading(true);
      const response = await storageAPI.searchFiles(searchQuery);
      setFiles(response.data);
      setCurrentFolder(null);
    } catch (err) {
      setError('Failed to search files');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <Image />;
      case 'pdf':
        return <PictureAsPdf />;
      case 'video':
        return <VideoLibrary />;
      case 'audio':
        return <MusicNote />;
      default:
        return <Description />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleMenuClick = (event, folder) => {
    event.stopPropagation();
    setSelectedFolder(folder);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (loading && folders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">
          📁 Secure Storage
        </Typography>
        <Box display="flex" gap={2}>
          <TextField
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchFiles()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size="small"
          />
          {!currentFolder && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateFolderOpen(true)}
            >
              New Folder
            </Button>
          )}
          {currentFolder && (
            <Button
              variant="outlined"
              onClick={handleBackToFolders}
            >
              Back to Folders
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {!currentFolder ? (
        <Grid container spacing={3}>
          {folders.map((folder) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={folder.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' }
                }}
                onClick={() => handleOpenFolder(folder)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" alignItems="center" gap={1}>
                      {folder.is_locked ? <Lock color="error" /> : <Folder color="primary" />}
                      <Typography variant="h6" noWrap>
                        {folder.folder_name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, folder)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                  <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {folder.file_count} files
                    </Typography>
                    <Chip
                      label={folder.is_locked ? 'Locked' : 'Open'}
                      size="small"
                      color={folder.is_locked ? 'error' : 'success'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {folders.length === 0 && (
            <Grid item xs={12}>
              <Box textAlign="center" py={8}>
                <Folder sx={{ fontSize: 64, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary" mt={2}>
                  No folders yet. Create your first folder!
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      ) : (
        <>
          <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              📂 {currentFolder.folder_name}
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload File
            </Button>
          </Box>
          <Grid container spacing={3}>
            {files.map((file) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {file.file_type === 'image' ? (
                    <Box
                      sx={{
                        height: 150,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.05)',
                        cursor: 'pointer'
                      }}
                      onClick={() => handlePreview(file)}
                    >
                      <Image sx={{ fontSize: 64, color: 'text.secondary' }} />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 150,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.05)'
                      }}
                    >
                      {getFileIcon(file.file_type)}
                    </Box>
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" noWrap sx={{ mb: 1, fontWeight: 'medium' }}>
                      {file.file_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                      {formatFileSize(file.file_size)} • {file.file_type.toUpperCase()}
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() => handlePreview(file)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(file)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Share">
                        <IconButton
                          size="small"
                          onClick={() => handleShare(file)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Share fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteFile(file.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onClose={() => setCreateFolderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password (optional - for locking folder)"
            type={showPassword ? "text" : "password"}
            fullWidth
            value={folderPassword}
            onChange={(e) => setFolderPassword(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            margin="dense"
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateFolder} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Lock Folder Dialog */}
      <Dialog open={lockFolderOpen} onClose={() => setLockFolderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lock Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            value={folderPassword}
            onChange={(e) => setFolderPassword(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            margin="dense"
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockFolderOpen(false)}>Cancel</Button>
          <Button onClick={handleLockFolder} variant="contained">Lock</Button>
        </DialogActions>
      </Dialog>

      {/* Unlock Folder Dialog */}
      <Dialog open={unlockFolderOpen} onClose={() => setUnlockFolderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Unlock Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            value={folderPassword}
            onChange={(e) => setFolderPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockFolderOpen(false)}>Cancel</Button>
          <Button onClick={handleUnlockFolder} variant="contained">Unlock</Button>
        </DialogActions>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderOpen} onClose={() => setRenameFolderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rename Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            fullWidth
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameFolderOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameFolder} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: dragOver ? 'action.hover' : 'background.paper',
              mb: 2
            }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <CloudUpload sx={{ fontSize: 48, color: dragOver ? 'primary.main' : 'grey.400', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {uploadFile ? uploadFile.name : 'Drag & drop a file here or click to select'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Supports: Images, Audio, Video, PDF, Documents
            </Typography>
          </Box>
          <input
            id="file-input"
            type="file"
            onChange={(e) => setUploadFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUploadFile} variant="contained" disabled={uploading || !uploadFile}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Folder Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { setRenameFolderOpen(true); handleMenuClose(); }}>
          <Edit sx={{ mr: 1 }} /> Rename
        </MenuItem>
        {selectedFolder?.is_locked ? (
          <MenuItem onClick={() => { setLockFolderOpen(true); handleMenuClose(); }}>
            <LockOpen sx={{ mr: 1 }} /> Change Password
          </MenuItem>
        ) : (
          <MenuItem onClick={() => { setLockFolderOpen(true); handleMenuClose(); }}>
            <Lock sx={{ mr: 1 }} /> Lock Folder
          </MenuItem>
        )}
        {selectedFolder?.is_locked && (
          <MenuItem onClick={() => { setUnlockFolderOpen(true); handleMenuClose(); }}>
            <LockOpen sx={{ mr: 1 }} /> Unlock Folder
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteFolder} sx={{ color: 'error' }}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Image Viewer Modal */}
      <Modal
        open={previewOpen}
        onClose={handleClosePreview}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 1,
              display: 'flex',
              gap: 1
            }}
          >
            <Tooltip title="Zoom In">
              <IconButton
                onClick={handleZoomIn}
                sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton
                onClick={handleZoomOut}
                sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton
                onClick={handleClosePreview}
                sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
              >
                <Close />
              </IconButton>
            </Tooltip>
          </Box>
          {previewFile && previewFile.file_type === 'image' && previewUrl && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
              }}
            >
              <img
                src={previewUrl}
                alt={previewFile.file_name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.3s ease'
                }}
              />
            </Box>
          )}
          {previewFile && previewFile.file_type === 'video' && previewUrl && (
            <Box sx={{ p: 2 }}>
              <video
                src={previewUrl}
                controls
                style={{ maxWidth: '100%', maxHeight: '80vh' }}
              />
            </Box>
          )}
          {previewFile && previewFile.file_type === 'audio' && previewUrl && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <audio
                src={previewUrl}
                controls
                style={{ width: '100%' }}
              />
              <Typography variant="h6" mt={2}>
                {previewFile.file_name}
              </Typography>
            </Box>
          )}
          {previewFile && (previewFile.file_type === 'pdf' || previewFile.file_type === 'document') && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Description sx={{ fontSize: 64, color: 'text.secondary' }} />
              <Typography variant="h6" mt={2}>
                {previewFile.file_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Preview not available for this file type. Please download to view.
              </Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </Container>
  );
};

export default SecureStorage;
