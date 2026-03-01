const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const validation = require('../utils/validation');

/**
 * User authentication controller
 */
const authController = {
  /**
   * Register a new user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  register: async (req, res) => {
    try {
      const { email, password, full_name, id_role } = req.body;

      // Validate email
      if (!validation.isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Validate password
      const passwordValidation = validation.validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Check if role exists
      const role = await Role.findByPk(id_role);
      if (!role) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        full_name,
        id_role,
        is_approved: false, // Requires admin approval
        is_active: true
      });

      res.status(201).json({
        message: 'Registration successful. Awaiting admin approval.',
        user: {
          email: user.email,
          full_name: user.full_name,
          role: role.role,
          is_approved: user.is_approved
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  },

  /**
   * Login user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
      }

      // Find user
      const user = await User.findOne({
        where: { email },
        include: [{ model: Role }]
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check if account is approved
      if (!user.is_approved) {
        return res.status(403).json({ message: 'Account not approved by admin yet' });
      }

      // Check if account is active
      if (!user.is_active) {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          email: user.email,
          role: user.id_role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );



      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          email: user.email,
          full_name: user.full_name,
          role: user.Role.role,
          id_role: user.id_role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  },

  /**
   * Get current user profile
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getProfile: async (req, res) => {
    try {
      const user = await User.findOne({
        where: { email: req.user.email },
        include: [{ model: Role }],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
        user: {
          email: user.email,
          full_name: user.full_name,
          role: user.Role.role,
          id_role: user.id_role,
          is_approved: user.is_approved,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Server error fetching profile' });
    }
  },

  /**
   * Change password
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userEmail = req.user.email;

      // Validate new password
      const passwordValidation = validation.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }

      // Find user
      const user = await User.findOne({ where: { email: userEmail } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await user.update({ password: hashedPassword });

   

      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error changing password' });
    }
  },

  /**
   * Logout user (invalidate token on client side)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  logout:  async () => {
    // Clear local storage first (immediate logout effect for user)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Then make the API call without waiting
    try {
      api.post('/auth/logout').catch(error => {
        console.error('Logout API error:', error);
        // Non-blocking error handling
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
};

module.exports = authController;