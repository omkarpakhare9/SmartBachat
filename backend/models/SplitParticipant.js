const { getDb, save } = require('../config/database');
const crypto = require('crypto');

class SplitParticipant {
  // Add participant to split (could be existing user or email)
  static addParticipant({ split_id, user_id, email, share }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO split_participants (split_id, user_id, email, share, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const status = user_id ? 'accepted' : 'pending';
    stmt.bind([split_id, user_id || null, email || null, share, status]);
    stmt.step();
    stmt.free();
    save();
    
    // Get the newly created participant
    const queryStmt = db.prepare(`
      SELECT id FROM split_participants 
      WHERE split_id = ? AND (user_id = ? OR email = ?)
      ORDER BY id DESC LIMIT 1
    `);
    queryStmt.bind([split_id, user_id, email]);
    
    let participantId = null;
    if (queryStmt.step()) {
      const row = queryStmt.getAsObject();
      participantId = row.id;
    }
    queryStmt.free();
    
    return participantId ? this.findById(participantId) : null;
  }

  // Create invitation for participant
  static createInvitation({ split_id, participant_id, email }) {
    const db = getDb();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const stmt = db.prepare(`
      INSERT INTO split_invitations (split_id, participant_id, email, token, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.bind([split_id, participant_id, email, token, expiresAt.toISOString()]);
    stmt.step();
    stmt.free();
    save();
    
    return token;
  }

  // Find participant by ID
  static findById(id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT sp.*, u.name, u.email as user_email
      FROM split_participants sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.id = ?
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

  // Find participants by split
  static findBySplit(split_id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT sp.*, u.name, u.email as user_email
      FROM split_participants sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.split_id = ?
      ORDER BY sp.invited_at DESC
    `);
    stmt.bind([split_id]);
    
    const participants = [];
    while (stmt.step()) {
      participants.push(stmt.getAsObject());
    }
    stmt.free();
    
    return participants;
  }

  // Find invitation by token
  static findInvitationByToken(token) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT si.*, sp.email, sp.share, s.id as split_id
      FROM split_invitations si
      JOIN split_participants sp ON si.participant_id = sp.id
      JOIN splits s ON si.split_id = s.id
      WHERE si.token = ? AND si.status = 'pending' AND datetime(si.expires_at) > datetime('now')
    `);
    stmt.bind([token]);
    
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  // Accept invitation
  static acceptInvitation(token, user_id) {
    const db = getDb();
    
    // Get invitation details
    const invitation = this.findInvitationByToken(token);
    if (!invitation) {
      return null;
    }

    // Update participant
    const updateParticipantStmt = db.prepare(`
      UPDATE split_participants 
      SET user_id = ?, status = 'accepted', accepted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateParticipantStmt.bind([user_id, invitation.id]);
    updateParticipantStmt.step();
    updateParticipantStmt.free();

    // Update invitation
    const updateInvitationStmt = db.prepare(`
      UPDATE split_invitations 
      SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
      WHERE token = ?
    `);
    updateInvitationStmt.bind([token]);
    updateInvitationStmt.step();
    updateInvitationStmt.free();
    
    save();
    return this.findById(invitation.id);
  }

  // Decline invitation
  static declineInvitation(token) {
    const db = getDb();
    
    // Get invitation details
    const invitation = this.findInvitationByToken(token);
    if (!invitation) {
      return null;
    }

    // Update participant status
    const updateParticipantStmt = db.prepare(`
      UPDATE split_participants 
      SET status = 'declined'
      WHERE id = ?
    `);
    updateParticipantStmt.bind([invitation.id]);
    updateParticipantStmt.step();
    updateParticipantStmt.free();

    // Update invitation
    const updateInvitationStmt = db.prepare(`
      UPDATE split_invitations 
      SET status = 'declined', responded_at = CURRENT_TIMESTAMP
      WHERE token = ?
    `);
    updateInvitationStmt.bind([token]);
    updateInvitationStmt.step();
    updateInvitationStmt.free();
    
    save();
    return this.findById(invitation.id);
  }

  // Remove participant from split
  static removeParticipant(participant_id) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE split_participants 
      SET status = 'removed'
      WHERE id = ?
    `);
    stmt.bind([participant_id]);
    stmt.step();
    stmt.free();
    save();
    return this.findById(participant_id);
  }

  // Resend invitation
  static resendInvitation(participant_id) {
    const db = getDb();
    
    // Invalidate old invitation
    const invalidateStmt = db.prepare(`
      UPDATE split_invitations 
      SET status = 'expired'
      WHERE participant_id = ? AND status = 'pending'
    `);
    invalidateStmt.bind([participant_id]);
    invalidateStmt.step();
    invalidateStmt.free();

    // Get participant details
    const participant = this.findById(participant_id);
    if (!participant) {
      return null;
    }

    // Create new invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const stmt = db.prepare(`
      INSERT INTO split_invitations (split_id, participant_id, email, token, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.bind([participant.split_id, participant_id, participant.email, token, expiresAt.toISOString()]);
    stmt.step();
    stmt.free();
    
    save();
    return token;
  }

  // Update participant share
  static updateShare(participant_id, share) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE split_participants 
      SET share = ?
      WHERE id = ?
    `);
    stmt.bind([share, participant_id]);
    stmt.step();
    stmt.free();
    save();
    return this.findById(participant_id);
  }
}

module.exports = SplitParticipant;
