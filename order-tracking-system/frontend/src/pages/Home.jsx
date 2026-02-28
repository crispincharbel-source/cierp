import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TableViewIcon from '@mui/icons-material/TableView';
import QrCodeIcon from '@mui/icons-material/QrCode';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickLinks = [
    {
      title: 'Track Order',
      icon: <SearchIcon fontSize="large" />,
      description: 'Search and track order status',
      action: () => navigate('/order-tracking'),
    },
    {
      title: 'Manage Tables',
      icon: <TableViewIcon fontSize="large" />,
      description: 'View and edit database tables',
      action: () => navigate('/tables'),
    },
    {
      title: 'Generate Barcode',
      icon: <QrCodeIcon fontSize="large" />,
      description: 'Create barcodes and batch numbers',
      action: () => navigate('/barcode-generator'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Typography variant="h6" gutterBottom>
        Welcome, {user?.full_name}!
      </Typography>

      {/* Quick Links Section */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Quick Actions
      </Typography>
      
      <Grid container spacing={3}>
        {quickLinks.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.title}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
                <Box sx={{ mb: 2, color: 'primary.main' }}>{link.icon}</Box>
                <Typography gutterBottom variant="h6" component="div">
                  {link.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {link.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" fullWidth onClick={link.action}>
                  Go to {link.title}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Home;