const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db;
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, '../expense-tracker.db');

// Initialize database
const initDatabase = async () => {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables(db);
  saveDatabase();

  console.log('Database initialized successfully');
  return db;
};

const createTables = (database) => {
  // Users table
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      preferred_currency TEXT DEFAULT 'INR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      user_id INTEGER NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'circle',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name, type)
    )
  `);

  // Transactions table
  database.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      description TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_split INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Splits table
  database.run(`
    CREATE TABLE IF NOT EXISTS splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      split_type TEXT DEFAULT 'equal' CHECK(split_type IN ('equal', 'percentage', 'custom')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'completed')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Split participants
  database.run(`
    CREATE TABLE IF NOT EXISTS split_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      split_id INTEGER NOT NULL,
      user_id INTEGER,
      email TEXT,
      share REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'removed')),
      paid INTEGER DEFAULT 0,
      paid_at DATETIME,
      invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accepted_at DATETIME,
      FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Split invitations (for tracking pending email invitations)
  database.run(`
    CREATE TABLE IF NOT EXISTS split_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      split_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES split_participants(id) ON DELETE CASCADE
    )
  `);

  // Budgets table
  database.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT DEFAULT 'monthly' CHECK(period IN ('weekly', 'monthly', 'yearly')),
      alert_threshold REAL DEFAULT 80,
      alert_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(user_id, category_id, period)
    )
  `);

  // Budget alerts table
  database.run(`
    CREATE TABLE IF NOT EXISTS budget_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id INTEGER NOT NULL,
      spent_amount REAL NOT NULL,
      percentage REAL NOT NULL,
      alert_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      dismissed INTEGER DEFAULT 0,
      dismissed_at DATETIME,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
    )
  `);

  // Recurring transactions
  database.run(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      last_created DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Recurring transaction instances (created automatically)
  database.run(`
    CREATE TABLE IF NOT EXISTS recurring_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_transaction_id INTEGER NOT NULL,
      transaction_id INTEGER NOT NULL,
      scheduled_date DATE NOT NULL,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    )
  `);

  // Receipts/Documents
  database.run(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      storage_type TEXT DEFAULT 'local' CHECK(storage_type IN ('local', 's3')),
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Notification settings
  database.run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      email_budget_alerts INTEGER DEFAULT 1,
      email_split_reminders INTEGER DEFAULT 1,
      email_recurring_reminders INTEGER DEFAULT 1,
      email_receipts INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Email logs
  database.run(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      email_type TEXT NOT NULL,
      status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'failed', 'bounced')),
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Currencies table
  database.run(`
    CREATE TABLE IF NOT EXISTS currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      exchange_rate_to_usd REAL NOT NULL,
      exchange_rate_from_usd REAL DEFAULT 1,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  runMigrations(database);
  seedCurrencies(database);

  // Create indexes for better performance
  database.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type)`);
};

const columnExists = (database, table, column) => {
  const stmt = database.prepare(`PRAGMA table_info(${table})`);
  let exists = false;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.name === column) {
      exists = true;
      break;
    }
  }
  stmt.free();
  return exists;
};

const runMigrations = (database) => {
  if (!columnExists(database, 'users', 'preferred_currency')) {
    database.run(`ALTER TABLE users ADD COLUMN preferred_currency TEXT DEFAULT 'INR'`);
  }

  if (!columnExists(database, 'currencies', 'exchange_rate_from_usd')) {
    database.run(`ALTER TABLE currencies ADD COLUMN exchange_rate_from_usd REAL DEFAULT 1`);
  }
};

const seedCurrencies = (database) => {
  const currencies = [
    ['USD', 'US Dollar', '$', 1, 1],
    ['EUR', 'Euro', '€', 0.92, 1.09],
    ['GBP', 'British Pound', '£', 0.79, 1.27],
    ['INR', 'Indian Rupee', '₹', 83.2, 0.012],
    ['JPY', 'Japanese Yen', '¥', 156.5, 0.0064],
    ['CAD', 'Canadian Dollar', 'C$', 1.36, 0.74],
    ['AUD', 'Australian Dollar', 'A$', 1.51, 0.66]
  ];

  const stmt = database.prepare(`
    INSERT OR IGNORE INTO currencies (code, name, symbol, exchange_rate_to_usd, exchange_rate_from_usd)
    VALUES (?, ?, ?, ?, ?)
  `);

  currencies.forEach((currency) => {
    stmt.bind(currency);
    stmt.step();
    stmt.reset();
  });
  stmt.free();
};

// Save database to file
const saveDatabase = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

// Export database with helper methods
module.exports = {
  init: initDatabase,
  getDb: () => db,
  save: saveDatabase
};
