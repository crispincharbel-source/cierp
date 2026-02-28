// controllers/tableController.js
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const models = require('../models');
const csvParser = require('../utils/csvParser');
/**
 * Table controller for CRUD operations on database tables
 */
const tableController = {
  /**
   * Get table structure
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getTableStructure: async (req, res) => {
    try {
      const { tableName } = req.params;
      
      // Check if table exists in models
      if (!models[tableName]) {
        return res.status(404).json({ message: `Table '${tableName}' not found` });
      }

      // Get model attributes
      const attributes = models[tableName].rawAttributes;
      
      // Format attributes for frontend
      const structure = Object.keys(attributes).map(key => {
        const attr = attributes[key];
        return {
          name: key,
          type: attr.type.key,
          allowNull: !!attr.allowNull,
          primaryKey: !!attr.primaryKey,
          autoIncrement: !!attr.autoIncrement,
          defaultValue: attr.defaultValue,
          references: attr.references ? {
            model: attr.references.model,
            key: attr.references.key
          } : null
        };
      });

      res.status(200).json({ structure });
    } catch (error) {
      console.error('Get table structure error:', error);
      res.status(500).json({ message: 'Server error fetching table structure' });
    }
  },

  /**
   * Get all records from a table with pagination and filtering
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getRecords: async (req, res) => {
    try {
      const { tableName } = req.params;
      const { page = 1, limit = 10, sortField, sortOrder, search, filters } = req.query;
      
      // Check if table exists in models
      if (!models[tableName]) {
        return res.status(404).json({ message: `Table '${tableName}' not found` });
      }

      // Build where clause for search and filters
      let whereClause = {};
      
      // Parse filters if provided
      if (filters) {
        try {
          const parsedFilters = JSON.parse(filters);
          Object.keys(parsedFilters).forEach(key => {
            if (parsedFilters[key] !== null && parsedFilters[key] !== '') {
              whereClause[key] = parsedFilters[key];
            }
          });
        } catch (error) {
          console.error('Parse filters error:', error);
        }
      }

      // Add search functionality across all string fields
      if (search) {
        const searchableFields = Object.keys(models[tableName].rawAttributes).filter(
          key => {
            const type = models[tableName].rawAttributes[key].type.key;
            return ['STRING', 'TEXT'].includes(type);
          }
        );

        if (searchableFields.length > 0) {
          const searchConditions = searchableFields.map(field => ({
            [field]: { [Op.like]: `%${search}%` }
          }));

          whereClause = {
            ...whereClause,
            [Op.or]: searchConditions
          };
        }
      }

      // Set up order
      let order = [];
      if (sortField && sortOrder) {
        order = [[sortField, sortOrder]];
      } else {
        // Default ordering
        const primaryKey = Object.keys(models[tableName].rawAttributes).find(
          key => models[tableName].rawAttributes[key].primaryKey
        );
        if (primaryKey) {
          order = [[primaryKey, 'DESC']];
        }
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Fetch data with pagination
      const { count, rows: records } = await models[tableName].findAndCountAll({
        where: whereClause,
        order,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Calculate total pages
      const totalPages = Math.ceil(count / parseInt(limit));

      res.status(200).json({
        records,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Get records error:', error);
      res.status(500).json({ message: 'Server error fetching records' });
    }
  },

  /**
   * Get a single record from a table
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getRecord: async (req, res) => {
    try {
      const { tableName } = req.params;
      const id = req.params[0];
      
      // Check if table exists in models
      if (!models[tableName]) {
        return res.status(404).json({ message: `Table '${tableName}' not found` });
      }

      // Find primary key field
      const primaryKey = Object.keys(models[tableName].rawAttributes).find(
        key => models[tableName].rawAttributes[key].primaryKey
      );

      if (!primaryKey) {
        return res.status(400).json({ message: 'Table does not have a primary key' });
      }

      // Find record
      const record = await models[tableName].findOne({
        where: { [primaryKey]: id }
      });

      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }

      res.status(200).json({ record });
    } catch (error) {
      console.error('Get record error:', error);
      res.status(500).json({ message: 'Server error fetching record' });
    }
  },

  /**
   * Create a new record in a table
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createRecord: async (req, res) => {
    try {
      const { tableName } = req.params;
      const recordData = req.body;
      
      // Check if table exists in models
      if (!models[tableName]) {
        return res.status(404).json({ message: `Table '${tableName}' not found` });
      }

      // Create record
      const record = await models[tableName].create(recordData);

      res.status(201).json({
        message: 'Record created successfully',
        record
      });
    } catch (error) {
      console.error('Create record error:', error);
      
      // Handle validation errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors.map(e => ({ field: e.path, message: e.message }))
        });
      }
      
      // Handle duplicate key errors
      if (
        error.name === 'SequelizeUniqueConstraintError' || 
        (error.original && error.original.code === 'ER_DUP_ENTRY')
      ) {
        // Get the duplicate value from the error
        let duplicateValue = '';
        if (error.original && error.original.sqlMessage) {
          const match = error.original.sqlMessage.match(/Duplicate entry '([^']+)'/);
          if (match) {
            duplicateValue = match[1];
          }
        }

        // Identify which field caused the error
        const field = error.fields ? Object.keys(error.fields)[0] : 'code_number';
        
        return res.status(409).json({
          message: `${duplicateValue} is already used choose a diffrent value`,
          errorType: 'DUPLICATE_KEY',
          field,
          value: duplicateValue,
          errors: [{ field, message: `This ${field} is already in use` }]
        });
      }
      
      res.status(500).json({ message: 'Server error creating record' });
    }
  },

  /**
   * Update an existing record in a table
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateRecord: async (req, res) => {
    try {
      const { tableName } = req.params;
      const id = req.params[0];
      const updateData = req.body;
      
      // Check if table exists in models
      if (!models[tableName]) {
        return res.status(404).json({ message: `Table '${tableName}' not found` });
      }

      // Find primary key field
      const primaryKey = Object.keys(models[tableName].rawAttributes).find(
        key => models[tableName].rawAttributes[key].primaryKey
      );

      if (!primaryKey) {
        return res.status(400).json({ message: 'Table does not have a primary key' });
      }

      // Find record
      const record = await models[tableName].findOne({
        where: { [primaryKey]: id }
      });

      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }

      // Store old data for logging
      const oldData = record.toJSON();

      // Update record
      await record.update(updateData);


      res.status(200).json({
        message: 'Record updated successfully',
        record: record.toJSON()
      });
    } catch (error) {
      console.error('Update record error:', error);
      
      // Handle validation errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors.map(e => ({ field: e.path, message: e.message }))
        });
      }
      
      // Handle duplicate key errors
      if (
        error.name === 'SequelizeUniqueConstraintError' || 
        (error.original && error.original.code === 'ER_DUP_ENTRY')
      ) {
        // Get the duplicate value from the error
        let duplicateValue = '';
        if (error.original && error.original.sqlMessage) {
          const match = error.original.sqlMessage.match(/Duplicate entry '([^']+)'/);
          if (match) {
            duplicateValue = match[1];
          }
        }

        // Identify which field caused the error
        const field = error.fields ? Object.keys(error.fields)[0] : 'code_number';
        
        return res.status(409).json({
          message: `Duplicate ${field} value: ${duplicateValue}`,
          errorType: 'DUPLICATE_KEY',
          field,
          value: duplicateValue,
          errors: [{ field, message: `This ${field} is already in use` }]
        });
      }
      
      res.status(500).json({ message: 'Server error updating record' });
    }
  },

  /**
   * Delete a record from a table
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  deleteRecord: async (req, res) => {
    try {
      const { tableName } = req.params;
      const id = req.params[0];
      
      // Check if table exists in models
      if (!models[tableName]) {
        return res.status(404).json({ message: `Table '${tableName}' not found` });
      }

      // Find primary key field
      const primaryKey = Object.keys(models[tableName].rawAttributes).find(
        key => models[tableName].rawAttributes[key].primaryKey
      );

      if (!primaryKey) {
        return res.status(400).json({ message: 'Table does not have a primary key' });
      }

      // Find record
      const record = await models[tableName].findOne({
        where: { [primaryKey]: id }
      });

      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }

      // Store old data for logging
      const oldData = record.toJSON();

      // Delete record
      await record.destroy();

      res.status(200).json({
        message: 'Record deleted successfully'
      });
    } catch (error) {
      console.error('Delete record error:', error);
      res.status(500).json({ message: 'Server error deleting record' });
    }
  },

  /**
   * Import records from CSV file with improved handling for complex fields
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  importCSV: async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Check if table exists in models
    if (!models[tableName]) {
      return res.status(404).json({ message: `Table '${tableName}' not found` });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read file
    const csvContent = fs.readFileSync(req.file.path, 'utf8');
    
    // Get table structure for better type handling
    const tableStructure = Object.keys(models[tableName].rawAttributes).map(key => {
      const attr = models[tableName].rawAttributes[key];
      return {
        name: key,
        type: attr.type.key,
        allowNull: !!attr.allowNull,
        primaryKey: !!attr.primaryKey,
        autoIncrement: !!attr.autoIncrement,
        defaultValue: attr.defaultValue
      };
    });
    
    // Get expected columns from model
    const expectedColumns = Object.keys(models[tableName].rawAttributes).filter(
      key => !models[tableName].rawAttributes[key].autoIncrement
    );

    // Parse CSV with table structure for type-aware handling
    const parseResult = csvParser.parseCSV(csvContent, expectedColumns, tableStructure);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Error parsing CSV',
        details: parseResult.message
      });
    }

    // Check if CSV has data
    if (parseResult.data.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty' });
    }

    // Additional preprocessing for specific tables
    if (tableName === 'Printing' || tableName === 'Lamination' || tableName === 'RawSlitting') {
      parseResult.data = parseResult.data.map(record => {
        // Process all complex fields (complex_1 through complex_6)
        for (let i = 1; i <= 6; i++) {
          const complexField = `complex_${i}`;
          
          // If complex field is a number (like "1", "2", etc.), try to convert it to a description
          if (record[complexField] !== null && record[complexField] !== '' && !isNaN(parseInt(record[complexField]))) {
            const complexId = parseInt(record[complexField]);
            // Look up the complex description using the ID
            try {
              // Only convert if it's a valid integer (not a description already)
              models.Complex.findByPk(complexId)
                .then(complexData => {
                  if (complexData) {
                    // If a complex with this ID exists, use its description
                    record[complexField] = complexData.desc;
                  }
                })
                .catch(err => {
                  console.error(`Error looking up complex ID ${complexId} for ${complexField}:`, err);
                });
            } catch (err) {
              console.error(`Error trying to convert complex ID to description for ${complexField}:`, err);
            }
          }
        }
        
        // For Printing table, also handle ink and solvent fields
        if (tableName === 'Printing') {
          // Handle ink fields - convert empty, 0 or invalid values to null
          for (let i = 1; i <= 8; i++) {
            const inkField = `ink_${i}`;
            if (record[inkField] === 0 || record[inkField] === '0' || record[inkField] === '') {
              record[inkField] = null;
            }
          }
          
          // Handle solvent fields - convert empty, 0 or invalid values to null
          for (let i = 1; i <= 3; i++) {
            const solventField = `solvent_${i}`;
            if (record[solventField] === 0 || record[solventField] === '0' || record[solventField] === '') {
              record[solventField] = null;
            }
          }
        }
        
        return record;
      });
    }
    
    // Import records in a transaction
    const result = await models.sequelize.transaction(async (t) => {
      const importedRecords = [];
      const errors = [];

      for (let i = 0; i < parseResult.data.length; i++) {
        try {
          // Create record with appropriate field types
          const record = await models[tableName].create(parseResult.data[i], { transaction: t });
          importedRecords.push(record);
        } catch (error) {
          let errorMessage = error.message;
          let errorField = null;
          
          // Handle duplicate key errors
          if (
            error.name === 'SequelizeUniqueConstraintError' || 
            (error.original && error.original.code === 'ER_DUP_ENTRY')
          ) {
            // Get the duplicate value from the error
            let duplicateValue = '';
            if (error.original && error.original.sqlMessage) {
              const match = error.original.sqlMessage.match(/Duplicate entry '([^']+)'/);
              if (match) {
                duplicateValue = match[1];
              }
            }
  
            // Identify which field caused the error
            errorField = error.fields ? Object.keys(error.fields)[0] : 'code_number';
            errorMessage = `Duplicate ${errorField} value: ${duplicateValue}`;
          } 
          // Handle validation errors
          else if (error.name === 'SequelizeValidationError') {
            errorField = error.errors[0]?.path;
            errorMessage = error.errors[0]?.message || 'Validation error';
          }
          // Handle foreign key constraint errors
          else if (error.original && error.original.code === 'ER_NO_REFERENCED_ROW_2') {
            const match = error.original.sqlMessage.match(/FOREIGN KEY \(`([^`]+)`\)/);
            if (match) {
              errorField = match[1];
              errorMessage = `Foreign key constraint failed for ${errorField}: ${parseResult.data[i][errorField]}`;
            }
          }
          
          errors.push({
            row: i + 2, // +2 because index starts at 0 and we skip header row
            field: errorField,
            message: errorMessage,
            data: parseResult.data[i] // Include the problematic data for debugging
          });
        }
      }

      return { importedRecords, errors };
    });

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: `${result.importedRecords.length} records imported successfully`,
      totalRows: parseResult.data.length,
      importedRows: result.importedRecords.length,
      errors: result.errors
    });
  } catch (error) {
    console.error('Import CSV error:', error);
    
    // Clean up temporary file if exists
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message: 'Server error importing CSV' });
  }
},

  /**
   * Export records to CSV file
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  exportCSV: async (req, res) => {
    try {
      const { tableName } = req.params;
      const { filters } = req.query;
      
      // Check if table exists in models
      if (!models[tableName]) {
        return res.status(404).json({ message: `Table '${tableName}' not found` });
      }

      // Build where clause for filters
      let whereClause = {};
      
      // Parse filters if provided
      if (filters) {
        try {
          const parsedFilters = JSON.parse(filters);
          Object.keys(parsedFilters).forEach(key => {
            if (parsedFilters[key] !== null && parsedFilters[key] !== '') {
              whereClause[key] = parsedFilters[key];
            }
          });
        } catch (error) {
          console.error('Parse filters error:', error);
        }
      }

      // Get model attributes to exclude system fields
      const attributes = Object.keys(models[tableName].rawAttributes)
        .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr));

      // Fetch all records with specified attributes
      const records = await models[tableName].findAll({
        where: whereClause,
        attributes,
        raw: true
      });

      // Generate CSV - ensure headers are included even if no records
      let csv;
      if (records.length === 0) {
        // Create a dummy record with null values to get headers
        const emptyRecord = {};
        attributes.forEach(attr => {
          emptyRecord[attr] = null;
        });
        
        // Create CSV with just headers by using Papa.unparse with empty values
        csv = csvParser.jsonToCSV([emptyRecord])
          .split('\n')
          .filter((line, index) => index === 0) // Keep only the header line
          .join('\n');
      } else {
        // Normal case with records
        csv = csvParser.jsonToCSV(records);
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${tableName}_export_${timestamp}.csv`;

      // Set headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Send CSV
      res.send(csv);
    } catch (error) {
      console.error('Export CSV error:', error);
      res.status(500).json({ message: 'Server error exporting CSV' });
    }
  },

  /**
   * Get lookup tables data (ink, solvent, complex)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getLookupData: async (req, res) => {
    try {
      // Fetch ink data
      const inks = await models.Ink.findAll({
        where: { is_finished: false },
        attributes: ['code_number', 'color', 'supplier'],
        order: [['color', 'ASC']]
      });

      // Fetch solvent data
      const solvents = await models.Solvent.findAll({
        where: { is_finished: false },
        attributes: ['code_number', 'product', 'supplier'],
        order: [['product', 'ASC']]
      });

      // Fetch complex data
      const complexes = await models.Complex.findAll({
        attributes: ['id', 'desc'],
        order: [['desc', 'ASC']]
      });

      res.status(200).json({
        inks,
        solvents,
        complexes
      });
    } catch (error) {
      console.error('Get lookup data error:', error);
      res.status(500).json({ message: 'Server error fetching lookup data' });
    }
  },

  /**
   * Get available tables list
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getTables: async (req, res) => {
    try {
      // Exclude system tables
      const excludedTables = ['User', 'Role', 'AdminSettings', 'sequelize'];
      
      // For operation users (role id 2), also exclude ink, solvent, and complex tables
      if (req.user && req.user.id_role === 2) {
        excludedTables.push('Ink', 'Solvent', 'Complex');
      }
      
      // Get tables from models
      const tables = Object.keys(models)
        .filter(tableName => !excludedTables.includes(tableName))
        .map(tableName => ({
          name: tableName,
          displayName: tableName.replace(/([A-Z])/g, ' $1').trim()
        }));

      res.status(200).json({ tables });
    } catch (error) {
      console.error('Get tables error:', error);
      res.status(500).json({ message: 'Server error fetching tables' });
    }
  }
};

module.exports = tableController;