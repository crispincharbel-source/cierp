const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Admin routes (all require authentication and admin role)
router.use(auth, roleCheck([1])); // Admin role ID = 1

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/users/pending', adminController.getPendingUsers);
router.put('/users/:email/approve', adminController.approveUser);
router.put('/users/:email/toggle-status', adminController.toggleUserStatus);
router.put('/users/:email/role', adminController.changeUserRole);
router.delete('/users/:email', adminController.deleteUser);


// Settings routes
router.get('/settings', adminController.getSettings);
router.get('/settings/order-tracking-fields', adminController.getOrderTrackingFields);
router.put('/settings/order-tracking-fields', adminController.updateOrderTrackingFields);
// Barcode settings routes
router.get('/settings/barcode', adminController.getBarcodeSettings);
router.post('/settings/barcode', adminController.updateBarcodeSettings);

router.put('/settings/:settingKey', adminController.updateSetting);
router.get('/settings/:settingKey', adminController.getSetting);

module.exports = router;