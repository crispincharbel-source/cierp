// src/components/common/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, CssBaseline, Toolbar, CircularProgress } from '@mui/material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';

const Layout = ({ requireAuth = true }) => {
  const { loading, isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Redirect to dashboard if user is already authenticated and tries to access login/register
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      <Navbar toggleSidebar={toggleSidebar} />
      
      {isAuthenticated && (
        <Sidebar
          isOpen={sidebarOpen}
          isMobile={isMobile}
        />
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, md: 2 },    // Reduced padding overall
          pt: 3,                   // Keep top padding
          pr: { xs: 1, md: 2 },    // Keep right padding
          pl: 0,                   // Remove left padding completely
          width: '100%',
          marginLeft: 0,           // Remove margin completely
          transition: theme => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
          }),
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
        <Footer />
      </Box>
    </Box>
  );
};

export default Layout;