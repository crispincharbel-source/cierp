//backend/routes/tables.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const tableController = require('../controllers/tableController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// All routes require authentication
router.use(auth);

// Routes for all users (admin and operations)
router.get('/list', tableController.getTables);
router.get('/lookup-data', tableController.getLookupData);

// Routes with specific table parameter
router.get('/:tableName/structure', tableController.getTableStructure);
router.get('/:tableName/records', tableController.getRecords);
router.get('/:tableName/records/*', tableController.getRecord);
router.post('/:tableName/records', roleCheck([1, 2]), tableController.createRecord); // Admin and operations roles
router.put('/:tableName/records/*', roleCheck([1, 2]), tableController.updateRecord);
router.delete('/:tableName/records/*', roleCheck([1, 2]), tableController.deleteRecord);
router.post('/:tableName/import-csv', roleCheck([1, 2]), upload.single('csvFile'), tableController.importCSV);
router.get('/:tableName/export-csv', tableController.exportCSV);

module.exports = router;
