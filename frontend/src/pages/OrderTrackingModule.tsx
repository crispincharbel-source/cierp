
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api'; // Corrected import
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Alert,
  Autocomplete,
} from '@mui/material'; // Assuming you are using MUI
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';

const OrderDetails = ({ orderData, activeTab }) => {
  const renderContent = () => {
    const tabs = [
      'cutting', 'lamination', 'printing', 'warehouseToDispatch',
      'dispatchToProduction', 'extruder', 'rawSlitting', 'pvc', 'slitting'
    ].filter(tab => orderData[tab] && orderData[tab].length > 0);

    const selectedTab = tabs[activeTab];

    if (selectedTab && orderData[selectedTab]) {
      return (
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            {selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)} Details
          </Typography>
          {orderData[selectedTab].map((item, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2 }}>
              {Object.entries(item).map(([key, value]) => (
                <Typography key={key} variant="body2">
                  <strong>{key}:</strong> {String(value)}
                </Typography>
              ))}
            </Paper>
          ))}
        </Box>
      );
    }
    return null;
  };

  return <div>{renderContent()}</div>;
};

const OrderTrackingModule = () => {
  const { orderNumber: orderNumberParam } = useParams();
  const navigate = useNavigate();
  
  const [orderNumber, setOrderNumber] = useState(orderNumberParam || '');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      const response = await api.get(`/api/v1/order-tracking/track/${orderNumber}`);
      setOrderData(response.data.orderData);
      
      if (orderNumberParam !== orderNumber) {
        navigate(`/order-tracking/${orderNumber}`, { replace: true });
      }
    } catch (err) {
      console.error('Order tracking error:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to fetch order data. Please try again.'
      );
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = async (event, value) => {
    setOrderNumber(value);
    
    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    
    try {
      const response = await api.get(`/api/v1/order-tracking/search?query=${value}`);
      setSearchResults(response.data.results || []);
    } catch (err) {
      console.error('Order search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleOrderSelect = (event, value) => {
    if (value) {
      if (typeof value === 'object' && value !== null) {
        setOrderNumber(value.order_number);
      } else if (typeof value === 'string') {
        setOrderNumber(value);
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && orderNumber.trim()) {
      handleSearch();
    }
  };

  useEffect(() => {
    if (orderNumberParam) {
      setOrderNumber(orderNumberParam);
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumberParam]);

  const tabs = orderData ? [
    'cutting', 'lamination', 'printing', 'warehouseToDispatch',
    'dispatchToProduction', 'extruder', 'rawSlitting', 'pvc', 'slitting'
  ].filter(tab => orderData[tab] && orderData[tab].length > 0) : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Order Tracking
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Autocomplete
            freeSolo
            options={searchResults}
            getOptionLabel={(option) => 
              typeof option === 'string' ? option : option.order_number
            }
            loading={searching}
            value={orderNumber}
            onChange={handleOrderSelect}
            onInputChange={handleSearchInputChange}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label="Enter Order Number"
                variant="outlined"
                onKeyPress={handleKeyPress}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searching ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ flexGrow: 1, mr: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !orderNumber.trim()}
          >
            Search
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : orderData ? (
        <Box>
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6">
                Order: {orderData.orderNumber}
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabs.map((tab, index) => (
                  <Tab key={tab} label={`${tab.charAt(0).toUpperCase() + tab.slice(1)} (${orderData[tab].length})`} />
                ))}
              </Tabs>
            </Box>
            <OrderDetails orderData={orderData} activeTab={activeTab} />
          </Paper>
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Order Data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter an order number and click "Search" to track an order.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default OrderTrackingModule;
