const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');

/**
 * Controller for user management operations
 */
const userController = {
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
      });

      res.status(200).json({ users });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ message: 'Server error fetching users' });
    }
  },

  /**
   * Get user by email
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getUserByEmail: async (req, res) => {
    try {
      const { email } = req.params;

      const user = await User.findOne({
        where: { email },
        include: [{ model: Role }],
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error('Get user by email error:', error);
      res.status(500).json({ message: 'Server error fetching user' });
    }
  },

  /**
   * Create a new user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createUser: async (req, res) => {
    try {
      const { email, password, full_name, id_role, is_approved = false } = req.body;

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
        is_approved,
        is_active: true,
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          email: user.email,
          full_name: user.full_name,
          role: role.role,
          is_approved: user.is_approved,
          is_active: user.is_active,
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Server error creating user' });
    }
  },

  /**
   * Update a user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateUser: async (req, res) => {
    try {
      const { email } = req.params;
      const { full_name, id_role, is_approved, is_active } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if role exists if changing role
      if (id_role && id_role !== user.id_role) {
        const role = await Role.findByPk(id_role);
        if (!role) {
          return res.status(400).json({ message: 'Invalid role' });
        }
      }

      // Store old data for logging
      const oldData = user.toJSON();

      // Update user
      await user.update({
        full_name: full_name || user.full_name,
        id_role: id_role || user.id_role,
        is_approved: is_approved !== undefined ? is_approved : user.is_approved,
        is_active: is_active !== undefined ? is_active : user.is_active,
      });

      // Refresh user data with role
      const updatedUser = await User.findOne({
        where: { email },
        include: [{ model: Role }],
        attributes: { exclude: ['password'] },
      });


      res.status(200).json({
        message: 'User updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server error updating user' });
    }
  },

  /**
   * Change user password
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  changeUserPassword: async (req, res) => {
    try {
      const { email } = req.params;
      const { password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update password
      await user.update({ password: hashedPassword });


      res.status(200).json({
        message: 'User password changed successfully'
      });
    } catch (error) {
      console.error('Change user password error:', error);
      res.status(500).json({ message: 'Server error changing user password' });
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
   * Get pending users for approval
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

      const user = await User.findOne({ 
        where: { email },
        include: [{ model: Role }]
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.is_approved) {
        return res.status(400).json({ message: 'User is already approved' });
      }

      await user.update({ is_approved: true });

      res.status(200).json({
        message: 'User approved successfully',
        user: {
          email: user.email,
          full_name: user.full_name,
          role: user.Role.role,
          is_approved: user.is_approved,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({ message: 'Server error approving user' });
    }
  }
};

module.exports = userController;
