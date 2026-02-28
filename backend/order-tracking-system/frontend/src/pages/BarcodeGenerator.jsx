import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../api/admin';
import JsBarcode from 'jsbarcode';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Slider,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';
import { generateBarcodeJPEG } from '../utils/barcodePdfGenerator';

const BarcodeGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [barcodeText, setBarcodeText] = useState('');
  const [barcodeOptions, setBarcodeOptions] = useState({
    width: 2,
    height: 100,
    displayValue: true,
    fontSize: 20,
    format: 'CODE128',
    margin: 10,
    textMargin: 2
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: ''
  });
  
  // Reference to SVG container
  const barcodeRef = useRef(null);

  // Define supported barcode formats
  const barcodeFormats = [
    'CODE128', 'CODE39', 'EAN13', 'EAN8', 'EAN5', 'EAN2',
    'UPC', 'UPCE', 'ITF14', 'ITF', 'MSI', 'MSI10', 'MSI11',
    'MSI1010', 'MSI1110', 'pharmacode', 'codabar'
  ];

  // Fetch saved barcode settings from admin_settings
  useEffect(() => {
    const fetchBarcodeSettings = async () => {
      try {
        const response = await adminAPI.getBarcodeSettings();
        if (response.data && response.data.settings) {
          setBarcodeOptions(prev => ({
            ...prev,
            ...response.data.settings
          }));
        }
      } catch (err) {
        console.error('Failed to fetch barcode settings:', err);
        // Use default settings if fetch fails
      }
    };

    fetchBarcodeSettings();
  }, []);

  const generateBarcode = () => {
    if (!barcodeText.trim()) {
      setError('Please enter text for the barcode');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Clear previous content
      if (barcodeRef.current) {
        barcodeRef.current.innerHTML = '';
        
        // Create an SVG element to render the barcode
        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        barcodeRef.current.appendChild(svgElement);
        
        // Generate new barcode on the SVG element
        JsBarcode(svgElement, barcodeText, {
          format: barcodeOptions.format,
          width: barcodeOptions.width,
          height: barcodeOptions.height,
          displayValue: barcodeOptions.displayValue,
          fontSize: barcodeOptions.fontSize,
          margin: barcodeOptions.margin,
          textMargin: barcodeOptions.textMargin
        });
      }
    } catch (err) {
      console.error('Generate barcode error:', err);
      setError('Failed to generate barcode. Please check your input and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeOptionChange = (option, value) => {
    setBarcodeOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const saveSettings = async () => {
    setSaveLoading(true);
    try {
      await adminAPI.updateBarcodeSettings(barcodeOptions);
      
      setSnackbar({
        open: true,
        message: 'Barcode settings saved successfully!'
      });
    } catch (err) {
      console.error('Save settings error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to save settings. Please try again.'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePrintBarcode = () => {
    if (barcodeText && barcodeRef.current && barcodeRef.current.innerHTML) {
      generateBarcodeJPEG(barcodeText);
    } else {
      setError('Please generate a barcode first');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Barcode Generator
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}


      <Grid item xs={12}>
        <Paper sx={{ p: 3, minHeight: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              p: 2 
            }}
          >
            <Typography variant="h6" gutterBottom>
              Generated Barcode
            </Typography>
            <div ref={barcodeRef} />
          </Box>
        </Paper>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Barcode Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Barcode Text"
                  value={barcodeText}
                  onChange={(e) => setBarcodeText(e.target.value)}
                  placeholder="Enter text to encode in barcode"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="barcode-format-label">Barcode Format</InputLabel>
                  <Select
                    labelId="barcode-format-label"
                    value={barcodeOptions.format}
                    label="Barcode Format"
                    onChange={(e) => handleBarcodeOptionChange('format', e.target.value)}
                  >
                    {barcodeFormats.map((format) => (
                      <MenuItem key={format} value={format}>
                        {format}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={barcodeOptions.displayValue}
                      onChange={(e) => 
                        handleBarcodeOptionChange('displayValue', e.target.checked)
                      }
                    />
                  }
                  label="Display Text"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>Width: {barcodeOptions.width}</Typography>
                <Slider
                  value={barcodeOptions.width}
                  min={1}
                  max={4}
                  step={0.5}
                  onChange={(e, value) => handleBarcodeOptionChange('width', value)}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>Height: {barcodeOptions.height}</Typography>
                <Slider
                  value={barcodeOptions.height}
                  min={50}
                  max={150}
                  step={10}
                  onChange={(e, value) => handleBarcodeOptionChange('height', value)}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Typography gutterBottom>Font Size: {barcodeOptions.fontSize}</Typography>
                <Slider
                  value={barcodeOptions.fontSize}
                  min={10}
                  max={30}
                  step={1}
                  onChange={(e, value) => handleBarcodeOptionChange('fontSize', value)}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Typography gutterBottom>Margin: {barcodeOptions.margin}</Typography>
                <Slider
                  value={barcodeOptions.margin}
                  min={0}
                  max={30}
                  step={1}
                  onChange={(e, value) => handleBarcodeOptionChange('margin', value)}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Typography gutterBottom>Text Margin: {barcodeOptions.textMargin}</Typography>
                <Slider
                  value={barcodeOptions.textMargin}
                  min={0}
                  max={10}
                  step={1}
                  onChange={(e, value) => handleBarcodeOptionChange('textMargin', value)}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="contained"
                    onClick={generateBarcode}
                    disabled={loading || !barcodeText.trim()}
                    startIcon={loading ? <CircularProgress size={24} /> : <QrCodeIcon />}
                  >
                    Generate Barcode
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={handlePrintBarcode}
                    disabled={!barcodeText.trim()}
                    startIcon={<PrintIcon />}
                  >
                    Print Barcode
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="success"
                    onClick={saveSettings}
                    disabled={saveLoading}
                    startIcon={saveLoading ? <CircularProgress size={24} /> : <SaveIcon />}
                  >
                    Save Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default BarcodeGenerator;