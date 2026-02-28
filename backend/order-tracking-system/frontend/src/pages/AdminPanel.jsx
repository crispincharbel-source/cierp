import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { TableProvider } from '../context/TableContext'; // Import TableProvider
import Dashboard from '../components/admin/Dashboard';
import UserApproval from '../components/admin/UserApproval';
import UserManagement from '../components/admin/UserManagement';
import FieldsConfig from '../components/admin/FieldsConfig';

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    
    if (path.includes('/admin/users') && !path.includes('/admin/users/pending')) return 1;
    if (path.includes('/admin/users/pending')) return 2;
    if (path.includes('/admin/settings/fields')) return 3;
    
    return 0; // Default to dashboard
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    switch (newValue) {
      case 0:
        navigate('/admin');
        break;
      case 1:
        navigate('/admin/users');
        break;
      case 2:
        navigate('/admin/users/pending');
        break;
      case 3:
        navigate('/admin/settings/fields');
        break;
      default:
        navigate('/admin');
    }
  };
  
  if (!isAdmin) {
    return (
      <Box>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            You do not have permission to access the admin panel.
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Dashboard" />
          <Tab label="Manage Users" />
          <Tab label="Pending Users" />
          <Tab label="Fields Configuration" />
        </Tabs>
      </Paper>
      
      {/* Wrap Routes with TableProvider */}
      <TableProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/users/pending" element={<UserApproval />} />
          <Route path="/settings/fields" element={<FieldsConfig />} />
        </Routes>
      </TableProvider>
    </Box>
  );
};

export default AdminPanel;