import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
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
import { format, parseISO } from 'date-fns';
import { useTable } from '../../context/TableContext';
import { getRecord, updateRecord } from '../../api/tables';
import Loader from '../common/Loader';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const EditRecord = () => {
  const { tableName, id } = useParams();
  const navigate = useNavigate();
  const { 
    getTableFields, 
    getFieldType, 
    isPrimaryKey, 
    isReferenceField,
    getFieldOptions,
    lookupData,
    loading: tableLoading 
  } = useTable();
  
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch record data
  useEffect(() => {
    const fetchData = async () => {
      if (!tableName || !id) return;
      
      try {
        setLoading(true);
        const response = await getRecord(tableName, id);
        setFormData(response.record || {});
        setOriginalData(response.record || {});
      } catch (err) {
        console.error('Fetch record error:', err);
        setError(
          err.response?.data?.message || 
          'Failed to fetch record data. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (tableName && id) {
      fetchData();
    }
  }, [tableName, id]);

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
      // Skip primary key fields (can't be changed)
      if (isPrimaryKey(field)) {
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
      if (getFieldType(field) !== 'boolean' && (value === undefined || value === null || value === '')) {
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
      await updateRecord(tableName, id, formData);
      setSuccess('Record updated successfully');
      
      // Update original data to reflect changes
      setOriginalData({ ...formData });
    } catch (err) {
      console.error('Update record error:', err);
      
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
          'Failed to update record. Please check your inputs and try again.'
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

  const hasChanges = () => {
    const fields = getTableFields();
    return fields.some(field => {
      // Skip createdAt and updatedAt
      if (['createdAt', 'updatedAt',].includes(field)) {
        return false;
      }
      
      // Compare current value with original value
      return JSON.stringify(formData[field]) !== JSON.stringify(originalData[field]);
    });
  };

  const renderField = (field) => {
    // Make primary key fields read-only
    const isReadOnly = isPrimaryKey(field);
    
    // Skip the ID field entirely
    if (field === 'id') {
      return null;
    }
    
    // Skip createdAt and updatedAt fields
    if (['createdAt', 'updatedAt', 'is_finished'].includes(field)) {
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
                disabled={isReadOnly}
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
              value={formData[field] ? new Date(formData[field]) : null}
              onChange={(newDate) => handleInputChange(field, newDate)}
              format="dd/MM/yyyy"
              disabled={isReadOnly}
              slotProps={{
                textField: {
                  variant: "outlined",
                  fullWidth: true,
                  error: !!errors[field],
                  helperText: errors[field],
                  InputProps: {
                    readOnly: isReadOnly,
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
            InputProps={{
              readOnly: isReadOnly,
            }}
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
            InputProps={{
              readOnly: isReadOnly,
            }}
          />
        );
        
      default:
        // Handle complex fields (complex_1 through complex_6) with enhanced Autocomplete
        if (field.startsWith('complex_') && lookupData.complexes?.length > 0) {
          return (
            <Autocomplete
              fullWidth
              disabled={isReadOnly}
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
                  InputProps={{
                    ...params.InputProps,
                    readOnly: isReadOnly,
                  }}
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
              disabled={isReadOnly}
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
                  InputProps={{
                    ...params.InputProps,
                    readOnly: isReadOnly,
                  }}
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
            InputProps={{
              readOnly: isReadOnly,
            }}
          />
        );
    }
  };

  if (loading || tableLoading) {
    return <Loader text="Loading record data..." />;
  }

  const fields = getTableFields();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/tables/${tableName}`)}
          sx={{ mr: 2 }}
        >
          Back to Table
        </Button>
        <Typography variant="h5">
          Edit {tableName.replace(/([A-Z])/g, ' $1').trim()}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
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
              disabled={saving || !hasChanges()}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default EditRecord;