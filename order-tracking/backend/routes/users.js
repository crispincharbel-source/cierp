const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require authentication
router.use(auth);

// Routes accessible by both admin and operations users
router.get('/profile', userController.getUserByEmail);

// Admin-only routes
router.get('/', roleCheck([1]), userController.getAllUsers);
router.get('/pending', roleCheck([1]), userController.getPendingUsers);
router.post('/', roleCheck([1]), userController.createUser);
router.get('/:email', roleCheck([1]), userController.getUserByEmail);
router.put('/:email', roleCheck([1]), userController.updateUser);
router.put('/:email/password', roleCheck([1]), userController.changeUserPassword);
router.put('/:email/approve', roleCheck([1]), userController.approveUser);

module.exports = router;