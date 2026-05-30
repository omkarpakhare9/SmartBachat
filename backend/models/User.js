const { getPool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, email, password, preferredCurrency = 'INR' }) {
    const pool = getPool();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await pool.query(`
      INSERT INTO users (name, email, password, preferred_currency)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, preferred_currency as "preferredCurrency", created_at as "createdAt"
    `, [name, email.toLowerCase(), hashedPassword, preferredCurrency]);
    
    return result.rows[0];
  }

  static async findByEmail(email) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, name, email, password, preferred_currency as "preferredCurrency", created_at as "createdAt" 
      FROM users WHERE email = $1
    `, [email.toLowerCase()]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  static async findById(id) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, name, email, password, preferred_currency as "preferredCurrency", created_at as "createdAt" 
      FROM users WHERE id = $1
    `, [id]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  static async updateName(id, name) {
    const pool = getPool();
    await pool.query(`
      UPDATE users SET name = $1 WHERE id = $2
    `, [name, id]);
    return this.findById(id);
  }

  static async updateEmail(id, email) {
    const pool = getPool();
    await pool.query(`
      UPDATE users SET email = $1 WHERE id = $2
    `, [email.toLowerCase(), id]);
    return this.findById(id);
  }

  static async updatePassword(id, newPassword) {
    const pool = getPool();
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await pool.query(`
      UPDATE users SET password = $1 WHERE id = $2
    `, [hashedPassword, id]);
  }

  static matchPassword(enteredPassword, hashedPassword) {
    return bcrypt.compareSync(enteredPassword, hashedPassword);
  }

  static async updateCurrency(id, currency) {
    const pool = getPool();
    await pool.query(`
      UPDATE users SET preferred_currency = $1 WHERE id = $2
    `, [currency, id]);
    return this.findById(id);
  }

  static async getNotificationSettings(userId) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT * FROM notification_settings WHERE user_id = $1
    `, [userId]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  static async createNotificationSettings(userId) {
    const pool = getPool();
    await pool.query(`
      INSERT INTO notification_settings (user_id)
      VALUES ($1)
    `, [userId]);
    return this.getNotificationSettings(userId);
  }

  static async updateNotificationSettings(userId, settings) {
    const pool = getPool();
    await pool.query(`
      UPDATE notification_settings 
      SET email_budget_alerts = $1, 
          email_split_reminders = $2, 
          email_recurring_reminders = $3, 
          email_receipts = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $5
    `, [
      settings.emailBudgetAlerts !== undefined ? settings.emailBudgetAlerts : 1,
      settings.emailSplitReminders !== undefined ? settings.emailSplitReminders : 1,
      settings.emailRecurringReminders !== undefined ? settings.emailRecurringReminders : 1,
      settings.emailReceipts !== undefined ? settings.emailReceipts : 1,
      userId
    ]);
    return this.getNotificationSettings(userId);
  }
}

module.exports = User;
