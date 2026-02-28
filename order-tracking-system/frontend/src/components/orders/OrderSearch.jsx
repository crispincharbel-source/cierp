// src/components/orders/OrderSearch.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Autocomplete,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

import { trackOrder, searchOrders } from '../../api/orders';

const OrderSearch = () => {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  
  const handleSearchInputChange = async (value) => {
    setSearchQuery(value);
    setOrderNumber(value);
    
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    
    try {
      const response = await searchOrders(value);
      setSearchResults(response.results || []);
    } catch (err) {
      console.error('Order search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleOrderSelect = (event, value) => {
    if (value) {
      if (typeof value === 'string') {
        setOrderNumber(value);
      } else {
        setOrderNumber(value.order_number);
      }
    }
  };

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      await trackOrder(orderNumber);
      navigate(`/order-tracking/${orderNumber}`);
    } catch (err) {
      console.error('Order tracking error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to find order. Please try again with a valid order number.'
      );
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && orderNumber.trim()) {
      handleSearch();
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Order Tracking
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Enter an order number to track its status across all departments.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Autocomplete
            freeSolo
            options={searchResults}
            getOptionLabel={(option) => 
              typeof option === 'string' ? option : option.order_number
            }
            loading={searching}
            onChange={handleOrderSelect}
            onInputChange={(e, value) => handleSearchInputChange(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label="Enter Order Number"
                variant="outlined"
                value={searchQuery}
                onKeyPress={handleKeyPress}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
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
            startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !orderNumber.trim()}
          >
            {loading ? 'Searching...' : 'Track Order'}
          </Button>
        </Box>
      </Paper>

    </Box>
  );
};

export default OrderSearch;