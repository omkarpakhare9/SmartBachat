const { getPool } = require('../config/database');
const Transaction = require('./Transaction');

class RecurringTransaction {
  static async create({ user_id, category_id, type, amount, description, frequency, start_date, end_date, day_of_week, day_of_month }) {
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO recurring_transactions 
      (user_id, category_id, type, amount, description, frequency, start_date, end_date, day_of_week, day_of_month)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [user_id, category_id, type, amount, description, frequency, start_date, end_date, day_of_week, day_of_month]);

    return this.findById(result.rows[0].id);
  }

  static async findById(id) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT rt.*, c.name as category_name, c.color, c.icon
      FROM recurring_transactions rt
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.id = $1
    `, [id]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  static async findByUser(user_id, isActive = null) {
    const pool = getPool();
    let query = `
      SELECT rt.*, c.name as category_name, c.color, c.icon
      FROM recurring_transactions rt
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.user_id = $1
    `;

    if (isActive !== null) {
      query += ` AND rt.is_active = $2`;
    }

    query += ` ORDER BY rt.created_at DESC`;

    const params = isActive !== null ? [user_id, isActive] : [user_id];
    const result = await pool.query(query, params);

    return result.rows;
  }

  static async update(id, { amount, description, end_date, is_active, day_of_week, day_of_month }) {
    const pool = getPool();
    await pool.query(`
      UPDATE recurring_transactions
      SET amount = COALESCE($1, amount),
          description = COALESCE($2, description),
          end_date = COALESCE($3, end_date),
          is_active = COALESCE($4, is_active),
          day_of_week = COALESCE($5, day_of_week),
          day_of_month = COALESCE($6, day_of_month),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [amount, description, end_date, is_active, day_of_week, day_of_month, id]);

    return this.findById(id);
  }

  static async delete(id) {
    const pool = getPool();
    
    // Delete recurring instances first
    await pool.query(`
      DELETE FROM recurring_instances
      WHERE recurring_transaction_id = $1
    `, [id]);

    // Delete recurring transaction
    await pool.query(`DELETE FROM recurring_transactions WHERE id = $1`, [id]);
  }

  static async processRecurring() {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    // Get all active recurring transactions that should run today
    const result = await pool.query(`
      SELECT rt.*, c.id as category_id
      FROM recurring_transactions rt
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.is_active = 1
        AND rt.start_date <= $1
        AND (rt.end_date IS NULL OR rt.end_date >= $2)
    `, [today, today]);

    const toProcess = [];
    for (const row of result.rows) {
      if (this.shouldRunToday(row, today)) {
        toProcess.push(row);
      }
    }

    // Create transactions for each
    for (const recurring of toProcess) {
      await this.createTransactionInstance(recurring, today);
    }

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

  static async createTransactionInstance(recurring, date) {
    try {
      // Create transaction
      const transaction = await Transaction.create({
        user_id: recurring.user_id,
        type: recurring.type,
        category_id: recurring.category_id,
        amount: recurring.amount,
        description: recurring.description,
        date: new Date(date).toISOString()
      });

      if (transaction) {
        const pool = getPool();
        // Record the instance
        await pool.query(`
          INSERT INTO recurring_instances 
          (recurring_transaction_id, transaction_id, scheduled_date)
          VALUES ($1, $2, $3)
        `, [recurring.id, transaction.id, date]);

        // Update last_created
        await pool.query(`
          UPDATE recurring_transactions
          SET last_created = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [recurring.id]);

        return transaction;
      }
    } catch (error) {
      console.error('Error creating recurring transaction instance:', error);
    }
    return null;
  }

  static async getInstances(recurring_id, limit = 12) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT ri.*, t.amount, t.description, t.date, t.type
      FROM recurring_instances ri
      JOIN transactions t ON ri.transaction_id = t.id
      WHERE ri.recurring_transaction_id = $1
      ORDER BY ri.scheduled_date DESC
      LIMIT $2
    `, [recurring_id, limit]);

    return result.rows;
  }
}

module.exports = RecurringTransaction;
