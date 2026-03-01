/**
 * Format date to locale string
 * @param {string} dateString - Date string to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };
  
  /**
   * Format number with thousands separator
   * @param {number} number - Number to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} - Formatted number string
   */
  export const formatNumber = (number, decimals = 2) => {
    if (number === null || number === undefined) return '-';
    
    try {
      return Number(number).toLocaleString(undefined, { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } catch (error) {
      console.error('Number formatting error:', error);
      return number.toString();
    }
  };
  
  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} - Formatted currency string
   */
  export const formatCurrency = (amount, currency = 'USD') => {
    if (amount === null || amount === undefined) return '-';
    
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${amount} ${currency}`;
    }
  };
  
  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} length - Maximum length
   * @returns {string} - Truncated text
   */
  export const truncateText = (text, length = 50) => {
    if (!text) return '';
    
    if (text.length <= length) return text;
    
    return `${text.substring(0, length)}...`;
  };
  
  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted file size
   */
  export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  };
  