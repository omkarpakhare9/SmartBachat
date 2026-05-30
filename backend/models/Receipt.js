const { getPool } = require('../config/database');

class Receipt {
  static async create({ transaction_id, user_id, file_url, file_name, file_size, file_type, storage_type = 'local' }) {
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO receipts (transaction_id, user_id, file_url, file_name, file_size, file_type, storage_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [transaction_id, user_id, file_url, file_name, file_size, file_type, storage_type]);

    return this.findById(result.rows[0].id);
  }

  static async findById(id) {
    const pool = getPool();
    const result = await pool.query(`SELECT * FROM receipts WHERE id = $1`, [id]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  static async findByTransaction(transaction_id) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT * FROM receipts
      WHERE transaction_id = $1
      ORDER BY uploaded_at DESC
    `, [transaction_id]);

    return result.rows;
  }

  static async findByUser(user_id, limit = 50) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT r.*, t.description, t.amount, t.date
      FROM receipts r
      JOIN transactions t ON r.transaction_id = t.id
      WHERE r.user_id = $1
      ORDER BY r.uploaded_at DESC
      LIMIT $2
    `, [user_id, limit]);

    return result.rows;
  }

  static async delete(id) {
    const pool = getPool();
    await pool.query(`DELETE FROM receipts WHERE id = $1`, [id]);
  }

  static async deleteByTransaction(transaction_id) {
    const pool = getPool();
    await pool.query(`DELETE FROM receipts WHERE transaction_id = $1`, [transaction_id]);
  }
}

module.exports = Receipt;
