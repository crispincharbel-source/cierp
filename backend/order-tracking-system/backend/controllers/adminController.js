// Updated adminController.js with barcode settings functions
const { User, Role, AdminSettings, sequelize } = require('../models');

/**
 * Admin controller for user management and settings
 */
const adminController = {
  /**
   * Get all users
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getAllUsers: async (req, res) => {
    try {
      const users = await User.findAll({
        include: [{ model: Role }],
        attributes: { exclude: ['password'] },
        order: [['full_name', 'ASC']]
      });

      res.status(200).json({ users });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ message: 'Server error fetching users' });
    }
  },

  /**
   * Get pending users awaiting approval
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getPendingUsers: async (req, res) => {
    try {
      const pendingUsers = await User.findAll({
        where: { is_approved: false },
        include: [{ model: Role }],
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']]
      });

      res.status(200).json({ pendingUsers });
    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({ message: 'Server error fetching pending users' });
    }
  },

  /**
   * Approve a user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  approveUser: async (req, res) => {
    try {
      const { email } = req.params;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.is_approved) {
        return res.status(400).json({ message: 'User is already approved' });
      }

      await user.update({ is_approved: true });


      res.status(200).json({ message: 'User approved successfully' });
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({ message: 'Server error approving user' });
    }
  },


  /**
   * Delete a user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  deleteUser: async (req, res) => {
    try {
      const { email } = req.params;

      // Find user
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent deleting your own account
      if (email === req.user.email) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      // Store user data for logging
      const userData = user.toJSON();

      // Delete user
      await user.destroy();

      res.status(200).json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Server error deleting user' });
    }
  },

  /**
   * Toggle user active status
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  toggleUserStatus: async (req, res) => {
    try {
      const { email } = req.params;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent deactivating your own account
      if (email === req.user.email) {
        return res.status(400).json({ message: 'Cannot deactivate your own account' });
      }

      const newStatus = !user.is_active;
      await user.update({ is_active: newStatus });


      res.status(200).json({
        message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Toggle user status error:', error);
      res.status(500).json({ message: 'Server error toggling user status' });
    }
  },

  /**
   * Change user role
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  changeUserRole: async (req, res) => {
    try {
      const { email } = req.params;
      const { id_role } = req.body;

      // Check if role exists
      const role = await Role.findByPk(id_role);
      if (!role) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent changing your own role
      if (email === req.user.email) {
        return res.status(400).json({ message: 'Cannot change your own role' });
      }

      await user.update({ id_role });

      res.status(200).json({
        message: 'User role changed successfully',
        role: role.role
      });
    } catch (error) {
      console.error('Change user role error:', error);
      res.status(500).json({ message: 'Server error changing user role' });
    }
  },

  /**
   * Get all admin settings
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getSettings: async (req, res) => {
    try {
      const settings = await AdminSettings.findAll({
        order: [['setting_key', 'ASC']]
      });

      res.status(200).json({ settings });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ message: 'Server error fetching settings' });
    }
  },

  /**
   * Get a specific setting by key
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getSetting: async (req, res) => {
    try {
      const { settingKey } = req.params;
      const setting = await AdminSettings.findOne({
        where: { setting_key: settingKey }
      });
      
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      res.status(200).json({
        data: { settings: setting }
      });
    } catch (error) {
      console.error('Get setting error:', error);
      res.status(500).json({ message: 'Server error fetching settings' });
    }
  },

  /**
   * Update admin setting
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateSetting: async (req, res) => {
    try {
      const { settingKey } = req.params;
      const { setting_value, setting_description } = req.body;

      let setting = await AdminSettings.findOne({
        where: { setting_key: settingKey }
      });

      if (setting) {
        // Update existing setting
        await setting.update({
          setting_value: setting_value,
          setting_description: setting_description || setting.setting_description,
          last_updated_by: req.user.email,
          updated_at: new Date()
        });
      } else {
        // Create new setting
        setting = await AdminSettings.create({
          setting_key: settingKey,
          setting_value: setting_value,
          setting_description: setting_description,
          last_updated_by: req.user.email,
          updated_at: new Date()
        });
      }

      res.status(200).json({
        message: 'Setting updated successfully',
        setting
      });
    } catch (error) {
      console.error('Update setting error:', error);
      res.status(500).json({ message: 'Server error updating setting' });
    }
  },

  /**
   * Get barcode settings
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getBarcodeSettings: async (req, res) => {
    try {
      console.log('Fetching barcode settings');
      
      const setting = await AdminSettings.findOne({
        where: { setting_key: 'barcode-settings' }
      });
  
      let settings = {
        format: 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 20,
        margin: 10,
        textMargin: 2
      };
      
      if (setting && setting.setting_value) {
        try {
          // Parse the stored JSON string value
          const savedSettings = JSON.parse(setting.setting_value);
          console.log('Retrieved barcode settings:', JSON.stringify(savedSettings, null, 2));
          
          // Merge default settings with saved settings
          settings = { ...settings, ...savedSettings };
        } catch (err) {
          console.error('Error parsing barcode settings:', err);
        }
      } else {
        console.log('No barcode settings found, returning defaults');
      }
  
      // Return the settings
      res.status(200).json({ settings });
    } catch (error) {
      console.error('Get barcode settings error:', error);
      res.status(500).json({ message: 'Server error fetching barcode settings' });
    }
  },

  /**
   * Update barcode settings
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateBarcodeSettings: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { settings } = req.body;
  
      if (!settings || typeof settings !== 'object') {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid barcode settings' });
      }
  
      console.log('Received barcode settings:', JSON.stringify(settings, null, 2));
  
      // Required barcode settings fields
      const requiredFields = ['format', 'width', 'height', 'displayValue', 'fontSize', 'margin', 'textMargin'];
      
      // Validate settings structure
      for (const field of requiredFields) {
        if (settings[field] === undefined) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: `Missing required barcode setting: ${field}` 
          });
        }
      }
  
      // Convert settings to a JSON string
      const settingValue = JSON.stringify(settings);
      
      try {
        // Find existing setting or create a new one
        let setting = await AdminSettings.findOne({
          where: { setting_key: 'barcode-settings' },
          transaction
        });
        
        if (setting) {
          // Update existing setting
          console.log('Updating existing barcode settings with value:', settingValue);
          await setting.update({
            setting_value: settingValue,
            setting_description: 'Barcode generator settings configuration',
            last_updated_by: req.user.email,
            updated_at: new Date()
          }, { transaction });
        } else {
          // Create new setting
          console.log('Creating new barcode settings with value:', settingValue);
          setting = await AdminSettings.create({
            setting_key: 'barcode-settings',
            setting_value: settingValue,
            setting_description: 'Barcode generator settings configuration',
            last_updated_by: req.user.email,
            updated_at: new Date()
          }, { transaction });
        }
  
        // Commit the transaction
        await transaction.commit();
        
        // Reload the setting to get the updated values
        const updatedSetting = await AdminSettings.findOne({
          where: { setting_key: 'barcode-settings' }
        });
  
        console.log('Barcode settings updated successfully');
        
        res.status(200).json({
          message: 'Barcode settings updated successfully',
          setting: updatedSetting
        });
      } catch (dbError) {
        console.error('Database operation error:', dbError);
        await transaction.rollback();
        return res.status(500).json({ message: 'Database error updating barcode settings' });
      }
    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      console.error('Update barcode settings error:', error);
      res.status(500).json({ message: 'Server error updating barcode settings' });
    }
  },

  /**
   * Get order tracking display fields configuration
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getOrderTrackingFields: async (req, res) => {
    try {
      console.log('Fetching order tracking fields configuration');
      
      // FIXED: Use consistent key with hyphen instead of underscore
      const setting = await AdminSettings.findOne({
        where: { setting_key: 'order-tracking-fields' }
      });
  
      let fieldsConfig = {};
      if (setting && setting.setting_value) {
        try {
          // Parse the stored JSON string value
          fieldsConfig = JSON.parse(setting.setting_value);
          console.log('Retrieved fields config:', JSON.stringify(fieldsConfig, null, 2));
        } catch (err) {
          console.error('Error parsing order tracking fields:', err);
          // Return an empty object if parsing fails
          fieldsConfig = {};
        }
      } else {
        console.log('No configuration found, returning empty object');
      }
  
      // Return the retrieved configuration
      res.status(200).json({ fieldsConfig });
    } catch (error) {
      console.error('Get order tracking fields error:', error);
      res.status(500).json({ message: 'Server error fetching order tracking fields' });
    }
  },

  /**
   * Update order tracking display fields configuration
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateOrderTrackingFields: async (req, res) => {
    // Create a transaction to ensure data consistency
    const transaction = await sequelize.transaction();
    
    try {
      const { fieldsConfig } = req.body;
  
      if (!fieldsConfig || typeof fieldsConfig !== 'object') {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid fields configuration' });
      }
  
      console.log('Received fieldsConfig:', JSON.stringify(fieldsConfig, null, 2));
  
      // Validate the structure of fieldsConfig
      for (const [table, fields] of Object.entries(fieldsConfig)) {
        if (!Array.isArray(fields)) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: `Invalid field list for table ${table}. Expected array, got ${typeof fields}` 
          });
        }
      }
  
      // Convert config to a proper JSON string
      const settingValue = JSON.stringify(fieldsConfig);
      
      try {
        // Find existing setting or create a new one
        let setting = await AdminSettings.findOne({
          where: { setting_key: 'order-tracking-fields' },
          transaction
        });
        
        if (setting) {
          // Update existing setting
          console.log('Updating existing setting with value:', settingValue);
          await setting.update({
            setting_value: settingValue,
            setting_description: 'Order tracking display fields configuration',
            last_updated_by: req.user.email,
            updated_at: new Date()
          }, { transaction });
        } else {
          // Create new setting
          console.log('Creating new setting with value:', settingValue);
          setting = await AdminSettings.create({
            setting_key: 'order-tracking-fields',
            setting_value: settingValue,
            setting_description: 'Order tracking display fields configuration',
            last_updated_by: req.user.email,
            updated_at: new Date()
          }, { transaction });
        }
  
        // Verify the setting was saved correctly
        const verifiedSetting = await AdminSettings.findOne({
          where: { setting_key: 'order-tracking-fields' },
          transaction
        });
  
        if (!verifiedSetting || verifiedSetting.setting_value !== settingValue) {
          console.error('Setting verification failed');
          console.log('Expected:', settingValue);
          console.log('Got:', verifiedSetting ? verifiedSetting.setting_value : 'null');
          
          await transaction.rollback();
          return res.status(500).json({ message: 'Failed to verify saved configuration' });
        }
  
        // Commit the transaction
        await transaction.commit();
        
        // Reload the setting to get the updated values
        const updatedSetting = await AdminSettings.findOne({
          where: { setting_key: 'order-tracking-fields' }
        });
  
        console.log('Order tracking fields updated successfully');
        
        // Return the setting object format to match other updateSetting API responses
        res.status(200).json({
          message: 'Order tracking fields updated successfully',
          setting: updatedSetting
        });
      } catch (dbError) {
        console.error('Database operation error:', dbError);
        await transaction.rollback();
        return res.status(500).json({ message: 'Database error updating fields configuration' });
      }
    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      console.error('Update order tracking fields error:', error);
      res.status(500).json({ message: 'Server error updating order tracking fields' });
    }
  },
};

module.exports = adminController;