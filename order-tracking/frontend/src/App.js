import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/common/Layout';

// Auth Pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Main Pages
import Home from './pages/Home';
import Tables from './pages/Tables';
import OrderTracking from './pages/OrderTracking';
import BarcodeGenerator from './pages/BarcodeGenerator';
import ImportExport from './pages/ImportExport';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {

  useEffect(() => {
    // Log environment variables
    console.log('=== API Connection Debug Info ===');
    console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('Window location:', window.location.href);
    console.log('Window hostname:', window.location.hostname);
    
    // Test API connection
    const testApiConnection = async () => {
      try {
        // Make a simple request to verify connection
        const response = await fetch(process.env.REACT_APP_API_URL || '/api/health');
        console.log('API test response status:', response.status);
        const data = await response.text();
        console.log('API test response data:', data);
      } catch (error) {
        console.error('API connection test failed:', error);
      }
    };
    
    testApiConnection();
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route element={<Layout requireAuth={false} />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected routes */}
              <Route element={<Layout requireAuth={true} />}>
                <Route path="/" element={<Home />} />
                <Route path="/tables" element={<Tables />} />
                <Route path="/tables/:tableName" element={<Tables />} />
                <Route path="/tables/:tableName/:action" element={<Tables />} />
                <Route path="/tables/:tableName/:action/:id" element={<Tables />} />
                <Route path="/order-tracking" element={<OrderTracking />} />
                <Route path="/order-tracking/:orderNumber" element={<OrderTracking />} />
                <Route path="/barcode-generator" element={<BarcodeGenerator />} />
                <Route path="/import-export" element={<ImportExport />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/*" element={<AdminPanel />} />
              </Route>

              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;