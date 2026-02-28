// frontend/src/api/admin.js
import api from './axios';

/**
 * Functions to interact with the admin API endpoints
 */
export const adminAPI = {
  /**
   * Get all users
   * @returns {Promise} - Promise with users data
   */
  getAllUsers: () => {
    return api.get('/admin/users');
  },

  /**
   * Get pending users for approval
   * @returns {Promise} - Promise with pending users data
   */
  getPendingUsers: () => {
    return api.get('/admin/users/pending');
  },

  /**
   * Approve a user
   * @param {string} email - User email
   * @returns {Promise} - Promise with response
   */
  approveUser: (email) => {
    return api.put(`/admin/users/${email}/approve`);
  },

  /**
   * Toggle user active status
   * @param {string} email - User email
   * @returns {Promise} - Promise with response
   */
  toggleUserStatus: (email) => {
    return api.put(`/admin/users/${email}/toggle-status`);
  },

  /**
   * Change user role
   * @param {string} email - User email
   * @param {number} roleId - Role ID
   * @returns {Promise} - Promise with response
   */
  changeUserRole: (email, roleId) => {
    return api.put(`/admin/users/${email}/role`, { id_role: roleId });
  },

  /**
   * Delete a user
   * @param {string} email - User email
   * @returns {Promise} - Promise with response
   */
  deleteUser: (email) => {
    return api.delete(`/admin/users/${email}`);
  },

  /**
   * Get all admin settings
   * @returns {Promise} - Promise with settings data
   */
  getSettings: () => {
    return api.get('/admin/settings');
  },

  /**
   * Get a specific setting
   * @param {string} key - Setting key
   * @returns {Promise} - Promise with setting data
   */
  getSetting: (key) => {
    return api.get(`/admin/settings/${key}`);
  },

  /**
   * Update a setting
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @param {string} description - Setting description (optional)
   * @returns {Promise} - Promise with response
   */
  updateSetting: (key, value, description = null) => {
    return api.put(`/admin/settings/${key}`, { 
      setting_value: value,
      setting_description: description 
    });
  },

  /**
   * Get barcode settings
   * @returns {Promise} - Promise with barcode settings
   */
  getBarcodeSettings: () => {
    return api.get('/admin/settings/barcode');
  },

  /**
   * Update barcode settings
   * @param {Object} settings - Barcode settings object
   * @returns {Promise} - Promise with response
   */
  updateBarcodeSettings: (settings) => {
    return api.post('/admin/settings/barcode', { settings });
  },

  /**
   * Get order tracking fields configuration
   * @returns {Promise} - Promise with fields configuration
   */
  getOrderTrackingFields: () => {
    return api.get('/admin/settings/order-tracking-fields');
  },

  /**
   * Update order tracking fields configuration
   * @param {Object} fieldsConfig - Field configuration object
   * @returns {Promise} - Promise with response
   */
  updateOrderTrackingFields: (fieldsConfig) => {
    return api.put('/admin/settings/order-tracking-fields', { fieldsConfig });
  }
};

export default adminAPI;