import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
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
  IconButton,
  Autocomplete,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import OrderDetails from '../components/orders/OrderDetails';

const OrderTracking = () => {
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
      const response = await api.get(`/orders/track/${orderNumber}`);
      console.log('API Response Data:', JSON.stringify(response.data.orderData.printing, null, 2));
      setOrderData(response.data.orderData);
      
      // Update URL with the order number for bookmarking
      if (orderNumberParam !== orderNumber) {
        navigate(`/order-tracking/${orderNumber}`, { replace: true });
      }
    } catch (err) {
      console.error('Order tracking error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to fetch order data. Please try again.'
      );
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = async (event, value) => {
    // Update orderNumber state directly with the input value
    setOrderNumber(value);
    
    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    
    try {
      const response = await api.get(`/orders/search?query=${value}`);
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
      // If the selected value is an object (from dropdown)
      if (typeof value === 'object' && value !== null) {
        setOrderNumber(value.order_number);
      }
      // If it's just a string (manually typed)
      else if (typeof value === 'string') {
        setOrderNumber(value);
      }
    }
  };

  // Handle Enter key press to trigger search
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
                {orderData.cutting.length > 0 && (
                  <Tab label={`Cutting (${orderData.cutting.length})`} />
                )}
                {orderData.lamination.length > 0 && (
                  <Tab label={`Lamination (${orderData.lamination.length})`} />
                )}
                {orderData.printing.length > 0 && (
                  <Tab label={`Printing (${orderData.printing.length})`} />
                )}
                {orderData.warehouseToDispatch.length > 0 && (
                  <Tab label={`Warehouse to Dispatch (${orderData.warehouseToDispatch.length})`} />
                )}
                {orderData.dispatchToProduction.length > 0 && (
                  <Tab label={`Dispatch to Production (${orderData.dispatchToProduction.length})`} />
                )}
                {orderData.extruder.length > 0 && (
                  <Tab label={`Extruder (${orderData.extruder.length})`} />
                )}
                {orderData.rawSlitting.length > 0 && (
                  <Tab label={`Raw Slitting (${orderData.rawSlitting.length})`} />
                )}
                {orderData.pvc.length > 0 && (
                  <Tab label={`PVC (${orderData.pvc.length})`} />
                )}
                {orderData.slitting.length > 0 && (
                  <Tab label={`Slitting (${orderData.slitting.length})`} />
                )}
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

export default OrderTracking;