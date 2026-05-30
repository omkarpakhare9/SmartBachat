const { getDb, save } = require('../config/database');
const Currency = require('./Currency');
const User = require('./User');

class Budget {
  static create({ user_id, category_id, amount, period = 'monthly', alert_threshold = 80, alert_enabled = 1 }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO budgets (user_id, category_id, amount, period, alert_threshold, alert_enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([user_id, category_id, amount, period, alert_threshold, alert_enabled]);
    stmt.step();
    stmt.free();
    save();

    // Get the newly created budget
    const queryStmt = db.prepare(`
      SELECT id FROM budgets
      WHERE user_id = ? AND category_id = ? AND period = ?
      ORDER BY id DESC LIMIT 1
    `);
    queryStmt.bind([user_id, category_id, period]);

    let budgetId = null;
    if (queryStmt.step()) {
      const row = queryStmt.getAsObject();
      budgetId = row.id;
    }
    queryStmt.free();

    return budgetId ? this.findById(budgetId) : null;
  }

  static findById(id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT b.*, c.name as category_name, c.color, c.icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `);
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return this.enrichBudget(result);
    }
    stmt.free();
    return null;
  }

  static findByUserAndCategory(user_id, category_id, period = 'monthly') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT b.*, c.name as category_name, c.color, c.icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.category_id = ? AND b.period = ?
    `);
    stmt.bind([user_id, category_id, period]);

    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return this.enrichBudget(result);
    }
    stmt.free();
    return null;
  }

  static findByUser(user_id, period = null) {
    const db = getDb();
    let query = `
      SELECT b.*, c.name as category_name, c.color, c.icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
    `;
    
    if (period) {
      query += ` AND b.period = ?`;
    }
    
    query += ` ORDER BY b.period, b.created_at DESC`;

    const stmt = db.prepare(query);
    if (period) {
      stmt.bind([user_id, period]);
    } else {
      stmt.bind([user_id]);
    }

    const budgets = [];
    while (stmt.step()) {
      budgets.push(this.enrichBudget(stmt.getAsObject()));
    }
    stmt.free();

    return budgets;
  }

  static update(id, { amount, alert_threshold, alert_enabled }) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE budgets 
      SET amount = COALESCE(?, amount),
          alert_threshold = COALESCE(?, alert_threshold),
          alert_enabled = COALESCE(?, alert_enabled),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.bind([amount || null, alert_threshold || null, alert_enabled !== undefined ? alert_enabled : null, id]);
    stmt.step();
    stmt.free();
    save();

    return this.findById(id);
  }

  static delete(id) {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM budgets WHERE id = ?
    `);
    stmt.bind([id]);
    stmt.step();
    stmt.free();
    save();
  }

  static enrichBudget(budget) {
    if (!budget) return null;

    // Calculate spent amount for this period
    const now = new Date();
    let startDate, endDate;

    switch (budget.period) {
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'monthly':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const db = getDb();
    const transactionStmt = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as spent
      FROM transactions
      WHERE user_id = ? AND category_id = ? AND type = 'expense'
        AND date >= ? AND date <= ?
    `);
    transactionStmt.bind([
      budget.user_id,
      budget.category_id,
      startDate.toISOString(),
      endDate.toISOString()
    ]);

    let spent = 0;
    if (transactionStmt.step()) {
      const row = transactionStmt.getAsObject();
      spent = row.spent || 0;
    }
    transactionStmt.free();

    const percentage = (spent / budget.amount) * 100;
    const remaining = Math.max(0, budget.amount - spent);
    const user = User.findById(budget.user_id);
    const amountDisplay = Currency.withDisplayAmount(budget.amount, user?.preferredCurrency);
    const spentDisplay = Currency.withDisplayAmount(spent, user?.preferredCurrency);
    const remainingDisplay = Currency.withDisplayAmount(remaining, user?.preferredCurrency);

    return {
      ...budget,
      spent,
      remaining,
      displayAmount: amountDisplay.displayAmount,
      displaySpent: spentDisplay.displayAmount,
      displayRemaining: remainingDisplay.displayAmount,
      displayCurrency: amountDisplay.displayCurrency,
      displaySymbol: amountDisplay.displaySymbol,
      percentage: Math.round(percentage * 100) / 100,
      isExceeded: spent > budget.amount,
      isAlert: percentage >= budget.alert_threshold,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString()
    };
  }

  static createAlert(budget_id, spent_amount, percentage) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO budget_alerts (budget_id, spent_amount, percentage)
      VALUES (?, ?, ?)
    `);
    stmt.bind([budget_id, spent_amount, percentage]);
    stmt.step();
    stmt.free();
    save();
  }

  static getUnreadAlerts(user_id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT ba.*, b.*, c.name as category_name
      FROM budget_alerts ba
      JOIN budgets b ON ba.budget_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND ba.dismissed = 0
      ORDER BY ba.alert_date DESC
      LIMIT 10
    `);
    stmt.bind([user_id]);

    const alerts = [];
    while (stmt.step()) {
      alerts.push(stmt.getAsObject());
    }
    stmt.free();

    return alerts;
  }

  static dismissAlert(alert_id) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE budget_alerts 
      SET dismissed = 1, dismissed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.bind([alert_id]);
    stmt.step();
    stmt.free();
    save();
  }
}

module.exports = Budget;
