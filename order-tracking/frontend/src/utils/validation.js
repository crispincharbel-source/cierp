/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid email
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result
   */
  export const validatePassword = (password) => {
    if (!password || password.length < 8) {
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
  };
  
  /**
   * Validate required fields
   * @param {Object} data - Data to validate
   * @param {Array} requiredFields - Required field names
   * @returns {Object} - Validation result
   */
  export const validateRequired = (data, requiredFields) => {
    const missingFields = requiredFields.filter(field => 
      !data[field] && data[field] !== 0 && data[field] !== false
    );
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        message: `Required fields missing: ${missingFields.join(', ')}`
      };
    }
    
    return { valid: true };
  };
  
  /**
   * Validate number field
   * @param {string|number} value - Value to validate
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  export const validateNumber = (value, options = {}) => {
    const { min, max, integer } = options;
    
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
      return { valid: false, message: 'Must be a valid number' };
    }
    
    if (integer && !Number.isInteger(num)) {
      return { valid: false, message: 'Must be an integer' };
    }
    
    if (min !== undefined && num < min) {
      return { valid: false, message: `Must be at least ${min}` };
    }
    
    if (max !== undefined && num > max) {
      return { valid: false, message: `Must be at most ${max}` };
    }
    
    return { valid: true };
  };