const { getDb, save } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static create({ name, email, password, preferredCurrency = 'INR' }) {
    const db = getDb();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, preferred_currency)
      VALUES (?, ?, ?, ?)
    `);
    stmt.bind([name, email.toLowerCase(), hashedPassword, preferredCurrency]);
    stmt.step();
    stmt.free();
    save();
    
    // Get the newly created user by email
    return this.findByEmail(email);
  }

  static findByEmail(email) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, name, email, password, preferred_currency as preferredCurrency, created_at as createdAt FROM users WHERE email = ?
    `);
    stmt.bind([email.toLowerCase()]);
    
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  static findById(id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, name, email, password, preferred_currency as preferredCurrency, created_at as createdAt FROM users WHERE id = ?
    `);
    stmt.bind([id]);
    
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  static updateName(id, name) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE users SET name = ? WHERE id = ?
    `);
    stmt.bind([name, id]);
    stmt.step();
    stmt.free();
    save();
    return this.findById(id);
  }

  static updateEmail(id, email) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE users SET email = ? WHERE id = ?
    `);
    stmt.bind([email.toLowerCase(), id]);
    stmt.step();
    stmt.free();
    save();
    return this.findById(id);
  }

  static updatePassword(id, newPassword) {
    const db = getDb();
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const stmt = db.prepare(`
      UPDATE users SET password = ? WHERE id = ?
    `);
    stmt.bind([hashedPassword, id]);
    stmt.step();
    stmt.free();
    save();
  }

  static matchPassword(enteredPassword, hashedPassword) {
    return bcrypt.compareSync(enteredPassword, hashedPassword);
  }

  static updateCurrency(id, currency) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE users SET preferred_currency = ? WHERE id = ?
    `);
    stmt.bind([currency, id]);
    stmt.step();
    stmt.free();
    save();
    return this.findById(id);
  }

  static getNotificationSettings(userId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM notification_settings WHERE user_id = ?
    `);
    stmt.bind([userId]);
    
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  static createNotificationSettings(userId) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO notification_settings (user_id)
      VALUES (?)
    `);
    stmt.bind([userId]);
    stmt.step();
    stmt.free();
    save();
    return this.getNotificationSettings(userId);
  }

  static updateNotificationSettings(userId, settings) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE notification_settings 
      SET email_budget_alerts = ?, 
          email_split_reminders = ?, 
          email_recurring_reminders = ?, 
          email_receipts = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    stmt.bind([
      settings.emailBudgetAlerts !== undefined ? settings.emailBudgetAlerts : 1,
      settings.emailSplitReminders !== undefined ? settings.emailSplitReminders : 1,
      settings.emailRecurringReminders !== undefined ? settings.emailRecurringReminders : 1,
      settings.emailReceipts !== undefined ? settings.emailReceipts : 1,
      userId
    ]);
    stmt.step();
    stmt.free();
    save();
    return this.getNotificationSettings(userId);
  }
}

module.exports = User;
