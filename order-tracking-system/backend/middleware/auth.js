const jwt = require('jsonwebtoken');
const models = require('../models');


const auth = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header
    const authHeader = req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // Check for token in query parameters (for CSV export)
    else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await models.User.findOne({ where: { email: decoded.email } });
    
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Add user data to request
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }
    
    res.status(401).json({ message: 'Invalid token, authorization denied' });
  }
};

module.exports = auth;
