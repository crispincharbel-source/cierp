// src/components/tables/DataTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Tooltip,
  Typography,
  Collapse,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  List, 
  ListItem, 
  ListItemText 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import PrintIcon from '@mui/icons-material/Print';
import { useTable } from '../../context/TableContext';
import { getRecords, getRecord, updateRecord, deleteRecord } from '../../api/tables';
import { format } from 'date-fns';
import Loader from '../common/Loader';
import { generateBarcodePDF  , generateBarcodeJPEG} from '../../utils/barcodePdfGenerator';


const DataTable = ({ tableName }) => {
  const navigate = useNavigate();
  const { 
    getTableFields, 
    isPrimaryKey, 
    getFieldType, 
    isReferenceField, 
    lookupData,
    getFieldOptions,
    refreshLookupData,
  } = useTable();
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [draftFilters, setDraftFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    id: null,
    record: null,
  });

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [printableValues, setPrintableValues] = useState([]);


  // Initialize draftFilters and draftSearchQuery when component mounts
  useEffect(() => {
    setDraftFilters(filters);
    setDraftSearchQuery(searchQuery);
  }, []);

  // Debounce for filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(draftFilters) !== JSON.stringify(filters)) {
        setFilters(draftFilters);
        setPage(0);
      }
    }, 750); // 750ms debounce time

    return () => clearTimeout(timer);
  }, [draftFilters]);

  // Debounce for search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draftSearchQuery !== searchQuery) {
        setSearchQuery(draftSearchQuery);
        setPage(0);
      }
    }, 750); // 750ms debounce time

    return () => clearTimeout(timer);
  }, [draftSearchQuery]);

  // Fetch records
  useEffect(() => {
    const fetchData = async () => {
      if (!tableName) return;
      
      try {
        setLoading(true);
        const response = await getRecords(
          tableName,
          page + 1,
          rowsPerPage,
          orderBy,
          order,
          searchQuery,
          filters
        );
        
        setRecords(response.records || []);
        setTotalRecords(response.pagination?.total || 0);
      } catch (err) {
        console.error(`Fetch ${tableName} records error:`, err);
        setError(
          err.response?.data?.message || 
          `Failed to fetch ${tableName} records. Please try again.`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableName, page, rowsPerPage, orderBy, order, searchQuery, filters]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSearch = (event) => {
    setDraftSearchQuery(event.target.value);
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setDraftFilters({});
    setFilters({});
    setDraftSearchQuery('');
    setSearchQuery('');
    setPage(0);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleDeleteRecord = async () => {
    try {
      await deleteRecord(tableName, confirmDelete.id);
      setSuccess(`Record deleted successfully`);
      
      // Refresh the data
      const response = await getRecords(
        tableName,
        page + 1,
        rowsPerPage,
        orderBy,
        order,
        searchQuery,
        filters
      );
      
      setRecords(response.records || []);
      setTotalRecords(response.pagination?.total || 0);
      
      // Close dialog
      setConfirmDelete({ open: false, id: null, record: null });
    } catch (err) {
      console.error('Delete record error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to delete record. Please try again.'
      );
    }
  };

  const openDeleteConfirm = (id, record) => {
    setConfirmDelete({
      open: true,
      id,
      record,
    });
  };

  const closeDeleteConfirm = () => {
    setConfirmDelete({
      open: false,
      id: null,
      record: null,
    });
  };

  // Format date using date-fns
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  // Handle toggling is_finished status
  const handleToggleFinished = async (recordId, isFinished) => {
    try {
      console.log(`Toggling finish status for ${tableName} record ${recordId} to ${isFinished}`);
      
      // Get current record data
      const response = await getRecord(tableName, recordId);
      const record = response.record;
      
      if (!record) {
        throw new Error('Record not found');
      }
      
      console.log('Current record data:', record);
      
      // Update only the is_finished field
      const updatedRecord = { ...record, is_finished: isFinished };
      await updateRecord(tableName, recordId, updatedRecord);
      
      console.log('Record updated successfully');
      
      // Refresh the lookup data to update dropdowns
      refreshLookupData();
      
      // Refresh the data
      const refreshResponse = await getRecords(
        tableName,
        page + 1,
        rowsPerPage,
        orderBy,
        order,
        searchQuery,
        filters
      );
      
      setRecords(refreshResponse.records || []);
      setSuccess(`Record ${isFinished ? 'marked as finished' : 'marked as active'}`);
    } catch (error) {
      console.error('Toggle finished status error:', error);
      setError(
        error.response?.data?.message || 
        'Failed to update record status. Please try again.'
      );
    }
  };

  
// Format cell value based on its type
const formatCellValue = (field, value, record) => {
  if (value === null || value === undefined) {
    return '-';
  }

  // Ensure field is a string before using string methods
  const fieldStr = String(field);

  // Format dates
  if (getFieldType(field) === 'date' && value) {
    return formatDate(value);
  }

  // Special handling for is_finished field in Ink and Solvent tables
  if (fieldStr === 'is_finished' && (tableName === 'Ink' || tableName === 'Solvent')) {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={!!value}
            onChange={(e) => handleToggleFinished(record[getPrimaryKeyField()], e.target.checked)}
            size="small"
            color="primary"
          />
        }
        label="Mark as finished"
        sx={{ m: 0 }}
      />
    );
  }

  // Format other boolean values
  if (getFieldType(field) === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Format complex field - now we display the value directly since it's already a description
  if (fieldStr === 'complex') {
    return (
      <Chip label={value} size="small" />
    );
  }

  // Format ink field
  if (fieldStr.startsWith('ink_') && lookupData.inks) {
    const ink = lookupData.inks.find(i => i.code_number === value);
    if (ink) {
      return (
        <Tooltip title={`${value} (PAL: ${ink.pal_number || 'N/A'}, Patch: ${ink.batch_palet_number || 'N/A'})`}>
          <Chip label={ink.color} size="small" color="primary" />
        </Tooltip>
      );
    }
  }

  // Format solvent field
  if (fieldStr.startsWith('solvent_') && lookupData.solvents) {
    const solvent = lookupData.solvents.find(s => s.code_number === value);
    if (solvent) {
      return (
        <Tooltip title={`${value} (PAL: ${solvent.pal_number || 'N/A'}, Patch: ${solvent.batch_palet_number || 'N/A'})`}>
          <Chip label={solvent.product} size="small" color="secondary" />
        </Tooltip>
      );
    }
  }

  return String(value);
};

  // Get the primary key field of the table
  const getPrimaryKeyField = () => {
    const fields = getTableFields();
    return fields.find(field => isPrimaryKey(field)) || 'id';
  };

  // Render filter fields
  const renderFilterField = (field) => {
    const fieldType = getFieldType(field);
    // Ensure field is treated as a string before calling replace
    const fieldLabel = typeof field === 'string' 
      ? field.replace(/_/g, ' ').toUpperCase() 
      : String(field).toUpperCase();

    const fieldStr = String(field);
    
    // Handle different field types for filtering
    switch (fieldType) {
      case 'boolean':
        return (
          <FormControl fullWidth size="small">
            <InputLabel id={`filter-${field}-label`}>{fieldLabel}</InputLabel>
            <Select
              labelId={`filter-${field}-label`}
              value={draftFilters[field] || ''}
              onChange={(e) => handleFilterChange(field, e.target.value)}
              label={fieldLabel}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              <MenuItem value={true}>Yes</MenuItem>
              <MenuItem value={false}>No</MenuItem>
            </Select>
          </FormControl>
        );
        
      case 'date':
        // For date fields, use a text field for simplicity
        return (
          <TextField
            fullWidth
            size="small"
            label={fieldLabel}
            value={draftFilters[field] || ''}
            onChange={(e) => handleFilterChange(field, e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        );
        
      default:
        // Check if field is a reference field (dropdown)
        if (isReferenceField(field) || fieldStr === 'complex' || fieldStr.startsWith('ink_') || fieldStr.startsWith('solvent_')) {
          const options = getFieldOptions(field);
          
          return (
            <FormControl fullWidth size="small">
              <InputLabel id={`filter-${field}-label`}>{fieldLabel}</InputLabel>
              <Select
                labelId={`filter-${field}-label`}
                value={draftFilters[field] || ''}
                onChange={(e) => handleFilterChange(field, e.target.value)}
                label={fieldLabel}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
        
        // Default text field for filtering
        return (
          <TextField
            fullWidth
            size="small"
            label={fieldLabel}
            value={draftFilters[field] || ''}
            onChange={(e) => handleFilterChange(field, e.target.value)}
          />
        );
    }
  };

  if (loading && records.length === 0) {
    return <Loader text={`Loading ${tableName} data...`} />;
  }

  const fields = getTableFields().filter(field => 
    !['createdAt', 'updatedAt'].includes(field)
  );

  // Select filterable fields (exclude complex fields or primary keys)
  const filterableFields = fields.filter(field => 
    !isPrimaryKey(field) && 
    !['createdAt', 'updatedAt'].includes(field)
  );

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
    <Box>
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
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={draftSearchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mr: 2, flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={showFilters ? <ExpandLessIcon /> : <FilterListIcon />}
            onClick={toggleFilters}
            sx={{ mr: 2 }}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/tables/${tableName}/new`)}
          >
            Add Record
          </Button>
        </Box>

        <Collapse in={showFilters}>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Filter Records
            </Typography>
            
            <Grid container spacing={2}>
              {filterableFields.map((field) => (
                <Grid item xs={12} sm={6} md={3} key={`filter-${field}`}>
                  {renderFilterField(field)}
                </Grid>
              ))}
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                sx={{ mr: 1 }}
                disabled={Object.keys(draftFilters).length === 0 && !draftSearchQuery}
              >
                Clear Filters
              </Button>
            </Box>
          </Box>
        </Collapse>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {fields.map((field) => (
                  <TableCell key={field}>
                    <TableSortLabel
                      active={orderBy === field}
                      direction={orderBy === field ? order : 'asc'}
                      onClick={() => handleSort(field)}
                    >
                      {typeof field === 'string' 
                        ? field.replace(/_/g, ' ').toUpperCase() 
                        : String(field).toUpperCase()}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.length > 0 ? (
                records.map((record) => {
                  // Check if this is an Ink or Solvent that is finished
                  const isFinished = 
                    (tableName === 'Ink' || tableName === 'Solvent') && 
                    record.is_finished === true;
                  
                  return (
                    <TableRow 
                      key={record[getPrimaryKeyField()]}
                      sx={{ 
                        backgroundColor: isFinished ? '#f5f5f5' : 'inherit',
                        color: isFinished ? '#9e9e9e' : 'inherit',
                        '& .MuiTableCell-root': isFinished ? { color: '#9e9e9e' } : {}
                      }}
                    >
                      {fields.map((field) => (
                        <TableCell key={field}>
                          {formatCellValue(field, record[field], record)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/tables/${tableName}/edit/${record[getPrimaryKeyField()]}`)}
                            title="Edit"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openDeleteConfirm(record[getPrimaryKeyField()], record)}
                            title="Delete"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          {/* Print Button - now checks for any field containing batch_number or barcode */}
                          {Object.keys(record).some(key => 
                            (key.includes('batch_number') || key.includes('barcode')) && record[key]
                          ) && (
                            <Tooltip title="Print Barcode/Batch Number">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenPrintDialog(record)}
                              >
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={fields.length + 1} align="center">
                    {Object.keys(filters).length > 0 || searchQuery ? (
                      <>
                        No records match your search criteria.
                        <Button 
                          size="small" 
                          onClick={clearFilters} 
                          sx={{ ml: 1 }}
                        >
                          Clear Filters
                        </Button>
                      </>
                    ) : (
                      <>
                        No records found. 
                        <Button 
                          size="small" 
                          onClick={() => navigate(`/tables/${tableName}/new`)} 
                          sx={{ ml: 1 }}
                        >
                          Add Record
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDelete.open}
        onClose={closeDeleteConfirm}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this record? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirm}>Cancel</Button>
          <Button onClick={handleDeleteRecord} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
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

export default DataTable;