import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Chip, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import InfoIcon from '@mui/icons-material/Info';
import { useState } from 'react';
import api from '../../api/axios';
import { generateBarcodePDF, generateBarcodeJPEG } from '../../utils/barcodePdfGenerator';


const OrderDetails = ({ orderData, activeTab }) => {
  // State for print dialog
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [printableValues, setPrintableValues] = useState([]);

  // Helper function to get data based on active tab
  const getActiveTabData = () => {
    if (!orderData) return [];

    const tabsData = [
      orderData.cutting,
      orderData.lamination,
      orderData.printing,
      orderData.warehouseToDispatch,
      orderData.dispatchToProduction,
      orderData.extruder,
      orderData.rawSlitting,
      orderData.pvc,
      orderData.slitting,
    ];

    // Filter out empty tabs
    const nonEmptyTabs = tabsData.filter(data => data && data.length > 0);
    
    return nonEmptyTabs[activeTab] || [];
  };

  // Get the data for the active tab
  const data = getActiveTabData();

  // Get the table name based on active tab
  const getTableName = () => {
    if (!orderData) return '';

    const tabsMapping = [
      { data: orderData.cutting, name: 'cutting' },
      { data: orderData.lamination, name: 'lamination' },
      { data: orderData.printing, name: 'printing' },
      { data: orderData.warehouseToDispatch, name: 'warehouse_to_dispatch' },
      { data: orderData.dispatchToProduction, name: 'dispatch_to_production' },
      { data: orderData.extruder, name: 'extruder' },
      { data: orderData.rawSlitting, name: 'raw_slitting' },
      { data: orderData.pvc, name: 'pvc' },
      { data: orderData.slitting, name: 'slitting' },
    ];

    // Filter out empty tabs
    const nonEmptyTabs = tabsMapping.filter(tab => tab.data && tab.data.length > 0);
    
    return nonEmptyTabs[activeTab]?.name || '';
  };

  const tableName = getTableName();

  // If no data, return a message
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No data available for this section.
        </Typography>
      </Box>
    );
  }

  // Format cell value based on its type
  const formatCellValue = (key, value, rowData) => {
    if (value === null || value === undefined) {
      return '-';
    }

    // Format dates
    // if (key === 'date' && value) {
    //   return new Date(value).toLocaleString();
    // }

    // Format boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // Return complex object description if available
    if (key === 'complex' && rowData['complex_desc']) {
      return (
        <Tooltip title={`ID: ${value}`}>
          <Chip label={rowData['complex_desc']} size="small" />
        </Tooltip>
      );
    }

    // Handle ink fields with direct approach
    if (key.startsWith('ink_') && !key.includes('_color') && !key.includes('_supplier') && !key.includes('_code') && !key.includes('_pal_number') && !key.includes('_batch_palet_number') && value) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span>{value}</span>
          <IconButton size="small" onClick={async () => {
            console.log("Looking up ink details for:", value);
            
            try {
              // Fetch ink details directly from the ink table
              const response = await api.get(`/tables/Ink/records/${value}`);
              const inkDetails = response.data.record;
              
              console.log("Fetched ink details:", inkDetails);
              
              if (inkDetails) {
                alert(`Ink Details for ${value}:\n\nCode: ${value}\nColor: ${inkDetails.color || 'Not available'}\nSupplier: ${inkDetails.supplier || 'Not available'}\nCode: ${inkDetails.code || 'Not available'}\nPAL Number: ${inkDetails.pal_number || 'Not available'}\nPatch Palet Number: ${inkDetails.batch_palet_number || 'Not available'}`);
              } else {
                alert(`No detailed information found for ink ${value}`);
              }
            } catch (error) {
              console.error("Error fetching ink details:", error);
              alert(`Error looking up ink details for ${value}`);
            }
          }}>
            <InfoIcon fontSize="small" color="primary" />
          </IconButton>
        </Box>
      );
    }

    // Handle solvent fields with direct approach
    if (key.startsWith('solvent_') && !key.includes('_product') && !key.includes('_supplier') && !key.includes('_code') && !key.includes('_pal_number') && !key.includes('_batch_palet_number') && value) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span>{value}</span>
          <IconButton size="small" onClick={async () => {
            console.log("Looking up solvent details for:", value);
            
            try {
              // Fetch solvent details directly from the solvent table
              const response = await api.get(`/tables/Solvent/records/${value}`);
              const solventDetails = response.data.record;
              
              console.log("Fetched solvent details:", solventDetails);
              
              if (solventDetails) {
                alert(`Solvent Details for ${value}:\n\nCode: ${value}\nProduct: ${solventDetails.product || 'Not available'}\nSupplier: ${solventDetails.supplier || 'Not available'}\nCode: ${solventDetails.code || 'Not available'}\nPAL Number: ${solventDetails.pal_number || 'Not available'}\nPatch Palet Number: ${solventDetails.batch_palet_number || 'Not available'}`);
              } else {
                alert(`No detailed information found for solvent ${value}`);
              }
            } catch (error) {
              console.error("Error fetching solvent details:", error);
              alert(`Error looking up solvent details for ${value}`);
            }
          }}>
            <InfoIcon fontSize="small" color="secondary" />
          </IconButton>
        </Box>
      );
    }

    return value.toString();
  };

  // Get all columns from the first item
  // Make sure we include ink and solvent fields for printing
  const getColumns = () => {
    const allKeys = Object.keys(data[0]).filter(
      // Exclude internal Sequelize fields but include anything with ink_ or solvent_
      key => !['createdAt', 'updatedAt'].includes(key)
    );
    
    return allKeys;
  };

  const columns = getColumns();

  // Handle barcode printing dialog open
  const handleOpenPrintDialog = (row) => {
    // Find fields that contain 'batch_number' or 'barcode' in their name
    const printable = Object.entries(row)
      .filter(([key, value]) => 
        (key.includes('batch_number') || key.includes('barcode')) && 
        value && 
        typeof value === 'string'
      )
      .map(([key, value]) => ({
        key,
        value,
        label: key.replace(/_/g, ' ').toUpperCase()
      }));
    
    if (printable.length === 0) {
      // If no printable fields found, check if there's just a general batch number or barcode field
      if (row.batch_number) {
        printable.push({
          key: 'batch_number',
          value: row.batch_number,
          label: 'BATCH NUMBER'
        });
      } else if (row.barcode) {
        printable.push({
          key: 'barcode',
          value: row.barcode,
          label: 'BARCODE'
        });
      }
    }
    
    setSelectedRow(row);
    setPrintableValues(printable);
    
    if (printable.length === 1) {
      // If only one printable value, print it directly without showing the dialog
      handlePrintBarcode(
        printable[0].value,
        row.order_number,
        row.customer_name || row.client_name || row.client || row.customer
      );
    } else if (printable.length > 1) {
      // If multiple printable values, show the dialog
      setPrintDialogOpen(true);
    } else {
      // No printable values found
      alert('No batch number or barcode found to print.');
    }
  };

  // Handle barcode printing
  const handlePrintBarcode = (value, orderNumber, customerName) => {
    if (value) {
      generateBarcodeJPEG(value, orderNumber, customerName);
      setPrintDialogOpen(false);
    }
  };

  // Close print dialog
  const handleClosePrintDialog = () => {
    setPrintDialogOpen(false);
  };

  return (
    <Box sx={{ p: 0 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                return (
                  <TableCell key={column}>
                    {column.replace(/_/g, ' ').toUpperCase()}
                  </TableCell>
                );
              }).filter(Boolean)}
              <TableCell>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => {
                  const cellValue = formatCellValue(column, row[column], row);
                  if (cellValue === null) return null;
                  
                  return (
                    <TableCell key={`${rowIndex}-${column}`}>
                      {cellValue}
                    </TableCell>
                  );
                }).filter(Boolean)}
                <TableCell>
                  {/* Print Button - now checks for any field containing batch_number or barcode */}
                  {Object.keys(row).some(key => 
                    (key.includes('batch_number') || key.includes('barcode')) && row[key]
                  ) && (
                    <Tooltip title="Print Barcode/Batch Number">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenPrintDialog(row)}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onClose={handleClosePrintDialog}>
        <DialogTitle>Choose Value to Print</DialogTitle>
        <DialogContent>
          <List>
            {printableValues.map((item, index) => (
              <ListItem 
                button 
                key={index} 
                onClick={() => handlePrintBarcode(
                  item.value, 
                  selectedRow?.order_number, 
                  selectedRow?.customer_name || selectedRow?.client_name || selectedRow?.client || selectedRow?.customer
                )}
              >
                <ListItemText 
                  primary={`${item.label}: ${item.value}`} 
                  secondary={`Click to print this value as barcode`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrintDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetails;