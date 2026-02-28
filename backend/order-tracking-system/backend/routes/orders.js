const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Order tracking routes
router.get('/track/:orderNumber', orderController.trackOrder);
router.get('/search', orderController.searchOrders);

module.exports = router;