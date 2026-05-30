const { getPool } = require('../config/database');
const crypto = require('crypto');

class SplitParticipant {
  // Add participant to split (could be existing user or email)
  static async addParticipant({ split_id, user_id, email, share }) {
    const pool = getPool();
    const status = user_id ? 'accepted' : 'pending';
    
    const result = await pool.query(`
      INSERT INTO split_participants (split_id, user_id, email, share, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [split_id, user_id || null, email || null, share, status]);

    const participantId = result.rows[0].id;
    return this.findById(participantId);
  }

  // Create invitation for participant
  static async createInvitation({ split_id, participant_id, email }) {
    const pool = getPool();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await pool.query(`
      INSERT INTO split_invitations (split_id, participant_id, email, token, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [split_id, participant_id, email, token, expiresAt.toISOString()]);
    
    return token;
  }

  // Find participant by ID
  static async findById(id) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT sp.*, u.name, u.email as user_email
      FROM split_participants sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.id = $1
    `, [id]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  // Find participants by split
  static async findBySplit(split_id) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT sp.*, u.name, u.email as user_email
      FROM split_participants sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.split_id = $1
      ORDER BY sp.invited_at DESC
    `, [split_id]);

    return result.rows;
  }

  // Find invitation by token
  static async findInvitationByToken(token) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT si.*, sp.email, sp.share, s.id as split_id
      FROM split_invitations si
      JOIN split_participants sp ON si.participant_id = sp.id
      JOIN splits s ON si.split_id = s.id
      WHERE si.token = $1 AND si.status = 'pending' AND si.expires_at > NOW()
    `, [token]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  // Accept invitation
  static async acceptInvitation(token, user_id) {
    const pool = getPool();
    
    // Get invitation details
    const invitation = await this.findInvitationByToken(token);
    if (!invitation) {
      return null;
    }

    // Update participant
    await pool.query(`
      UPDATE split_participants 
      SET user_id = $1, status = 'accepted', accepted_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [user_id, invitation.id]);

    // Update invitation
    await pool.query(`
      UPDATE split_invitations 
      SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
      WHERE token = $1
    `, [token]);
    
    return this.findById(invitation.id);
  }

  // Decline invitation
  static async declineInvitation(token) {
    const pool = getPool();
    
    // Get invitation details
    const invitation = await this.findInvitationByToken(token);
    if (!invitation) {
      return null;
    }

    // Update participant status
    await pool.query(`
      UPDATE split_participants 
      SET status = 'declined'
      WHERE id = $1
    `, [invitation.id]);

    // Update invitation
    await pool.query(`
      UPDATE split_invitations 
      SET status = 'declined', responded_at = CURRENT_TIMESTAMP
      WHERE token = $1
    `, [token]);
    
    return this.findById(invitation.id);
  }

  // Remove participant from split
  static async removeParticipant(participant_id) {
    const pool = getPool();
    await pool.query(`
      UPDATE split_participants 
      SET status = 'removed'
      WHERE id = $1
    `, [participant_id]);
    return this.findById(participant_id);
  }

  // Resend invitation
  static async resendInvitation(participant_id) {
    const pool = getPool();
    
    // Invalidate old invitation
    await pool.query(`
      UPDATE split_invitations 
      SET status = 'expired'
      WHERE participant_id = $1 AND status = 'pending'
    `, [participant_id]);

    // Get participant details
    const participant = await this.findById(participant_id);
    if (!participant) {
      return null;
    }

    // Create new invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await pool.query(`
      INSERT INTO split_invitations (split_id, participant_id, email, token, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [participant.split_id, participant_id, participant.email, token, expiresAt.toISOString()]);
    
    return token;
  }

  // Update participant share
  static async updateShare(participant_id, share) {
    const pool = getPool();
    await pool.query(`
      UPDATE split_participants 
      SET share = $1
      WHERE id = $2
    `, [share, participant_id]);
    return this.findById(participant_id);
  }
}

module.exports = SplitParticipant;
