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
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTable } from '../../context/TableContext';
import { createRecord } from '../../api/tables';
import Loader from '../common/Loader';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

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
    lookupData,
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
      if ((isAutoIncrement(field) )|| (isPrimaryKey(field))) {
        return;
      }
      
      // Skip createdAt and updatedAt
      if (['createdAt', 'updatedAt'].includes(field)) {
        return;
      }

      // Skip ink and solvent fields for printing table since they're optional
      if (tableName === 'Printing' && (field.startsWith('ink_') || field.startsWith('solvent_'))) {
        return;
      }
      
      const value = formData[field];
      
      // Check required fields (except for boolean fields)
      if (getFieldType(field) !== 'boolean' && (value === undefined || value === null || value === '') && !( isAutoIncrement(field))) {
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
      
    // Ensure is_finished is set to false for new Ink and Solvent records
    if (tableName === 'Ink' || tableName === 'Solvent') {
      setFormData(prev => ({
        ...prev,
        is_finished: false
      }));
    }

    try {
      setSaving(true);
      await createRecord(tableName, formData);
      navigate(`/tables/${tableName}`);
    } catch (err) {
      console.error('Create record error:', err);
      
      // Check if this is a duplicate key error
      if (err.response?.status === 409 && err.response?.data?.errorType === 'DUPLICATE_KEY') {
        const { field, value, message } = err.response.data;
        
        // Show clear error message
        setError(`${message}`);
        
        // Set field-specific error
        if (field) {
          setErrors({
            [field]: `This ${field.replace(/_/g, ' ')} is already in use. Please choose a different one.`
          });
        }
      } else {
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
  
    // Skip ID fields entirely
    if (field === 'id') {
      return null;
    }
    
    // Skip createdAt and updatedAt fields
    if (['createdAt', 'updatedAt'].includes(field)) {
      return null;
    }
  
    if (field === 'is_finished' && (tableName === 'Ink' || tableName === 'Solvent')) {
      // Set default value to false without showing the field
      if (!formData.hasOwnProperty('is_finished')) {
        setFormData(prev => ({
          ...prev,
          is_finished: false
        }));
      }
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
                color="primary"
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
              onChange={(newDate) => handleInputChange(field, newDate)}
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  variant: "outlined",
                  fullWidth: true,
                  error: !!errors[field],
                  helperText: errors[field],
                  InputProps: {
                    readOnly: false,
                  }
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
        // Handle complex fields (complex_1 through complex_6) with enhanced Autocomplete
        if (field.startsWith('complex_') && lookupData.complexes?.length > 0) {
          return (
            <Autocomplete
              fullWidth
              options={lookupData.complexes}
              getOptionLabel={(option) => option.desc || ''}
              isOptionEqualToValue={(option, value) => option.desc === value}
              value={lookupData.complexes.find(c => c.desc === formData[field]) || null}
              onChange={(event, newValue) => {
                handleInputChange(field, newValue ? newValue.desc : '');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={fieldLabel}
                  error={!!errors[field]}
                  helperText={errors[field]}
                />
              )}
              filterOptions={(options, state) => {
                // Custom filtering to allow searching by desc
                const inputValue = state.inputValue.toLowerCase().trim();
                return options.filter(option => 
                  option.desc.toLowerCase().includes(inputValue)
                );
              }}
            />
          );
        }
        
        // Check if field is a reference field (dropdown)
        if (isReferenceField(field) || field.startsWith('ink_') || field.startsWith('solvent_')) {
          const options = getFieldOptions(field);
          
          // Use Autocomplete instead of Select for searchable dropdown
          return (
            <Autocomplete
              fullWidth
              id={`${field}-autocomplete`}
              options={options}
              getOptionLabel={(option) => option.label || ''}
              isOptionEqualToValue={(option, value) => option.value === value}
              value={options.find(opt => opt.value === formData[field]) || null}
              onChange={(event, newValue) => {
                handleInputChange(field, newValue ? newValue.value : '');
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label={fieldLabel}
                  error={!!errors[field]}
                  helperText={errors[field]}
                />
              )}
            />
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
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
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