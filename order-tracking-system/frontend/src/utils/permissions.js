/**
 * Check if user has permission for an action
 * @param {Object} user - User object
 * @param {string} action - Action to check permission for
 * @returns {boolean} - Has permission
 */
export const hasPermission = (user, action) => {
  if (!user) return false;
  
  // Admin has all permissions
  if (user.id_role === 1) return true;
  
  // Operations role permissions
  if (user.id_role === 2) {
    const operationsPermissions = [
      'view_tables',
      'edit_tables',
      'view_orders',
      'track_orders',
      'print_barcode',
      'import_export',
    ];
    
    return operationsPermissions.includes(action);
  }
  
  return false;
};

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean} - Is admin
 */
export const isAdmin = (user) => {
  return user && user.id_role === 1;
};

/**
 * Check if user has access to a specific route
 * @param {Object} user - User object
 * @param {string} route - Route path
 * @returns {boolean} - Has access
 */
export const hasRouteAccess = (user, route) => {
  if (!user) return false;
  
  // Admin has access to all routes
  if (isAdmin(user)) return true;
  
  // Operations user route access
  if (user.id_role === 2) {
    const allowedRoutes = [
      '/',
      '/tables',
      '/order-tracking',
      '/barcode-generator',
      '/import-export',
      '/profile',
    ];
    
    return allowedRoutes.includes(route) || 
           allowedRoutes.some(r => route.startsWith(r + '/'));
  }
  
  return false;
};