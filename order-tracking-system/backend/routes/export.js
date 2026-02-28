// routes/export.js
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Export routes
router.get('/table/:tableName', exportController.exportTableToCSV);
router.get('/data/:dataType', exportController.exportDataToCSV);

module.exports = router;