require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const tablesRoutes = require('./routes/tables');
const orderRoutes = require('./routes/orders');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5050;

// Allow requests from both localhost and tracing.local
const corsOptions = {
  origin: [
    'http://tracing.local', 
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};


// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Test database connection
// testConnection();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/orders', orderRoutes);

// Error handling middleware
app.use(errorHandler);


app.get('/api/health', async (req, res) => {
  const dbHealthy = await testConnection();
  if (dbHealthy) {
    return res.status(200).json({ status: 'ok', message: 'Service is healthy' });
  } else {
    return res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});