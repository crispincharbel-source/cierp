// controllers/exportController.js
const models = require('../models');
const csvParser = require('../utils/csvParser');

/**
 * Controller for CSV export functionality
 */
const exportController = {
  /**
   * Export table data to CSV
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  exportTableToCSV: async (req, res) => {
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

      // Fetch all records
      const records = await models[tableName].findAll({
        where: whereClause,
        raw: true
      });

      // Convert to CSV
      const csv = csvParser.jsonToCSV(records);

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
   * Export specific data to CSV (orders etc.)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  exportDataToCSV: async (req, res) => {
    try {
      const { dataType } = req.params;
      const { filters, startDate, endDate } = req.query;
      
      let data = [];
      let filename = '';
      let attributes = [];

      switch (dataType) {
        
        case 'orders': {
          const { orderNumber } = req.query;
          
          if (!orderNumber) {
            return res.status(400).json({ message: 'Order number is required' });
          }

          // Fetch data from all tables related to the order number with specified attributes for each table
          const [
            cuttingData,
            laminationData,
            printingData,
            warehouseToDispatchData,
            dispatchToProductionData,
            extruderData,
            rawSlittingData,
            pvcData,
            slittingData
          ] = await Promise.all([
            models.Cutting.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.Cutting.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.Lamination.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.Lamination.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.Printing.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.Printing.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.WarehouseToDispatch.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.WarehouseToDispatch.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.DispatchToProduction.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.DispatchToProduction.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.Extruder.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.Extruder.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.RawSlitting.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.RawSlitting.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.PVC.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.PVC.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            }),
            models.Slitting.findAll({ 
              where: { order_number: orderNumber }, 
              attributes: Object.keys(models.Slitting.rawAttributes)
                .filter(attr => !['id', 'createdAt', 'updatedAt'].includes(attr)),
              raw: true 
            })
          ]);

          // Combine all data with a source column
          const allData = [
            ...cuttingData.map(item => ({ ...item, source: 'cutting' })),
            ...laminationData.map(item => ({ ...item, source: 'lamination' })),
            ...printingData.map(item => ({ ...item, source: 'printing' })),
            ...warehouseToDispatchData.map(item => ({ ...item, source: 'warehouse_to_dispatch' })),
            ...dispatchToProductionData.map(item => ({ ...item, source: 'dispatch_to_production' })),
            ...extruderData.map(item => ({ ...item, source: 'extruder' })),
            ...rawSlittingData.map(item => ({ ...item, source: 'raw_slitting' })),
            ...pvcData.map(item => ({ ...item, source: 'pvc' })),
            ...slittingData.map(item => ({ ...item, source: 'slitting' }))
          ];

          data = allData;
          filename = `order_${orderNumber}_export_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
          break;
        }
        
        default:
          return res.status(400).json({ message: `Unsupported data type: ${dataType}` });
      }

      // Generate CSV - handle empty results
      let csv;
      if (data.length === 0) {
        if (attributes.length > 0) {
          // Create a dummy record with null values to get headers
          const emptyRecord = {};
          attributes.forEach(attr => {
            emptyRecord[attr] = null;
          });
          
          // Create CSV with just headers 
          csv = csvParser.jsonToCSV([emptyRecord])
            .split('\n')
            .filter((line, index) => index === 0) // Keep only the header line
            .join('\n');
        } else {
          // For 'orders' type where attributes might not be pre-defined
          csv = 'No data found';
        }
      } else {
        // Normal case with records
        csv = csvParser.jsonToCSV(data);
      }

      // Set headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Send CSV
      res.send(csv);
    } catch (error) {
      console.error('Export data error:', error);
      res.status(500).json({ message: 'Server error exporting data' });
    }
  }
};

module.exports = exportController;