const { getPool } = require('../config/database');

class Category {
  static async create({ name, type, user_id, color, icon, is_default = false }) {
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO categories (name, type, user_id, color, icon, is_default)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, type, user_id, color, icon, is_default ? 1 : 0]);
    
    return this.formatCategory(result.rows[0]);
  }

  static async findById(id) {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (result.rows.length > 0) {
      return this.formatCategory(result.rows[0]);
    }
    return null;
  }

  static async findByUser(userId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM categories WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (filters.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    
    return result.rows.map(row => this.formatCategory(row));
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
      UPDATE categories 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;
    
    const result = await pool.query(query, params);
    return this.formatCategory(result.rows[0]);
  }

  static async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
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
