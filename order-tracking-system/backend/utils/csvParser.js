// Modified csvParser.js to handle multiple complex fields
const Papa = require('papaparse');

/**
 * CSV parser utility functions with improved empty value handling
 */
const csvParser = {
  /**
   * Parse CSV file content to JSON
   * @param {string} csvContent - CSV file content
   * @param {Array} expectedColumns - Expected column names
   * @param {Object} tableStructure - Table structure information (optional)
   * @returns {Object} - Parsed data or error
   */
  parseCSV: (csvContent, expectedColumns, tableStructure = null) => {
    try {
      const results = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        // Properly handle null values during parsing
        transform: (value) => {
          // Return null for empty values to handle them later based on field type
          return value.trim() === '' ? null : value;
        }
      });

      if (results.errors.length > 0) {
        return {
          success: false,
          message: `Error parsing CSV: ${results.errors[0].message}`,
          errors: results.errors
        };
      }

      // Validate headers if expectedColumns provided
      if (expectedColumns) {
        const headers = results.meta.fields;
        
        // Filter out system columns that should be handled automatically
        const requiredColumns = expectedColumns.filter(col => 
          !['id', 'createdAt', 'updatedAt'].includes(col)
        );
        
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          return {
            success: false,
            message: `Missing required columns: ${missingColumns.join(', ')}`
          };
        }
      }

      // Process each record to handle empty values based on field type
      const now = new Date().toISOString();
      results.data = results.data.map(record => {
        const processedRecord = { ...record };
        
        // Set createdAt and updatedAt
        processedRecord.createdAt = record.createdAt || now;
        processedRecord.updatedAt = record.updatedAt || now;
        
        // Handle specific field types based on tableStructure if provided
        if (tableStructure) {
          Object.entries(processedRecord).forEach(([key, value]) => {
            const fieldInfo = tableStructure.find(field => field.name === key);
            if (!fieldInfo) return;
            
            // Handle complex fields (complex_1 through complex_6)
            if (key.startsWith('complex_') && (value === '0' || value === 0 || value === '')) {
              processedRecord[key] = null;
            }
            
            // Special handling for ink fields with empty or invalid values
            if (key.startsWith('ink_') && (value === '0' || value === 0 || value === '')) {
              processedRecord[key] = null;
            }
            
            // Special handling for solvent fields with empty or invalid values
            if (key.startsWith('solvent_') && (value === '0' || value === 0 || value === '')) {
              processedRecord[key] = null;
            }
            
            // Handle null or empty values based on field type
            if (value === null || value === '') {
              switch (fieldInfo.type) {
                case 'BOOLEAN':
                  // Default boolean fields to false
                  processedRecord[key] = false;
                  break;
                case 'INTEGER':
                case 'FLOAT':
                case 'DECIMAL':
                case 'DOUBLE':
                  // Replace empty numeric fields with 0 instead of null
                  processedRecord[key] = 0;
                  break;
                case 'DATE':
                case 'DATETIME':
                  // Leave date fields as null
                  processedRecord[key] = null;
                  break;
                default:
                  // For string types, set to empty string
                  processedRecord[key] = '';
              }
            } else {
              // Convert values to appropriate types
              switch (fieldInfo.type) {
                case 'BOOLEAN':
                  // Convert various boolean representations
                  processedRecord[key] = 
                    value === 'true' || value === '1' || value === 'yes' || value === 'y' || value === 'on' || 
                    value === true || value === 1;
                  break;
                case 'INTEGER':
                  processedRecord[key] = isNaN(parseInt(value)) ? 0 : parseInt(value);
                  break;
                case 'FLOAT':
                case 'DECIMAL':
                case 'DOUBLE':
                  processedRecord[key] = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
                  break;
              }
            }
          });
        }
        
        return processedRecord;
      });

      return {
        success: true,
        data: results.data,
        meta: results.meta
      };
    } catch (error) {
      return {
        success: false,
        message: `Error parsing CSV: ${error.message}`
      };
    }
  },

  /**
   * Convert JSON data to CSV format
   * @param {Array} jsonData - Data to convert
   * @returns {string} - CSV content
   */
  jsonToCSV: (jsonData) => {
    try {
      // Format data before conversion to handle nulls
      const formattedData = jsonData.map(record => {
        const formatted = {};
        
        Object.entries(record).forEach(([key, value]) => {
          // Convert null or undefined to empty string for CSV
          formatted[key] = (value === null || value === undefined) ? '' : value;
        });
        
        return formatted;
      });
      
      return Papa.unparse(formattedData);
    } catch (error) {
      throw new Error(`Error converting to CSV: ${error.message}`);
    }
  }
};

module.exports = csvParser;