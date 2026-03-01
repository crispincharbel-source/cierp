/**
 * Validation utility functions
 */
const validation = {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - Is email valid
     */
    isValidEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
  
    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} - Validation result and message
     */
    validatePassword: (password) => {
      if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
      }
  
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
      if (!(hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar)) {
        return {
          valid: false,
          message: 'Password must include uppercase, lowercase, number, and special character'
        };
      }
  
      return { valid: true, message: 'Password is strong' };
    },
  
    /**
     * Validate CSV header against expected columns
     * @param {Array} headers - CSV headers
     * @param {Array} expectedColumns - Expected column names
     * @returns {Object} - Validation result and message
     */
    validateCSVHeaders: (headers, expectedColumns) => {
      const missingColumns = expectedColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        return {
          valid: false,
          message: `Missing required columns: ${missingColumns.join(', ')}`
        };
      }
  
      return { valid: true, message: 'CSV headers are valid' };
    }
  };
  
  module.exports = validation;