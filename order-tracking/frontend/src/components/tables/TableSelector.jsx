// src/components/tables/TableSelector.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
} from '@mui/material';
import TableViewIcon from '@mui/icons-material/TableView';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import { useTable } from '../../context/TableContext';
import Loader from '../common/Loader';

const TableSelector = ({ currentTable, onTableChange }) => {
  const { tables, loading } = useTable();
  const navigate = useNavigate();

  const handleTableChange = (event) => {
    const selectedTable = event.target.value;
    onTableChange(selectedTable);
    navigate(`/tables/${selectedTable}`);
  };

  if (loading) {
    return <Loader text="Loading tables..." />;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Database Tables
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="table-select-label">Select Table</InputLabel>
              <Select
                labelId="table-select-label"
                id="table-select"
                value={currentTable || ''}
                label="Select Table"
                onChange={handleTableChange}
              >
                {tables.map((table) => (
                  <MenuItem key={table.name} value={table.name}>
                    {table.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => navigate('/import-export')}
              >
                Import/Export
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/tables/${currentTable}/new`)}
                disabled={!currentTable}
              >
                Add New Record
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {!currentTable && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Available Tables
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            {tables.map((table) => (
              <Grid item xs={12} sm={6} md={4} key={table.name}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TableViewIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">
                        {table.displayName}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      View, add, edit, and manage {table.displayName.toLowerCase()} data
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => {
                        onTableChange(table.name);
                        navigate(`/tables/${table.name}`);
                      }}
                    >
                      View Table
                    </Button>
                    <Button 
                      size="small"
                      onClick={() => navigate(`/tables/${table.name}/new`)}
                    >
                      Add Record
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default TableSelector;