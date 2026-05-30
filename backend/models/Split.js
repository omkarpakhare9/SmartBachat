const { getDb, save } = require('../config/database');
const Currency = require('./Currency');
const User = require('./User');

class Split {
  static create({ transaction_id, created_by, total_amount, split_type, notes, participants }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO splits (transaction_id, created_by, total_amount, split_type, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.bind([transaction_id, created_by, total_amount, split_type, notes]);
    stmt.step();
    stmt.free();
    
    // Find the newly created split
    const queryStmt = db.prepare(`
      SELECT id FROM splits
      WHERE transaction_id = ? AND created_by = ?
      ORDER BY id DESC LIMIT 1
    `);
    queryStmt.bind([transaction_id, created_by]);
    
    let splitId = null;
    if (queryStmt.step()) {
      const row = queryStmt.getAsObject();
      splitId = row.id;
    }
    queryStmt.free();
    
    if (!splitId) return null;

    // Insert participants
    const participantStmt = db.prepare(`
      INSERT INTO split_participants (split_id, user_id, share, paid)
      VALUES (?, ?, ?, ?)
    `);
    participants.forEach(p => {
      participantStmt.bind([splitId, p.user, p.share, p.paid ? 1 : 0]);
      participantStmt.step();
      participantStmt.reset();
    });
    participantStmt.free();
    save();
    return this.findById(splitId);
  }

  static findById(id, preferredCurrency = null) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT s.*, 
             t.amount as transaction_amount,
             t.description as transaction_description,
             t.date as transaction_date
      FROM splits s
      LEFT JOIN transactions t ON s.transaction_id = t.id
      WHERE s.id = ?
    `);
    stmt.bind([id]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.formatSplit(row, preferredCurrency);
    }
    stmt.free();
    return null;
  }

  static findByCreatedBy(userId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT s.*, 
             t.amount as transaction_amount,
             t.description as transaction_description,
             t.date as transaction_date
      FROM splits s
      LEFT JOIN transactions t ON s.transaction_id = t.id
      WHERE s.created_by = ?
      ORDER BY s.created_at DESC
    `);
    stmt.bind([userId]);
    
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    
    const user = User.findById(userId);
    return rows.map(row => this.formatSplit(row, user?.preferredCurrency));
  }

  static updateParticipantPaid(splitId, participantId) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE split_participants 
      SET paid = 1, paid_at = CURRENT_TIMESTAMP
      WHERE id = ? AND split_id = ?
    `);
    stmt.bind([participantId, splitId]);
    stmt.step();
    stmt.free();

    // Check if all participants are paid
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as total, SUM(paid) as paid_count
      FROM split_participants
      WHERE split_id = ?
    `);
    checkStmt.bind([splitId]);
    
    let result = { total: 0, paid_count: 0 };
    if (checkStmt.step()) {
      result = checkStmt.getAsObject();
    }
    checkStmt.free();

    let status = 'pending';
    if (result.paid_count > 0) {
      status = result.paid_count === result.total ? 'completed' : 'partial';
    }

    const updateStatusStmt = db.prepare(`
      UPDATE splits SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    updateStatusStmt.bind([status, splitId]);
    updateStatusStmt.step();
    updateStatusStmt.free();
    save();
    return this.findById(splitId);
  }

  static formatSplit(row, preferredCurrency = null) {
    if (!row) return null;
    const db = getDb();

    // Get participants
    const participantStmt = db.prepare(`
      SELECT sp.*, u.name, u.email
      FROM split_participants sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.split_id = ?
    `);
    participantStmt.bind([row.id]);
    
    const participants = [];
    while (participantStmt.step()) {
      const p = participantStmt.getAsObject();
      const shareDisplay = Currency.withDisplayAmount(p.share, preferredCurrency || 'USD');
      participants.push({
        _id: p.id,
        user: {
          _id: p.user_id,
          name: p.name,
          email: p.email
        },
        share: p.share,
        displayShare: shareDisplay.displayAmount,
        displayCurrency: shareDisplay.displayCurrency,
        paid: p.paid === 1,
        paidAt: p.paid_at
      });
    }
    participantStmt.free();

    const totalDisplay = Currency.withDisplayAmount(row.total_amount, preferredCurrency || 'USD');
    const transactionDisplay = Currency.withDisplayAmount(row.transaction_amount, preferredCurrency || 'USD');

    return {
      _id: row.id,
      transaction: {
        _id: row.transaction_id,
        amount: row.transaction_amount,
        displayAmount: transactionDisplay.displayAmount,
        displayCurrency: transactionDisplay.displayCurrency,
        description: row.transaction_description,
        date: row.transaction_date
      },
      createdBy: row.created_by,
      created_by: row.created_by,
      participants,
      totalAmount: row.total_amount,
      displayTotalAmount: totalDisplay.displayAmount,
      displayCurrency: totalDisplay.displayCurrency,
      displaySymbol: totalDisplay.displaySymbol,
      splitType: row.split_type,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = Split;
