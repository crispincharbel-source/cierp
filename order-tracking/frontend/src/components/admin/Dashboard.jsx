import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Loader from '../common/Loader';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingUsers: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch pending users
        const pendingResponse = await api.get('/admin/users/pending');
        
        // Fetch all users
        const usersResponse = await api.get('/admin/users');
        
      
        setStats({
          pendingUsers: pendingResponse.data.pendingUsers?.length || 0,
          totalUsers: usersResponse.data.users?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <Loader text="Loading dashboard..." />;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                 Pending Approvals
                </Typography>
                <PeopleIcon color="primary" fontSize="large" />
              </Box>
          
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              {stats.pendingUsers} Users waiting for approval
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/admin/users/pending')}
                disabled={stats.pendingUsers === 0}
              >
                View Pending Users
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                  Total Users 
                </Typography>
                <PeopleIcon color="primary" fontSize="large" />
              </Box>
             
              <Typography variant="body2" color="text.secondary"  sx={{ mt: 2, mb: 1 }}>
              {stats.totalUsers} Registered users in the system
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/admin/users')}
              >
                Manage Users
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                  Display Settings
                </Typography>
                <SettingsIcon color="primary" fontSize="large" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                Configure order tracking display fields
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/admin/settings/fields')}
              >
                Configure Fields
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;