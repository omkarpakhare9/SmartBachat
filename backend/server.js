const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import recurring transaction processor
const RecurringTransaction = require('./models/RecurringTransaction');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased from 100)
  skip: (req) => {
    // Skip rate limiting for development or if headers are problematic
    return process.env.NODE_ENV !== 'production';
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000') : '*',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Initialize SQLite database and then start server
const { init } = require('./config/database');

init().then(() => {
  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'SmartBachat API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        transactions: '/api/transactions',
        categories: '/api/categories',
        reports: '/api/reports',
        splits: '/api/splits',
        currencies: '/api/currencies',
        notifications: '/api/notifications'
      }
    });
  });

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/profile', require('./routes/profile'));
  app.use('/api/transactions', require('./routes/transactions'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/budgets', require('./routes/budgets'));
  app.use('/api/currencies', require('./routes/currencies'));
  app.use('/api/recurring', require('./routes/recurring'));
  app.use('/api/receipts', require('./routes/receipts'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/splits', require('./routes/splits'));
  app.use('/api/splits/:id/participants', require('./routes/split-participants'));

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Server error'
    });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Initialize recurring transaction scheduler
    initializeScheduler();
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Simple scheduler for processing recurring transactions
// Runs every day at midnight
function initializeScheduler() {
  try {
    // Try to use node-cron if available
    try {
      const cron = require('node-cron');
      // Run every day at 00:00 (midnight)
      cron.schedule('0 0 * * *', async () => {
        console.log('Running recurring transaction processor...');
        const count = await RecurringTransaction.processRecurring();
        console.log(`Processed ${count} recurring transactions`);
      });
      console.log('Recurring transaction scheduler initialized (using node-cron)');
    } catch (e) {
      // Fallback: use setInterval to run every 24 hours
      setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
          console.log('Running recurring transaction processor...');
          const count = await RecurringTransaction.processRecurring();
          console.log(`Processed ${count} recurring transactions`);
        }
      }, 60000); // Check every minute
      console.log('Recurring transaction scheduler initialized (using fallback interval)');
    }
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
  }
}
