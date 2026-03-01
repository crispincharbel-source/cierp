import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { TableProvider, useTable } from '../context/TableContext';
import TableSelector from '../components/tables/TableSelector';
import DataTable from '../components/tables/DataTable';
import AddRecord from '../components/tables/AddRecord';
import EditRecord from '../components/tables/EditRecord';
import Loader from '../components/common/Loader';

const TableContent = () => {
  const { tableName, action, id } = useParams();
  const navigate = useNavigate();
  const { setSelectedTable, tables, loading } = useTable();
  
  // Set selected table when tableName param changes
  useEffect(() => {
    if (tableName) {
      setSelectedTable(tableName);
    }
  }, [tableName, setSelectedTable]);
  
  // Check if table exists
  const tableExists = tableName ? tables.some(t => t.name === tableName) : true;
  
  if (loading) {
    return <Loader text="Loading tables..." />;
  }
  
  if (tableName && !tableExists && !loading) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="error">
          Table Not Found
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          The table "{tableName}" does not exist or you do not have access to it.
        </Typography>
      </Box>
    );
  }
  
  // Determine what to render based on action
  if (action === 'new') {
    return <AddRecord />;
  } else if (action === 'edit' && id) {
    return <EditRecord />;
  }
  
  return (
    <Box>
      <TableSelector
        currentTable={tableName}
        onTableChange={(table) => navigate(`/tables/${table}`)}
      />
      
      {tableName && <DataTable tableName={tableName} />}
    </Box>
  );
};

const Tables = () => {
  return (
    <TableProvider>
      <TableContent />
    </TableProvider>
  );
};

export default Tables;