const { getDb, save } = require('../config/database');
const Currency = require('./Currency');
const User = require('./User');

class Transaction {
  static create({ user_id, type, amount, category_id, description, date, is_split = false }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO transactions (user_id, type, amount, category_id, description, date, is_split)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([user_id, type, amount, category_id, description, date, is_split ? 1 : 0]);
    stmt.step();
    stmt.free();
    save();
    
    // Find the newly created transaction
    const queryStmt = db.prepare(`
      SELECT t.id FROM transactions t
      WHERE t.user_id = ? AND t.date = ? AND t.amount = ? AND t.description = ?
      ORDER BY t.id DESC LIMIT 1
    `);
    queryStmt.bind([user_id, date, amount, description]);
    
    if (queryStmt.step()) {
      const row = queryStmt.getAsObject();
      queryStmt.free();
      return this.findById(row.id);
    }
    queryStmt.free();
    return null;
  }

  static findById(id, preferredCurrency = null) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT t.*, 
             c.name as category_name, 
             c.color as category_color, 
             c.icon as category_icon,
             c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `);
    stmt.bind([id]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.formatTransaction(row, preferredCurrency);
    }
    stmt.free();
    return null;
  }

  static findByUser(userId, filters = {}) {
    const db = getDb();
    let query = `
      SELECT t.*, 
             c.name as category_name, 
             c.color as category_color, 
             c.icon as category_icon,
             c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (filters.type) {
      query += ' AND t.type = ?';
      params.push(filters.type);
    }
    if (filters.category_id) {
      query += ' AND t.category_id = ?';
      params.push(filters.category_id);
    }
    if (filters.start_date) {
      query += ' AND t.date >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND t.date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY t.date DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    
    const user = User.findById(userId);
    return rows.map(row => this.formatTransaction(row, user?.preferredCurrency));
  }

  static countByUser(userId, filters = {}) {
    const db = getDb();
    let query = 'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.category_id) {
      query += ' AND category_id = ?';
      params.push(filters.category_id);
    }
    if (filters.start_date) {
      query += ' AND date >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND date <= ?';
      params.push(filters.end_date);
    }

    const stmt = db.prepare(query);
    stmt.bind(params);
    
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result.count;
    }
    stmt.free();
    return 0;
  }

  static update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && key !== 'id' && key !== 'user_id') {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    });

    if (fields.length === 0) return null;

    params.push(id);
    const stmt = db.prepare(`
      UPDATE transactions 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    save();
    return this.findById(id);
  }

  static delete(id) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    stmt.free();
    save();
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
