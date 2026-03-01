// src/context/TableContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Create context
const TableContext = createContext();

// Export custom hook to use the context
export const useTable = () => {
  const context = useContext(TableContext);
  
  if (!context) {
    throw new Error('useTable must be used within a TableProvider');
  }
  
  return context;
};

// Provider component
export const TableProvider = ({ children }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lookupData, setLookupData] = useState({ inks: [], solvents: [], complexes: [] });
  const [tableFields, setTableFields] = useState({});
  const [lookupDataUpdateTrigger, setLookupDataUpdateTrigger] = useState(0);

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await api.get('/tables/list');
        setTables(response.data.tables);
        
        // Initialize lookup data
        await fetchLookupData();
      } catch (err) {
        console.error('Error fetching tables:', err);
        setError(err.response?.data?.message || 'Failed to fetch tables');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  // Fetch lookup data for references
  const fetchLookupData = async () => {
    try {
      console.log('Fetching lookup data...');
      const response = await api.get('/tables/lookup-data');
      
      // Validate the response
      if (!response.data) {
        console.error('Invalid lookup data response:', response);
        return;
      }
      
      // Log what we received
      console.log('Lookup data received:', {
        inks: response.data.inks ? response.data.inks.length : 0,
        solvents: response.data.solvents ? response.data.solvents.length : 0,
        complexes: response.data.complexes ? response.data.complexes.length : 0
      });
      
      // Make sure we have valid arrays for each type
      const updatedLookupData = {
        inks: Array.isArray(response.data.inks) ? response.data.inks : [],
        solvents: Array.isArray(response.data.solvents) ? response.data.solvents : [],
        complexes: Array.isArray(response.data.complexes) ? response.data.complexes : []
      };
      
      // Set the lookup data in state
      setLookupData(updatedLookupData);
    } catch (err) {
      console.error('Error fetching lookup data:', err);
    }
  };

  // Update lookup data when triggered
  useEffect(() => {
    if (lookupDataUpdateTrigger > 0) {
      fetchLookupData();
    }
  }, [lookupDataUpdateTrigger]);

  // Function to trigger a refresh of lookup data
  const refreshLookupData = () => {
    console.log('Refreshing lookup data...');
    setLookupDataUpdateTrigger(prev => prev + 1);
  };

  // Fetch table fields when a table is selected
  useEffect(() => {
    const fetchTableFields = async () => {
      if (!selectedTable) return;
      
      if (tableFields[selectedTable]) {
        // We already have the fields for this table
        return;
      }
      
      try {
        const response = await api.get(`/tables/${selectedTable}/structure`);
        setTableFields(prev => ({
          ...prev,
          [selectedTable]: response.data.structure
        }));
      } catch (err) {
        console.error(`Error fetching fields for ${selectedTable}:`, err);
      }
    };

    fetchTableFields();
  }, [selectedTable, tableFields]);

  // Get fields for the selected table
  const getTableFields = () => {
    if (!selectedTable || !tableFields[selectedTable]) {
      return [];
    }
    
    return tableFields[selectedTable].map(field => field.name);
  };

  // Check if a field is a primary key
  const isPrimaryKey = (fieldName) => {
    if (!selectedTable || !tableFields[selectedTable]) {
      return false;
    }
    
    const field = tableFields[selectedTable].find(f => f.name === fieldName);
    return field ? field.primaryKey : false;
  };

  // Check if a field is auto increment
  const isAutoIncrement = (fieldName) => {
    if(!selectedTable || !tableFields[selectedTable]) {
      return false; 
    }
    const field = tableFields[selectedTable].find(f => f.name === fieldName);
    return field ? field.autoIncrement : false;
  };

  // Get the type of a field
  const getFieldType = (fieldName) => {
    if (!selectedTable || !tableFields[selectedTable]) {
      return 'string';
    }
    
    const field = tableFields[selectedTable].find(f => f.name === fieldName);
    return field ? field.type : 'string';
  };

  // Check if a field is a reference field
  const isReferenceField = (fieldName) => {
    if (!selectedTable || !tableFields[selectedTable]) {
      return false;
    }
    
    const field = tableFields[selectedTable].find(f => f.name === fieldName);
    return field && field.references ? true : false;
  };

  // Get the referenced model for a field
  const getReferencedModel = (fieldName) => {
    if (!selectedTable || !tableFields[selectedTable]) {
      return null;
    }
    
    const field = tableFields[selectedTable].find(f => f.name === fieldName);
    return field && field.references ? field.references.model : null;
  };

  // Get options for a field (for dropdowns)
  const getFieldOptions = (fieldName) => {
    if (!selectedTable || !tableFields[selectedTable]) {
      return [];
    }
    
    // Convert fieldName to string to safely use string methods
    const fieldStr = String(fieldName).toLowerCase();

    // Handle complex fields (complex_1 through complex_6)
    if (fieldStr.startsWith('complex_') && lookupData.complexes) {
      // For complex fields, return the descriptions as both value and label
      return lookupData.complexes.map(complex => ({
        value: complex.desc,
        label: complex.desc
      }));
    }
    
    // Handle ink fields - match any field that starts with 'ink_' (case insensitive)
    if (fieldStr.startsWith('ink_')) {
      if (!lookupData.inks || !Array.isArray(lookupData.inks)) {
        console.log('No ink data available');
        return [];
      }
      
      // Only show inks that are not finished, properly handling boolean comparison
      // Make sure we're casting the is_finished property to a boolean
      const activeInks = lookupData.inks.filter(ink => ink.is_finished !== true);
      
      console.log(`Found ${activeInks.length} active inks for field ${fieldName}`);
      
      return activeInks.map(ink => ({
        value: ink.code_number,
        label: `${ink.color} (${ink.code_number})`
      }));
    }
    
    // Handle solvent fields - match any field that starts with 'solvent_' (case insensitive)
    if (fieldStr.startsWith('solvent_')) {
      if (!lookupData.solvents || !Array.isArray(lookupData.solvents)) {
        console.log('No solvent data available');
        return [];
      }
      
      // Only show solvents that are not finished, properly handling boolean comparison
      // Make sure we're casting the is_finished property to a boolean
      const activeSolvents = lookupData.solvents.filter(solvent => solvent.is_finished !== true);
      
      console.log(`Found ${activeSolvents.length} active solvents for field ${fieldName}`);
      
      return activeSolvents.map(solvent => ({
        value: solvent.code_number,
        label: `${solvent.product} (${solvent.code_number})`
      }));
    }
    
    // Check if it's a reference field
    const field = tableFields[selectedTable].find(f => f.name === fieldName);
    if (field && field.references) {
      const referencedModel = field.references.model;
      const options = lookupData[referencedModel] || [];
      
      return options.map(option => ({
        value: option.id,
        label: option.name || option.description || option.id.toString()
      }));
    }
    
    return [];
  };

  // Value to pass down
  const value = {
    tables,
    selectedTable,
    setSelectedTable,
    loading,
    error,
    lookupData,
    refreshLookupData,
    getTableFields,
    isPrimaryKey,
    isAutoIncrement,
    getFieldType,
    isReferenceField,
    getReferencedModel,
    getFieldOptions
  };

  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};