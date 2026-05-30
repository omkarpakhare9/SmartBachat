const { getDb, save } = require('../config/database');

class Category {
  static create({ name, type, user_id, color, icon, is_default = false }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO categories (name, type, user_id, color, icon, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([name, type, user_id, color, icon, is_default ? 1 : 0]);
    stmt.step();
    stmt.free();
    save();
    
    // Find and return the newly created category by querying unique fields
    const queryStmt = db.prepare(`
      SELECT * FROM categories WHERE user_id = ? AND name = ? AND type = ?
    `);
    queryStmt.bind([user_id, name, type]);
    
    if (queryStmt.step()) {
      const row = queryStmt.getAsObject();
      queryStmt.free();
      return this.formatCategory(row);
    }
    queryStmt.free();
    return null;
  }

  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    stmt.bind([id]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.formatCategory(row);
    }
    stmt.free();
    return null;
  }

  static findByUser(userId, filters = {}) {
    const db = getDb();
    let query = 'SELECT * FROM categories WHERE user_id = ?';
    const params = [userId];

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY name ASC';

    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    
    return rows.map(row => this.formatCategory(row));
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
      UPDATE categories 
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
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    stmt.free();
    save();
  }

  static formatCategory(row) {
    if (!row) return null;
    return {
      _id: row.id,
      name: row.name,
      type: row.type,
      user: row.user_id,
      color: row.color,
      icon: row.icon,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = Category;
