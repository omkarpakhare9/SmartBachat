const { getDb, save } = require('../config/database');

class Receipt {
  static create({ transaction_id, user_id, file_url, file_name, file_size, file_type, storage_type = 'local' }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO receipts (transaction_id, user_id, file_url, file_name, file_size, file_type, storage_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([transaction_id, user_id, file_url, file_name, file_size, file_type, storage_type]);
    stmt.step();
    stmt.free();
    save();

    // Get the newly created receipt
    const queryStmt = db.prepare(`
      SELECT id FROM receipts
      WHERE transaction_id = ? AND user_id = ?
      ORDER BY id DESC LIMIT 1
    `);
    queryStmt.bind([transaction_id, user_id]);

    let receiptId = null;
    if (queryStmt.step()) {
      const row = queryStmt.getAsObject();
      receiptId = row.id;
    }
    queryStmt.free();

    return receiptId ? this.findById(receiptId) : null;
  }

  static findById(id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM receipts WHERE id = ?
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

  static findByTransaction(transaction_id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM receipts
      WHERE transaction_id = ?
      ORDER BY uploaded_at DESC
    `);
    stmt.bind([transaction_id]);

    const receipts = [];
    while (stmt.step()) {
      receipts.push(stmt.getAsObject());
    }
    stmt.free();

    return receipts;
  }

  static findByUser(user_id, limit = 50) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT r.*, t.description, t.amount, t.date
      FROM receipts r
      JOIN transactions t ON r.transaction_id = t.id
      WHERE r.user_id = ?
      ORDER BY r.uploaded_at DESC
      LIMIT ?
    `);
    stmt.bind([user_id, limit]);

    const receipts = [];
    while (stmt.step()) {
      receipts.push(stmt.getAsObject());
    }
    stmt.free();

    return receipts;
  }

  static delete(id) {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM receipts WHERE id = ?
    `);
    stmt.bind([id]);
    stmt.step();
    stmt.free();
    save();
  }

  static deleteByTransaction(transaction_id) {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM receipts WHERE transaction_id = ?
    `);
    stmt.bind([transaction_id]);
    stmt.step();
    stmt.free();
    save();
  }
}

module.exports = Receipt;
