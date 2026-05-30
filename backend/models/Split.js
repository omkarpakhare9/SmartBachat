const { getPool } = require('../config/database');
const Currency = require('./Currency');
const User = require('./User');

class Split {
  static async create({ transaction_id, created_by, total_amount, split_type, notes, participants }) {
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO splits (transaction_id, created_by, total_amount, split_type, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [transaction_id, created_by, total_amount, split_type, notes]);

    const splitId = result.rows[0].id;

    // Insert participants
    for (const p of participants) {
      await pool.query(`
        INSERT INTO split_participants (split_id, user_id, share, paid)
        VALUES ($1, $2, $3, $4)
      `, [splitId, p.user, p.share, p.paid ? 1 : 0]);
    }

    return this.findById(splitId);
  }

  static async findById(id, preferredCurrency = null) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT s.*, 
             t.amount as transaction_amount,
             t.description as transaction_description,
             t.date as transaction_date
      FROM splits s
      LEFT JOIN transactions t ON s.transaction_id = t.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length > 0) {
      return this.formatSplit(result.rows[0], preferredCurrency);
    }
    return null;
  }

  static async findByCreatedBy(userId) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT s.*, 
             t.amount as transaction_amount,
             t.description as transaction_description,
             t.date as transaction_date
      FROM splits s
      LEFT JOIN transactions t ON s.transaction_id = t.id
      WHERE s.created_by = $1
      ORDER BY s.created_at DESC
    `, [userId]);

    const user = await User.findById(userId);
    const splits = [];
    for (const row of result.rows) {
      splits.push(await this.formatSplit(row, user?.preferredCurrency));
    }
    return splits;
  }

  static async updateParticipantPaid(splitId, participantId) {
    const pool = getPool();
    await pool.query(`
      UPDATE split_participants 
      SET paid = 1, paid_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND split_id = $2
    `, [participantId, splitId]);

    // Check if all participants are paid
    const checkResult = await pool.query(`
      SELECT COUNT(*) as total, SUM(paid) as paid_count
      FROM split_participants
      WHERE split_id = $1
    `, [splitId]);

    const result = checkResult.rows[0];
    let status = 'pending';
    if (result.paid_count > 0) {
      status = result.paid_count === result.total ? 'completed' : 'partial';
    }

    await pool.query(`
      UPDATE splits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
    `, [status, splitId]);
    return this.findById(splitId);
  }

  static async formatSplit(row, preferredCurrency = null) {
    if (!row) return null;
    const pool = getPool();

    // Get participants
    const participantResult = await pool.query(`
      SELECT sp.*, u.name, u.email
      FROM split_participants sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.split_id = $1
    `, [row.id]);

    const participants = [];
    for (const p of participantResult.rows) {
      const shareDisplay = await Currency.withDisplayAmount(p.share, preferredCurrency || 'USD');
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

    const totalDisplay = await Currency.withDisplayAmount(row.total_amount, preferredCurrency || 'USD');
    const transactionDisplay = await Currency.withDisplayAmount(row.transaction_amount, preferredCurrency || 'USD');

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
