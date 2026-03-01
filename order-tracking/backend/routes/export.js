const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

router.get('/table/:tableName',    auth, exportController.exportTableToCSV);
router.get('/order/:orderNumber',  auth, exportController.exportOrderToCSV);
router.get('/pdf/order/:orderNumber', auth, exportController.exportOrderToPDF);

module.exports = router;
