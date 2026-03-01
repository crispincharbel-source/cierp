import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import Loader from '../common/Loader';
import { formatDate } from '../../utils/formatters';

const UserApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    email: '',
    action: ''
  });

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users/pending');
      setPendingUsers(response.data.pendingUsers || []);
    } catch (err) {
      console.error('Fetch pending users error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to fetch pending users. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApproveUser = async (email) => {
    try {
      await api.put(`/admin/users/${email}/approve`);
      setSuccess(`User ${email} approved successfully`);
      
      // Update the list
      setPendingUsers(prev => prev.filter(user => user.email !== email));
      
      // Close dialog
      setConfirmDialog({ open: false, email: '', action: '' });
    } catch (err) {
      console.error('Approve user error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to approve user. Please try again.'
      );
    }
  };

  const handleRejectUser = async (email) => {
    try {
      await api.delete(`/admin/users/${email}`);
      setSuccess(`User ${email} rejected and removed`);
      
      // Update the list
      setPendingUsers(prev => prev.filter(user => user.email !== email));
      
      // Close dialog
      setConfirmDialog({ open: false, email: '', action: '' });
    } catch (err) {
      console.error('Reject user error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to reject user. Please try again.'
      );
    }
  };

  const openConfirmDialog = (email, action) => {
    setConfirmDialog({
      open: true,
      email,
      action
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      email: '',
      action: ''
    });
  };

  const confirmAction = () => {
    const { email, action } = confirmDialog;
    
    if (action === 'approve') {
      handleApproveUser(email);
    } else if (action === 'reject') {
      handleRejectUser(email);
    }
  };

  if (loading && pendingUsers.length === 0) {
    return <Loader text="Loading pending users..." />;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Pending User Approvals
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper>
        {pendingUsers.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>EMAIL</TableCell>
                  <TableCell>FULL NAME</TableCell>
                  <TableCell>ROLE</TableCell>
                  <TableCell>REGISTERED</TableCell>
                  <TableCell>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.Role?.role || 'Unknown'} 
                        size="small"
                        color={user.Role?.role === 'admin' ? 'error' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => openConfirmDialog(user.email, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => openConfirmDialog(user.email, 'reject')}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">
              No pending user approvals found.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
      >
        <DialogTitle>
          {confirmDialog.action === 'approve' ? 'Approve User' : 'Reject User'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === 'approve' 
              ? `Are you sure you want to approve ${confirmDialog.email}?`
              : `Are you sure you want to reject and remove ${confirmDialog.email}? This action cannot be undone.`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Cancel</Button>
          <Button 
            onClick={confirmAction} 
            color={confirmDialog.action === 'approve' ? 'success' : 'error'}
            variant="contained"
            autoFocus
          >
            {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserApproval;