// src/components/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
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
  TablePagination,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { adminAPI } from '../../api/admin';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import Loader from '../common/Loader';
import { formatDate } from '../../utils/formatters';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([
    { id: 1, role: 'admin' },
    { id: 2, role: 'operation' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    email: '',
    action: '',
    title: '',
    message: ''
  });
  
  // Role change state
  const [roleDialog, setRoleDialog] = useState({
    open: false,
    email: '',
    currentRole: null,
    newRole: null,
    loading: false
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to fetch users. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle user status toggle
  const handleToggleUserStatus = async (email, isActive) => {
    try {
      await adminAPI.toggleUserStatus(email);
      setSuccess(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
      
      // Update users list
      setUsers(prev => 
        prev.map(user => 
          user.email === email 
            ? { ...user, is_active: !isActive } 
            : user
        )
      );
      
      // Close dialog
      setConfirmDialog({ open: false, email: '', action: '', title: '', message: '' });
    } catch (err) {
      console.error('Toggle user status error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to update user status. Please try again.'
      );
    }
  };

  // Handle user delete
  const handleDeleteUser = async (email) => {
    try {
      await adminAPI.deleteUser(email);
      setSuccess(`User ${email} deleted successfully`);
      
      // Update users list
      setUsers(prev => prev.filter(user => user.email !== email));
      
      // Close dialog
      setConfirmDialog({ open: false, email: '', action: '', title: '', message: '' });
    } catch (err) {
      console.error('Delete user error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to delete user. Please try again.'
      );
    }
  };

  // Handle role change
  const handleRoleChange = async () => {
    try {
      setRoleDialog(prev => ({ ...prev, loading: true }));
      
      await adminAPI.changeUserRole(roleDialog.email, roleDialog.newRole);
      
      // Update users list
      setUsers(prev => 
        prev.map(user => 
          user.email === roleDialog.email 
            ? { 
                ...user, 
                id_role: roleDialog.newRole,
                Role: { ...user.Role, role: roles.find(r => r.id === roleDialog.newRole)?.role } 
              } 
            : user
        )
      );
      
      setSuccess(`User role changed successfully`);
      setRoleDialog({ open: false, email: '', currentRole: null, newRole: null, loading: false });
    } catch (err) {
      console.error('Change role error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to change user role. Please try again.'
      );
      setRoleDialog(prev => ({ ...prev, loading: false }));
    }
  };

  // Open confirm dialog
  const openConfirmDialog = (email, action, user) => {
    let title = '';
    let message = '';
    
    switch (action) {
      case 'activate':
        title = 'Activate User';
        message = `Are you sure you want to activate ${email}?`;
        break;
      case 'deactivate':
        title = 'Deactivate User';
        message = `Are you sure you want to deactivate ${email}?`;
        break;
      case 'delete':
        title = 'Delete User';
        message = `Are you sure you want to delete ${email}? This action cannot be undone.`;
        break;
      default:
        title = 'Confirm Action';
        message = 'Are you sure you want to proceed?';
    }
    
    setConfirmDialog({
      open: true,
      email,
      action,
      title,
      message
    });
  };

  // Open role change dialog
  const openRoleDialog = (email, currentRole) => {
    setRoleDialog({
      open: true,
      email,
      currentRole,
      newRole: currentRole,
      loading: false
    });
  };

  // Handle confirm dialog action
  const handleConfirmAction = () => {
    const { email, action } = confirmDialog;
    
    switch (action) {
      case 'activate':
        handleToggleUserStatus(email, false);
        break;
      case 'deactivate':
        handleToggleUserStatus(email, true);
        break;
      case 'delete':
        handleDeleteUser(email);
        break;
      default:
        closeConfirmDialog();
    }
  };

  // Close confirm dialog
  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      email: '',
      action: '',
      title: '',
      message: ''
    });
  };

  // Close role dialog
  const closeRoleDialog = () => {
    setRoleDialog({
      open: false,
      email: '',
      currentRole: null,
      newRole: null,
      loading: false
    });
  };

  if (loading && users.length === 0) {
    return <Loader text="Loading users..." />;
  }

  // Display users
  const displayedUsers = users
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        User Management
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
        {users.length > 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>EMAIL</TableCell>
                    <TableCell>FULL NAME</TableCell>
                    <TableCell>ROLE</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell>REGISTERED</TableCell>
                    <TableCell>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedUsers.map((user) => (
                    <TableRow key={user.email}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.Role?.role || 'Unknown'} 
                          size="small"
                          color={user.Role?.role === 'admin' ? 'error' : 'primary'}
                          onClick={() => openRoleDialog(user.email, user.id_role)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.is_active ? 'Active' : 'Inactive'} 
                          size="small"
                          color={user.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {user.is_active ? (
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => openConfirmDialog(user.email, 'deactivate', user)}
                              title="Deactivate User"
                            >
                              <LockIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openConfirmDialog(user.email, 'activate', user)}
                              title="Activate User"
                            >
                              <LockOpenIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openConfirmDialog(user.email, 'delete', user)}
                            title="Delete User"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={users.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">
              No users found.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Cancel</Button>
          <Button 
            onClick={handleConfirmAction} 
            color={confirmDialog.action === 'delete' ? 'error' : 'primary'}
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog
        open={roleDialog.open}
        onClose={closeRoleDialog}
      >
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Change the role for user: {roleDialog.email}
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={roleDialog.newRole || ''}
              label="Role"
              onChange={(e) => setRoleDialog(prev => ({ ...prev, newRole: e.target.value }))}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRoleDialog}>Cancel</Button>
          <Button 
            onClick={handleRoleChange} 
            color="primary"
            variant="contained"
            disabled={roleDialog.loading || roleDialog.currentRole === roleDialog.newRole}
          >
            {roleDialog.loading ? <CircularProgress size={24} /> : 'Change Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;