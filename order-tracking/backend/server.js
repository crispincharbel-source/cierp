require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const authRoutes   = require('./routes/auth');
const userRoutes   = require('./routes/users');
const adminRoutes  = require('./routes/admin');
const tablesRoutes = require('./routes/tables');
const orderRoutes  = require('./routes/orders');
const exportRoutes = require('./routes/export');

const app  = express();
const PORT = process.env.PORT || 5050;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/api/auth',   authRoutes);
app.use('/api/users',  userRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/export', exportRoutes);

// Health
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.status(dbOk ? 200 : 500).json({
    status: dbOk ? 'ok' : 'error',
    service: 'CI ERP Order Tracking',
    version: '2.0.0',
    db: dbOk ? 'connected' : 'failed',
  });
});

app.use(errorHandler);

app.listen(PORT, () => console.log(`Order Tracking API running on port ${PORT}`));
