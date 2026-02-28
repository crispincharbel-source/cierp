import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useTable } from '../../context/TableContext';
import { createRecord } from '../../api/tables';
import Loader from '../common/Loader';

const AddRecord = () => {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const { 
    getTableFields, 
    getFieldType, 
    isPrimaryKey, 
    isAutoIncrement, 
    isReferenceField,
    getFieldOptions,
    loading 
  } = useTable();
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error if value is provided
    if (value !== '' && value !== null && errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const fields = getTableFields();
    
    fields.forEach(field => {
      // Skip auto-increment and primary key fields
      if (isAutoIncrement(field) || isPrimaryKey(field)) {
        return;
      }
      
      // Skip createdAt and updatedAt
      if (['createdAt', 'updatedAt'].includes(field)) {
        return;
      }
      
      const value = formData[field];
      
      // Check required fields (except for boolean fields)
      if (getFieldType(field) !== 'boolean' && (value === undefined || value === null || value === '') && !isAutoIncrement(field)) {
        newErrors[field] = 'This field is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      await createRecord(tableName, formData);
      navigate(`/tables/${tableName}`);
    } catch (err) {
      console.error('Create record error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to create record. Please check your inputs and try again.'
      );
      
      // Handle validation errors from the server
      if (err.response?.data?.errors) {
        const serverErrors = {};
        err.response.data.errors.forEach(fieldError => {
          serverErrors[fieldError.field] = fieldError.message;
        });
        setErrors(serverErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    // Skip primary key and auto-increment fields for new records
    if (isPrimaryKey(field) && isAutoIncrement(field)) {
      return null;
    }
    
    // Skip createdAt and updatedAt fields
    if (['createdAt', 'updatedAt'].includes(field)) {
      return null;
    }
    
    const fieldType = getFieldType(field);
    const fieldLabel = field.replace(/_/g, ' ').toUpperCase();
    
    // Handle different field types
    switch (fieldType) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!formData[field]}
                onChange={(e) => handleInputChange(field, e.target.checked)}
                name={field}
              />
            }
            label={fieldLabel}
          />
        );
        
      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={fieldLabel}
              value={formData[field] || null}
              onChange={(date) => handleInputChange(field, date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'outlined',
                  error: !!errors[field],
                  helperText: errors[field],
                }
              }}
            />
          </LocalizationProvider>
        );
        
      case 'textarea':
        return (
          <TextField
            fullWidth
            label={fieldLabel}
            name={field}
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            error={!!errors[field]}
            helperText={errors[field]}
            multiline
            rows={4}
          />
        );
        
      case 'number':
        return (
          <TextField
            fullWidth
            label={fieldLabel}
            name={field}
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value === '' ? '' : Number(e.target.value))}
            error={!!errors[field]}
            helperText={errors[field]}
            type="number"
          />
        );
        
      default:
        // Check if field is a reference field (dropdown)
        if (isReferenceField(field) || field === 'complex' || field.startsWith('ink_') || field.startsWith('solvent_')) {
          const options = getFieldOptions(field);
          
          return (
            <FormControl fullWidth error={!!errors[field]}>
              <InputLabel id={`${field}-label`}>{fieldLabel}</InputLabel>
              <Select
                labelId={`${field}-label`}
                value={formData[field] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                label={fieldLabel}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {errors[field] && (
                <Typography variant="caption" color="error">
                  {errors[field]}
                </Typography>
              )}
            </FormControl>
          );
        }
        
        // Default text field
        return (
          <TextField
            fullWidth
            label={fieldLabel}
            name={field}
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            error={!!errors[field]}
            helperText={errors[field]}
          />
        );
    }
  };

  if (loading) {
    return <Loader text="Loading form..." />;
  }

  const fields = getTableFields();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add New {tableName.replace(/([A-Z])/g, ' $1').trim()}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {fields.map((field) => {
              const fieldComponent = renderField(field);
              if (!fieldComponent) return null;
              
              return (
                <Grid item xs={12} sm={6} key={field}>
                  {fieldComponent}
                </Grid>
              );
            })}
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate(`/tables/${tableName}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Record'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default AddRecord;