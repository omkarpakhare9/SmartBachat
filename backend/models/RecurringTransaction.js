const { getDb, save } = require('../config/database');
const Transaction = require('./Transaction');

class RecurringTransaction {
  static create({ user_id, category_id, type, amount, description, frequency, start_date, end_date, day_of_week, day_of_month }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO recurring_transactions 
      (user_id, category_id, type, amount, description, frequency, start_date, end_date, day_of_week, day_of_month)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([user_id, category_id, type, amount, description, frequency, start_date, end_date, day_of_week, day_of_month]);
    stmt.step();
    stmt.free();
    save();

    // Get the newly created recurring transaction
    const queryStmt = db.prepare(`
      SELECT id FROM recurring_transactions
      WHERE user_id = ? AND category_id = ? AND start_date = ?
      ORDER BY id DESC LIMIT 1
    `);
    queryStmt.bind([user_id, category_id, start_date]);

    let recurringId = null;
    if (queryStmt.step()) {
      const row = queryStmt.getAsObject();
      recurringId = row.id;
    }
    queryStmt.free();

    return recurringId ? this.findById(recurringId) : null;
  }

  static findById(id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT rt.*, c.name as category_name, c.color, c.icon
      FROM recurring_transactions rt
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.id = ?
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

  static findByUser(user_id, isActive = null) {
    const db = getDb();
    let query = `
      SELECT rt.*, c.name as category_name, c.color, c.icon
      FROM recurring_transactions rt
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.user_id = ?
    `;

    if (isActive !== null) {
      query += ` AND rt.is_active = ?`;
    }

    query += ` ORDER BY rt.created_at DESC`;

    const stmt = db.prepare(query);
    if (isActive !== null) {
      stmt.bind([user_id, isActive]);
    } else {
      stmt.bind([user_id]);
    }

    const recurringTransactions = [];
    while (stmt.step()) {
      recurringTransactions.push(stmt.getAsObject());
    }
    stmt.free();

    return recurringTransactions;
  }

  static update(id, { amount, description, end_date, is_active, day_of_week, day_of_month }) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE recurring_transactions
      SET amount = COALESCE(?, amount),
          description = COALESCE(?, description),
          end_date = COALESCE(?, end_date),
          is_active = COALESCE(?, is_active),
          day_of_week = COALESCE(?, day_of_week),
          day_of_month = COALESCE(?, day_of_month),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.bind([amount || null, description || null, end_date || null, is_active !== undefined ? is_active : null, day_of_week || null, day_of_month || null, id]);
    stmt.step();
    stmt.free();
    save();

    return this.findById(id);
  }

  static delete(id) {
    const db = getDb();
    
    // Delete recurring instances first
    const deleteInstancesStmt = db.prepare(`
      DELETE FROM recurring_instances
      WHERE recurring_transaction_id = ?
    `);
    deleteInstancesStmt.bind([id]);
    deleteInstancesStmt.step();
    deleteInstancesStmt.free();

    // Delete recurring transaction
    const stmt = db.prepare(`
      DELETE FROM recurring_transactions WHERE id = ?
    `);
    stmt.bind([id]);
    stmt.step();
    stmt.free();
    save();
  }

  static processRecurring() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Get all active recurring transactions that should run today
    const stmt = db.prepare(`
      SELECT rt.*, c.id as category_id
      FROM recurring_transactions rt
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.is_active = 1
        AND rt.start_date <= ?
        AND (rt.end_date IS NULL OR rt.end_date >= ?)
    `);
    stmt.bind([today, today]);

    const toProcess = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (this.shouldRunToday(row, today)) {
        toProcess.push(row);
      }
    }
    stmt.free();

    // Create transactions for each
    toProcess.forEach(recurring => {
      this.createTransactionInstance(recurring, today);
    });

    return toProcess.length;
  }

  static shouldRunToday(recurring, today) {
    const today_date = new Date(today);
    const dayOfWeek = today_date.getDay();
    const dayOfMonth = today_date.getDate();

    switch (recurring.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return dayOfWeek === recurring.day_of_week;
      case 'biweekly':
        // Check if it's the right day of week and within the biweekly cycle
        if (dayOfWeek !== recurring.day_of_week) return false;
        const start = new Date(recurring.start_date);
        const days = Math.floor((today_date - start) / (1000 * 60 * 60 * 24));
        return days % 14 === 0;
      case 'monthly':
        return dayOfMonth === recurring.day_of_month;
      case 'quarterly':
        const month = today_date.getMonth();
        return month % 3 === (new Date(recurring.start_date).getMonth() % 3) && 
               dayOfMonth === recurring.day_of_month;
      case 'yearly':
        const start_month = new Date(recurring.start_date).getMonth();
        const start_day = new Date(recurring.start_date).getDate();
        return today_date.getMonth() === start_month && today_date.getDate() === start_day;
      default:
        return false;
    }
  }

  static createTransactionInstance(recurring, date) {
    try {
      // Create transaction
      const transaction = Transaction.create({
        user_id: recurring.user_id,
        type: recurring.type,
        category_id: recurring.category_id,
        amount: recurring.amount,
        description: recurring.description,
        date: new Date(date).toISOString()
      });

      if (transaction) {
        // Record the instance
        const db = getDb();
        const stmt = db.prepare(`
          INSERT INTO recurring_instances 
          (recurring_transaction_id, transaction_id, scheduled_date)
          VALUES (?, ?, ?)
        `);
        stmt.bind([recurring.id, transaction.id, date]);
        stmt.step();
        stmt.free();

        // Update last_created
        const updateStmt = db.prepare(`
          UPDATE recurring_transactions
          SET last_created = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.bind([recurring.id]);
        updateStmt.step();
        updateStmt.free();

        const { save } = require('../config/database');
        save();

        return transaction;
      }
    } catch (error) {
      console.error('Error creating recurring transaction instance:', error);
    }
    return null;
  }

  static getInstances(recurring_id, limit = 12) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT ri.*, t.amount, t.description, t.date, t.type
      FROM recurring_instances ri
      JOIN transactions t ON ri.transaction_id = t.id
      WHERE ri.recurring_transaction_id = ?
      ORDER BY ri.scheduled_date DESC
      LIMIT ?
    `);
    stmt.bind([recurring_id, limit]);

    const instances = [];
    while (stmt.step()) {
      instances.push(stmt.getAsObject());
    }
    stmt.free();

    return instances;
  }
}

module.exports = RecurringTransaction;
