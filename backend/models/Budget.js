const { getPool } = require('../config/database');
const Currency = require('./Currency');
const User = require('./User');

class Budget {
  static async create({ user_id, category_id, amount, period = 'monthly', alert_threshold = 80, alert_enabled = 1 }) {
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO budgets (user_id, category_id, amount, period, alert_threshold, alert_enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [user_id, category_id, amount, period, alert_threshold, alert_enabled]);

    return this.findById(result.rows[0].id);
  }

  static async findById(id) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT b.*, c.name as category_name, c.color, c.icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length > 0) {
      return this.enrichBudget(result.rows[0]);
    }
    return null;
  }

  static async findByUserAndCategory(user_id, category_id, period = 'monthly') {
    const pool = getPool();
    const result = await pool.query(`
      SELECT b.*, c.name as category_name, c.color, c.icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1 AND b.category_id = $2 AND b.period = $3
    `, [user_id, category_id, period]);

    if (result.rows.length > 0) {
      return this.enrichBudget(result.rows[0]);
    }
    return null;
  }

  static async findByUser(user_id, period = null) {
    const pool = getPool();
    let query = `
      SELECT b.*, c.name as category_name, c.color, c.icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1
    `;
    
    if (period) {
      query += ` AND b.period = $2`;
    }
    
    query += ` ORDER BY b.period, b.created_at DESC`;

    const params = period ? [user_id, period] : [user_id];
    const result = await pool.query(query, params);

    const budgets = [];
    for (const row of result.rows) {
      budgets.push(await this.enrichBudget(row));
    }

    return budgets;
  }

  static async update(id, { amount, alert_threshold, alert_enabled }) {
    const pool = getPool();
    await pool.query(`
      UPDATE budgets 
      SET amount = COALESCE($1, amount),
          alert_threshold = COALESCE($2, alert_threshold),
          alert_enabled = COALESCE($3, alert_enabled),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [amount, alert_threshold, alert_enabled, id]);

    return this.findById(id);
  }

  static async delete(id) {
    const pool = getPool();
    await pool.query(`DELETE FROM budgets WHERE id = $1`, [id]);
  }

  static async enrichBudget(budget) {
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

    const pool = getPool();
    const transactionResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as spent
      FROM transactions
      WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
        AND date >= $3 AND date <= $4
    `, [
      budget.user_id,
      budget.category_id,
      startDate.toISOString(),
      endDate.toISOString()
    ]);

    const spent = transactionResult.rows[0].spent || 0;
    const percentage = (spent / budget.amount) * 100;
    const remaining = Math.max(0, budget.amount - spent);
    const user = await User.findById(budget.user_id);
    const amountDisplay = await Currency.withDisplayAmount(budget.amount, user?.preferredCurrency);
    const spentDisplay = await Currency.withDisplayAmount(spent, user?.preferredCurrency);
    const remainingDisplay = await Currency.withDisplayAmount(remaining, user?.preferredCurrency);

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

  static async createAlert(budget_id, spent_amount, percentage) {
    const pool = getPool();
    await pool.query(`
      INSERT INTO budget_alerts (budget_id, spent_amount, percentage)
      VALUES ($1, $2, $3)
    `, [budget_id, spent_amount, percentage]);
  }

  static async getUnreadAlerts(user_id) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT ba.*, b.*, c.name as category_name
      FROM budget_alerts ba
      JOIN budgets b ON ba.budget_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1 AND ba.dismissed = 0
      ORDER BY ba.alert_date DESC
      LIMIT 10
    `, [user_id]);

    return result.rows;
  }

  static async dismissAlert(alert_id) {
    const pool = getPool();
    await pool.query(`
      UPDATE budget_alerts 
      SET dismissed = 1, dismissed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [alert_id]);
  }
}

module.exports = Budget;
