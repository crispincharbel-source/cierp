// src/pages/ImportExport.jsx
import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import ImportExportComponent from '../components/tables/ImportExport';
import { TableProvider } from '../context/TableContext';

const ImportExportPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Import/Export Data
        </Typography>
        
        <TableProvider>
          <ImportExportComponent />
        </TableProvider>
      </Box>
    </Container>
  );
};

export default ImportExportPage;