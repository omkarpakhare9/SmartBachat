const { getPool } = require('../config/database');
const Currency = require('./Currency');
const User = require('./User');

class Transaction {
  static async create({ user_id, type, amount, category_id, description, date, is_split = false }) {
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO transactions (user_id, type, amount, category_id, description, date, is_split)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [user_id, type, amount, category_id, description, date, is_split ? 1 : 0]);
    
    return this.findById(result.rows[0].id);
  }

  static async findById(id, preferredCurrency = null) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT t.*, 
             c.name as category_name, 
             c.color as category_color, 
             c.icon as category_icon,
             c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1
    `, [id]);
    
    if (result.rows.length > 0) {
      return this.formatTransaction(result.rows[0], preferredCurrency);
    }
    return null;
  }

  static async findByUser(userId, filters = {}) {
    const pool = getPool();
    let query = `
      SELECT t.*, 
             c.name as category_name, 
             c.color as category_color, 
             c.icon as category_icon,
             c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }
    if (filters.category_id) {
      query += ` AND t.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }
    if (filters.start_date) {
      query += ` AND t.date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }
    if (filters.end_date) {
      query += ` AND t.date <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    query += ' ORDER BY t.date DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    
    const user = await User.findById(userId);
    return result.rows.map(row => this.formatTransaction(row, user?.preferredCurrency));
  }

  static async countByUser(userId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (filters.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }
    if (filters.category_id) {
      query += ` AND category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }
    if (filters.start_date) {
      query += ` AND date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }
    if (filters.end_date) {
      query += ` AND date <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  static async update(id, data) {
    const pool = getPool();
    const fields = [];
    const params = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && key !== 'id' && key !== 'user_id') {
        fields.push(`${key} = $${fields.length + 1}`);
        params.push(data[key]);
      }
    });

    if (fields.length === 0) return null;

    params.push(id);
    const query = `
      UPDATE transactions 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
    `;
    
    await pool.query(query, params);
    return this.findById(id);
  }

  static async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
  }

  static formatTransaction(row, preferredCurrency = null) {
    const display = Currency.withDisplayAmount(row.amount, preferredCurrency || 'USD');
    return {
      id: row.id,
      _id: row.id,
      user: row.user_id,
      type: row.type,
      amount: row.amount,
      displayAmount: display.displayAmount,
      displayCurrency: display.displayCurrency,
      displaySymbol: display.displaySymbol,
      category: {
        _id: row.category_id,
        name: row.category_name,
        color: row.category_color,
        icon: row.category_icon,
        type: row.category_type
      },
      description: row.description,
      date: row.date,
      isSplit: row.is_split === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = Transaction;
