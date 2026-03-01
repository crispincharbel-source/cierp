/**
 * Role-based access control middleware
 * @param {Array} roles - List of allowed roles
 */
const roleCheck = (roles) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: 'Authentication required' });
        }
  
        if (!roles.includes(req.user.id_role)) {
          return res.status(403).json({ message: 'Access denied, insufficient permissions' });
        }
  
        next();
      } catch (error) {
        res.status(500).json({ message: 'Server error in role verification' });
      }
    };
  };
  
  module.exports = roleCheck;