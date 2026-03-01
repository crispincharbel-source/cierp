// src/components/tables/ImportExport.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { useTable } from '../../context/TableContext';
import { importCSV, exportCSV } from '../../api/tables';
import Loader from '../common/Loader';

const ImportExport = () => {
  const navigate = useNavigate();
  
  // Use the TableContext, handle the case when it's not available
  const tableContext = useTable();
  const { tables = [], loading = false } = tableContext || {};
  
  const [selectedTable, setSelectedTable] = useState('');
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importResults, setImportResults] = useState(null);

  const handleTableChange = (event) => {
    setSelectedTable(event.target.value);
    setError('');
    setSuccess('');
    setImportResults(null);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    if (selectedFile) {
      // Check if file is a CSV
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file');
        setFile(null);
        event.target.value = '';
        return;
      }
      
      setFile(selectedFile);
    } else {
      setFile(null);
    }
    
    setError('');
    setSuccess('');
    setImportResults(null);
  };

  const handleImport = async () => {
    if (!selectedTable) {
      setError('Please select a table');
      return;
    }
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    
    try {
      setImporting(true);
      setError('');
      setSuccess('');
      
      const response = await importCSV(selectedTable, file);
      
      setSuccess(`${response.importedRows} out of ${response.totalRows} records imported successfully`);
      setImportResults(response);
      
      // Reset file input
      setFile(null);
      document.getElementById('csv-file-input').value = '';
    } catch (err) {
      console.error('Import CSV error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to import CSV. Please check your file and try again.'
      );
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    if (!selectedTable) {
      setError('Please select a table');
      return;
    }
    
    exportCSV(selectedTable);
  };

  if (loading) {
    return <Loader text="Loading tables..." />;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Import/Export Data
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

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="table-select-label">Select Table</InputLabel>
              <Select
                labelId="table-select-label"
                id="table-select"
                value={selectedTable}
                label="Select Table"
                onChange={handleTableChange}
              >
                <MenuItem value="">
                  <em>Select a table</em>
                </MenuItem>
                {tables && tables.length > 0 ? (
                  tables.map((table) => (
                    <MenuItem key={table.name} value={table.name}>
                      {table.displayName || table.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No tables available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Import CSV
            </Typography>
            <Box sx={{ mb: 2 }}>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <label htmlFor="csv-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  sx={{ mr: 2 }}
                >
                  Select CSV File
                </Button>
              </label>
              {file && (
                <Typography variant="body2" component="span">
                  {file.name}
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!selectedTable || !file || importing}
              startIcon={importing ? <CircularProgress size={20} /> : null}
            >
              {importing ? 'Importing...' : 'Import Data'}
            </Button>

            {importResults && importResults.errors && importResults.errors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error">
                  Import Errors:
                </Typography>
                <List dense>
                  {importResults.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`Row ${error.row}: ${error.message}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Export CSV
            </Typography>
            <Button
              variant="contained"
              onClick={handleExport}
              disabled={!selectedTable}
              startIcon={<DownloadIcon />}
            >
              Export Table Data
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/tables')}
        >
          Back to Tables
        </Button>
      </Box>
    </Box>
  );
};

export default ImportExport;