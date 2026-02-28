import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableViewIcon from '@mui/icons-material/TableView';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import QrCodeIcon from '@mui/icons-material/QrCode';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const drawerWidth = 220; // Slightly reduced width

const Sidebar = ({ isOpen, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      allowedRoles: ['admin'],
    },
    {
      text: 'Tables',
      icon: <TableViewIcon />,
      path: '/tables',
      allowedRoles: ['admin', 'operation'],
    },
    {
      text: 'Order Tracking',
      icon: <SearchIcon />,
      path: '/order-tracking',
      allowedRoles: ['admin', 'operation'],
    },
    {
      text: 'Import/Export',
      icon: <UploadFileIcon />,
      path: '/import-export',
      allowedRoles: ['admin'],
    },
    {
      text: 'Admin Panel',
      icon: <AdminPanelSettingsIcon />,
      path: '/admin',
      allowedRoles: ['admin'],
    },
    {
      text: 'Barcode Generator',
      icon: <QrCodeIcon />,
      path: '/barcode-generator',
      allowedRoles: ['admin'],
    },

  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    // If user is admin, show all items
    if (isAdmin) {
      return item.allowedRoles.includes('admin');
    } else {
      // For non-admin users, show items that include their role
      return item.allowedRoles.includes('operation');
    }
  });

  const handleNavigation = (path) => {
    navigate(path);
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List sx={{ p: 0 }}>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{ 
                py: 1,
                px: 1.5,
                borderRadius: 0,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={isOpen}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant={isOpen ? "permanent" : "temporary"}
          open={isOpen}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
};

export default Sidebar;