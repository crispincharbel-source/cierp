// src/components/admin/FieldsConfig.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTable } from '../../context/TableContext';
import Loader from '../common/Loader';

const FieldsConfig = () => {
  const { tables, loading: tablesLoading } = useTable();
  const [tableStructures, setTableStructures] = useState({});
  const [fieldsConfig, setFieldsConfig] = useState({});
  const [originalConfig, setOriginalConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Get the snake_case table name to use consistently with backend
  const getSnakeCaseTableName = (tableName) => {
    // Special case for PVC
    if (tableName === 'PVC') return 'pvc';
    
    // Convert PascalCase to snake_case
    return tableName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, ''); // Remove leading underscore if present
  };

  // Fetch current configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/settings/order-tracking-fields');
        
        const config = response.data.fieldsConfig || {};
        console.log('Fetched configuration from server:', config);
        setFieldsConfig(config);
        // Store original config for comparison
        setOriginalConfig(JSON.parse(JSON.stringify(config)));
      } catch (err) {
        console.error('Fetch fields config error:', err);
        setError(
          err.response?.data?.message || 
          'Failed to fetch configuration. Please try again.'
        );
        // Initialize with empty objects if fetch fails
        setFieldsConfig({});
        setOriginalConfig({});
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Fetch table structures for all tables
  useEffect(() => {
    const fetchTableStructures = async () => {
      if (!tables || tables.length === 0) return;
      
      const structures = {};
      
      for (const table of tables) {
        try {
          const response = await api.get(`/tables/${table.name}/structure`);
          structures[table.name] = response.data.structure;
        } catch (err) {
          console.error(`Error fetching structure for ${table.name}:`, err);
        }
      }
      
      setTableStructures(structures);
    };

    if (tables && tables.length > 0) {
      fetchTableStructures();
    }
  }, [tables]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleFieldChange = (table, field, checked) => {
    // Convert to snake_case for consistent backend naming
    const snakeCaseTable = getSnakeCaseTableName(table);
    
    console.log(`Toggle field ${field} for table ${snakeCaseTable}: ${checked}`);
    
    setFieldsConfig(prev => {
      // Create a deep copy of the current state
      const newConfig = JSON.parse(JSON.stringify(prev));
      
      // Initialize the table array if it doesn't exist
      if (!newConfig[snakeCaseTable]) {
        newConfig[snakeCaseTable] = [];
      }
      
      if (checked) {
        // Add field to the list if not already present
        if (!newConfig[snakeCaseTable].includes(field)) {
          newConfig[snakeCaseTable].push(field);
        }
      } else {
        // Remove field from the list
        const index = newConfig[snakeCaseTable].indexOf(field);
        if (index !== -1) {
          newConfig[snakeCaseTable].splice(index, 1);
        }
      }
      
      console.log('Updated config:', newConfig);
      return newConfig;
    });
  };

  const handleSaveConfig =async () => {
    try {
      setSaving(true);
      setError('');
      console.log('Saving configuration:', fieldsConfig);
      
      // Define the allowed tracking tables (with correct naming)
      const trackingTables = [
        'cutting', 'lamination', 'printing', 'warehouse_to_dispatch', 
        'dispatch_to_production', 'extruder', 'raw_slitting', 
        'pvc', 'slitting'
      ];
      
      // Create a new filtered config object with only the allowed tables
      const filteredConfig = {};
      trackingTables.forEach(tableName => {
        // Ensure we're using the correct field names in the backend
        filteredConfig[tableName] = fieldsConfig[tableName] || [];
      });
      
      console.log('Sending filtered configuration to server:', { fieldsConfig: filteredConfig });
      
      // Send the configuration to the server
      const response = await api.put('/admin/settings/order-tracking-fields', {
        fieldsConfig: filteredConfig
      });
      
      console.log('Save response:', response.data);
      
      // Check if the response includes the updated setting
      if (response.data.setting && response.data.setting.setting_value) {
        try {
          // Parse the JSON string from setting_value
          const savedConfig = JSON.parse(response.data.setting.setting_value);
          // Update our state with the saved configuration
          setOriginalConfig(JSON.parse(JSON.stringify(savedConfig)));
          setFieldsConfig(savedConfig);
        } catch (parseError) {
          console.error('Error parsing saved configuration:', parseError);
          // If parsing fails, use our filtered config
          setOriginalConfig(JSON.parse(JSON.stringify(filteredConfig)));
          setFieldsConfig(filteredConfig);
        }
      } else {
        // If there's no setting_value in the response, use our filtered config
        setOriginalConfig(JSON.parse(JSON.stringify(filteredConfig)));
        setFieldsConfig(filteredConfig);
      }
      
      setSuccess('Configuration saved successfully');
      
    } catch (err) {
      console.error('Save fields config error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to save configuration. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfig = () => {
    console.log('Resetting to original config:', originalConfig);
    setFieldsConfig(JSON.parse(JSON.stringify(originalConfig)));
  };

  const isFieldChecked = (table, field) => {
    const snakeCaseTable = getSnakeCaseTableName(table);
    const tableFields = fieldsConfig[snakeCaseTable] || [];
    return tableFields.includes(field);
  };

  // Check if configuration has been modified
  const hasChanges = () => {
    // Compare fieldsConfig with originalConfig
    const configStr = JSON.stringify(fieldsConfig);
    const originalStr = JSON.stringify(originalConfig);
    return configStr !== originalStr;
  };

  if (loading || tablesLoading) {
    return <Loader text="Loading configuration..." />;
  }

  // Get current tab table name
  const getTabTableName = () => {
    if (tables.length === 0) return '';
    return tables[activeTab]?.name;
  };

  // Filter out ink, solvent, and complex tables for display
  const filteredTables = tables.filter(table => 
    !['Ink', 'Solvent', 'Complex'].includes(table.name)
  );

  // Get fields for current table
  const getTableFields = () => {
    const tableName = getTabTableName();
    if (!tableName || !tableStructures[tableName]) return [];
    
    return tableStructures[tableName]
      .filter(field => !field.primaryKey && field.name !== 'createdAt' && field.name !== 'updatedAt')
      .map(field => field.name);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Order Tracking Display Fields
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure which fields are displayed in the order tracking view for each table.
      </Typography>

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

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {filteredTables.map((table) => (
              <Tab key={table.name} label={table.displayName} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {filteredTables.length > 0 ? (
            <>
              <FormControl component="fieldset" variant="standard" fullWidth>
                <FormLabel component="legend">
                  Select fields to display for {filteredTables[activeTab]?.displayName}
                </FormLabel>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {getTableFields().map((field) => (
                    <Grid item xs={12} sm={6} md={4} key={field}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isFieldChecked(getTabTableName(), field)}
                            onChange={(e) => handleFieldChange(getTabTableName(), field, e.target.checked)}
                          />
                        }
                        label={field.replace(/_/g, ' ').toUpperCase()}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormControl>
              {getTableFields().length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center">
                  No configurable fields found for this table.
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center">
              No tables available for configuration.
            </Typography>
          )}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={handleResetConfig}
          disabled={!hasChanges()}
        >
          Reset Changes
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={24} /> : <SaveIcon />}
          onClick={handleSaveConfig}
          disabled={saving || !hasChanges()}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
    </Box>
  );
};

export default FieldsConfig;