const { sequelize, Cutting, Lamination, Printing, WarehouseToDispatch, 
  DispatchToProduction, Extruder, RawSlitting, PVC, Slitting, AdminSettings} = require('../models');

/**
 * Order tracking controller
 */
const orderController = {
  /**
   * Track order across all tables
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  /**
   * Track order across all tables
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  trackOrder: async (req, res) => {
    try {
      const { orderNumber } = req.params;
      
      if (!orderNumber) {
        return res.status(400).json({ message: 'Order number is required' });
      }

      // Get display fields configuration
      const fieldsConfig = await getOrderTrackingFieldsConfig();

      // Fetch data from all tables related to the order number
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
        fetchTableData(Cutting, orderNumber, fieldsConfig.Cutting),
        fetchTableData(Lamination, orderNumber, fieldsConfig.Lamination),
        fetchTableData(Printing, orderNumber, fieldsConfig.Printing),
        fetchTableData(WarehouseToDispatch, orderNumber, fieldsConfig.WarehouseToDispatch),
        fetchTableData(DispatchToProduction, orderNumber, fieldsConfig.DispatchToProduction),
        fetchTableData(Extruder, orderNumber, fieldsConfig.Extruder),
        fetchTableData(RawSlitting, orderNumber, fieldsConfig.RawSlitting),
        fetchTableData(PVC, orderNumber, fieldsConfig.PVC),
        fetchTableData(Slitting, orderNumber, fieldsConfig.Slitting)
      ]);

      // Combine all data
      const orderData = {
        orderNumber,
        cutting: cuttingData,
        lamination: laminationData,
        printing: printingData,
        warehouseToDispatch: warehouseToDispatchData,
        dispatchToProduction: dispatchToProductionData,
        extruder: extruderData,
        rawSlitting: rawSlittingData,
        pvc: pvcData,
        slitting: slittingData
      };

      res.status(200).json({ orderData });
    } catch (error) {
      console.error('Track order error:', error);
      res.status(500).json({ message: 'Server error tracking order' });
    }
  },


  /**
   * Search orders
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  searchOrders: async (req, res) => {
    try {
      const { query, limit = 20 } = req.query;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters' });
      }

      // Search for orders across all tables
      const searchQuery = `
        (SELECT DISTINCT order_number, 'cutting' as source FROM cutting WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'lamination' as source FROM lamination WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'printing' as source FROM printing WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'warehouse_to_dispatch' as source FROM warehouse_to_dispatch WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'dispatch_to_production' as source FROM dispatch_to_production WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'extruder' as source FROM extruder WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'raw_slitting' as source FROM raw_slitting WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'pvc' as source FROM pvc WHERE order_number LIKE :searchTerm LIMIT 10)
        UNION
        (SELECT DISTINCT order_number, 'slitting' as source FROM slitting WHERE order_number LIKE :searchTerm LIMIT 10)
        LIMIT :limit
      `;

      const results = await sequelize.query(searchQuery, {
        replacements: { 
          searchTerm: `%${query}%`,
          limit: parseInt(limit)
        },
        type: sequelize.QueryTypes.SELECT,
        raw: true
      });

      // Remove duplicates
      const uniqueResults = Array.from(
        new Map(results.map(item => [item.order_number, item])).values()
      );

      res.status(200).json({ results: uniqueResults });
    } catch (error) {
      console.error('Search orders error:', error);
      res.status(500).json({ message: 'Server error searching orders' });
    }
  }
};

/**
 * Helper function to fetch order data from a specific table
 * @param {Object} model - Sequelize model
 * @param {string} orderNumber - Order number to fetch
 * @param {Array} includeFields - Fields to include in response
 * @returns {Promise<Array>} - Fetched data
 */
async function fetchTableData(model, orderNumber, includeFields = []) {
  try {
    // Determine attributes to include
    const attributes = includeFields.length > 0 
      ? includeFields
      : Object.keys(model.rawAttributes);

    // Ensure order_number is always included
    if (!attributes.includes('order_number')) {
      attributes.push('order_number');
    }
    
    // Fetch data
    const data = await model.findAll({
      where: { order_number: orderNumber },
      attributes,
      raw: true
    });   

    return data;
  } catch (error) {
    console.error(`Error fetching data from ${model.name}:`, error);
    return [];
  }
}

/**
 * Helper function to get order tracking fields configuration
 * @returns {Object} - Fields configuration
 */
async function getOrderTrackingFieldsConfig() {
  try {
    const setting = await AdminSettings.findOne({
      where: { setting_key: 'order-tracking-fields' }
    })
    if (setting && setting.setting_value) {
      try {
        const config = JSON.parse(setting.setting_value);
        
        // Create a normalized mapping between model names and config keys
        const normalizedConfig = {};
        
        // Map each model to its snake_case name in the config
        normalizedConfig.Cutting = config.cutting || [];
        normalizedConfig.Lamination = config.lamination || [];
        normalizedConfig.Printing = config.printing || [];
        normalizedConfig.WarehouseToDispatch = config.warehouse_to_dispatch || [];
        normalizedConfig.DispatchToProduction = config.dispatch_to_production || [];
        normalizedConfig.Extruder = config.extruder || [];
        normalizedConfig.RawSlitting = config.raw_slitting || [];
        normalizedConfig.PVC = config.pvc || [];
        normalizedConfig.Slitting = config.slitting || [];
        
        return normalizedConfig;
      } catch (err) {
        console.error('Error parsing order tracking fields:', err);
      }
    }

    // Default configuration (include all fields)
    return {
      Cutting: [],
      Lamination: [],
      Printing: [],
      WarehouseToDispatch: [],
      DispatchToProduction: [],
      Extruder: [],
      RawSlitting: [],
      PVC: [],
      Slitting: []
    };
  } catch (error) {
    console.error('Error getting order tracking fields config:', error);
    return {};
  }
}

module.exports = orderController;