const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

let pool;
let usingEmbeddedDatabase = false;

const shouldUseEmbeddedDatabase = () => {
  return process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;
};

const createDatabaseClient = () => {
  if (shouldUseEmbeddedDatabase()) {
    usingEmbeddedDatabase = true;
    const dataDir = process.env.PGLITE_DATA_DIR || path.join(__dirname, '..', '.pglite');
    console.log('Using embedded PGlite database at:', dataDir);
    try {
      return new PGlite(dataDir);
    } catch (error) {
      console.error('Failed to initialize PGlite:', error);
      throw new Error('Embedded database initialization failed. Please ensure the directory is writable and not locked by another process.');
    }
  }

  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/expense_tracker';

  return new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
};

// Initialize database
const initDatabase = async () => {
  pool = createDatabaseClient();

  try {
    await pool.query('SELECT NOW()');
    console.log(usingEmbeddedDatabase
      ? 'Embedded development database connected successfully'
      : 'Database connected successfully');
    await createTables();
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

const createTables = async () => {
  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      preferred_currency TEXT DEFAULT 'INR',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      user_id INTEGER NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'circle',
      is_default INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name, type)
    )
  `);

  // Transactions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      description TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_split INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Splits table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS splits (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      split_type TEXT DEFAULT 'equal' CHECK(split_type IN ('equal', 'percentage', 'custom')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'completed')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Split participants
  await pool.query(`
    CREATE TABLE IF NOT EXISTS split_participants (
      id SERIAL PRIMARY KEY,
      split_id INTEGER NOT NULL,
      user_id INTEGER,
      email TEXT,
      share REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'removed')),
      paid INTEGER DEFAULT 0,
      paid_at TIMESTAMP,
      invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP,
      FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Split invitations (for tracking pending email invitations)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS split_invitations (
      id SERIAL PRIMARY KEY,
      split_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP,
      FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES split_participants(id) ON DELETE CASCADE
    )
  `);

  // Budgets table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT DEFAULT 'monthly' CHECK(period IN ('weekly', 'monthly', 'yearly')),
      alert_threshold REAL DEFAULT 80,
      alert_enabled INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(user_id, category_id, period)
    )
  `);

  // Budget alerts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_alerts (
      id SERIAL PRIMARY KEY,
      budget_id INTEGER NOT NULL,
      spent_amount REAL NOT NULL,
      percentage REAL NOT NULL,
      alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dismissed INTEGER DEFAULT 0,
      dismissed_at TIMESTAMP,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
    )
  `);

  // Recurring transactions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
      start_date DATE NOT NULL,
      end_date DATE,
      day_of_week INTEGER,
      day_of_month INTEGER,
      is_active INTEGER DEFAULT 1,
      last_created TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Recurring transaction instances (created automatically)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recurring_instances (
      id SERIAL PRIMARY KEY,
      recurring_transaction_id INTEGER NOT NULL,
      transaction_id INTEGER NOT NULL,
      scheduled_date DATE NOT NULL,
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    )
  `);

  // Receipts/Documents
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipts (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      storage_type TEXT DEFAULT 'local' CHECK(storage_type IN ('local', 's3')),
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Notification settings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      email_budget_alerts INTEGER DEFAULT 1,
      email_split_reminders INTEGER DEFAULT 1,
      email_recurring_reminders INTEGER DEFAULT 1,
      email_receipts INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Email logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      email_type TEXT NOT NULL,
      status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'failed', 'bounced')),
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Currencies table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      exchange_rate_to_usd REAL NOT NULL,
      exchange_rate_from_usd REAL DEFAULT 1,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runMigrations();
  await seedCurrencies();

  // Create indexes for better performance
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type)`);
};

const columnExists = async (table, column) => {
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2
  `, [table, column]);
  return result.rows.length > 0;
};

const runMigrations = async () => {
  if (!(await columnExists('users', 'preferred_currency'))) {
    await pool.query(`ALTER TABLE users ADD COLUMN preferred_currency TEXT DEFAULT 'INR'`);
  }

  if (!(await columnExists('currencies', 'exchange_rate_from_usd'))) {
    await pool.query(`ALTER TABLE currencies ADD COLUMN exchange_rate_from_usd REAL DEFAULT 1`);
  }
};

const seedCurrencies = async () => {
  const currencies = [
    ['USD', 'US Dollar', '$', 1, 1],
    ['EUR', 'Euro', '€', 0.92, 1.09],
    ['GBP', 'British Pound', '£', 0.79, 1.27],
    ['INR', 'Indian Rupee', '₹', 83.2, 0.012],
    ['JPY', 'Japanese Yen', '¥', 156.5, 0.0064],
    ['CAD', 'Canadian Dollar', 'C$', 1.36, 0.74],
    ['AUD', 'Australian Dollar', 'A$', 1.51, 0.66]
  ];

  const query = `
    INSERT INTO currencies (code, name, symbol, exchange_rate_to_usd, exchange_rate_from_usd)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (code) DO NOTHING
  `;

  for (const currency of currencies) {
    await pool.query(query, currency);
  }
};

// Export database with helper methods
module.exports = {
  init: initDatabase,
  getPool: () => pool
};
