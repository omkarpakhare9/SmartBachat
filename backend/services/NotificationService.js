const { sendEmail } = require('../config/mailer');
const { getDb, save } = require('../config/database');
const templates = require('./emailTemplates');
const User = require('../models/User');
const Budget = require('../models/Budget');

class NotificationService {
  // Get notification settings for user
  static getSettings(user_id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM notification_settings WHERE user_id = ?
    `);
    stmt.bind([user_id]);

    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();

    // Return default settings if none exist
    return {
      email_budget_alerts: 1,
      email_split_reminders: 1,
      email_recurring_reminders: 1,
      email_receipts: 1
    };
  }

  // Update notification settings
  static updateSettings(user_id, settings) {
    const db = getDb();
    
    // Check if settings already exist
    const checkStmt = db.prepare(`
      SELECT id FROM notification_settings WHERE user_id = ?
    `);
    checkStmt.bind([user_id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      const stmt = db.prepare(`
        UPDATE notification_settings
        SET email_budget_alerts = COALESCE(?, email_budget_alerts),
            email_split_reminders = COALESCE(?, email_split_reminders),
            email_recurring_reminders = COALESCE(?, email_recurring_reminders),
            email_receipts = COALESCE(?, email_receipts),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);
      stmt.bind([
        settings.email_budget_alerts !== undefined ? settings.email_budget_alerts : null,
        settings.email_split_reminders !== undefined ? settings.email_split_reminders : null,
        settings.email_recurring_reminders !== undefined ? settings.email_recurring_reminders : null,
        settings.email_receipts !== undefined ? settings.email_receipts : null,
        user_id
      ]);
      stmt.step();
      stmt.free();
    } else {
      const stmt = db.prepare(`
        INSERT INTO notification_settings 
        (user_id, email_budget_alerts, email_split_reminders, email_recurring_reminders, email_receipts)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.bind([
        user_id,
        settings.email_budget_alerts !== undefined ? settings.email_budget_alerts : 1,
        settings.email_split_reminders !== undefined ? settings.email_split_reminders : 1,
        settings.email_recurring_reminders !== undefined ? settings.email_recurring_reminders : 1,
        settings.email_receipts !== undefined ? settings.email_receipts : 1
      ]);
      stmt.step();
      stmt.free();
    }

    save();
    return this.getSettings(user_id);
  }

  // Send budget alert email
  static async sendBudgetAlert(budget) {
    try {
      const user = User.findById(budget.user_id);
      if (!user) return false;

      const settings = this.getSettings(budget.user_id);
      if (!settings.email_budget_alerts) return false;

      const templateData = templates.budgetAlert({
        userName: user.name,
        categoryName: budget.category_name,
        spentAmount: budget.spent,
        budgetAmount: budget.amount,
        percentage: budget.percentage
      });

      const result = await sendEmail({
        to: user.email,
        subject: templateData.subject,
        html: templateData.html
      });

      if (result.success) {
        this.logEmail(budget.user_id, user.email, templateData.subject, 'budget_alert', 'sent');
        // Create alert record
        Budget.createAlert(budget.id, budget.spent, budget.percentage);
      }

      return result.success;
    } catch (error) {
      console.error('Failed to send budget alert:', error);
      return false;
    }
  }

  // Send split reminder email
  static async sendSplitReminder(user_id, split) {
    try {
      const user = User.findById(user_id);
      if (!user) return false;

      const settings = this.getSettings(user_id);
      if (!settings.email_split_reminders) return false;

      const templateData = templates.splitReminder({
        userName: user.name,
        creatorName: split.creator_name,
        amount: split.total_amount,
        splitDescription: split.notes,
        participantCount: split.participant_count
      });

      const result = await sendEmail({
        to: user.email,
        subject: templateData.subject,
        html: templateData.html
      });

      if (result.success) {
        this.logEmail(user_id, user.email, templateData.subject, 'split_reminder', 'sent');
      }

      return result.success;
    } catch (error) {
      console.error('Failed to send split reminder:', error);
      return false;
    }
  }

  // Send split invitation email
  static async sendSplitInvitation(email, invitationData) {
    try {
      const invitationLink = `${process.env.APP_URL}/splits/invitation/${invitationData.token}`;
      
      const templateData = templates.splitInvitation({
        userName: invitationData.participant_name || 'there',
        email,
        creatorName: invitationData.creator_name,
        amount: invitationData.amount,
        invitationLink
      });

      const result = await sendEmail({
        to: email,
        subject: templateData.subject,
        html: templateData.html
      });

      if (result.success) {
        this.logEmail(null, email, templateData.subject, 'split_invitation', 'sent');
      }

      return result.success;
    } catch (error) {
      console.error('Failed to send split invitation:', error);
      return false;
    }
  }

  // Send recurring transaction created email
  static async sendRecurringCreated(user_id, recurring) {
    try {
      const user = User.findById(user_id);
      if (!user) return false;

      const settings = this.getSettings(user_id);
      if (!settings.email_recurring_reminders) return false;

      const templateData = templates.recurringCreated({
        userName: user.name,
        transactionDescription: recurring.description,
        frequency: recurring.frequency,
        amount: recurring.amount,
        startDate: recurring.start_date
      });

      const result = await sendEmail({
        to: user.email,
        subject: templateData.subject,
        html: templateData.html
      });

      if (result.success) {
        this.logEmail(user_id, user.email, templateData.subject, 'recurring_created', 'sent');
      }

      return result.success;
    } catch (error) {
      console.error('Failed to send recurring created email:', error);
      return false;
    }
  }

  // Send welcome email
  static async sendWelcome(user_id) {
    try {
      const user = User.findById(user_id);
      if (!user) return false;

      const templateData = templates.welcome({
        userName: user.name,
        email: user.email
      });

      const result = await sendEmail({
        to: user.email,
        subject: templateData.subject,
        html: templateData.html
      });

      if (result.success) {
        this.logEmail(user_id, user.email, templateData.subject, 'welcome', 'sent');
      }

      return result.success;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  // Log email sent
  static logEmail(user_id, to_email, subject, email_type, status, error_message = null) {
    try {
      const db = getDb();
      const stmt = db.prepare(`
        INSERT INTO email_logs (user_id, to_email, subject, email_type, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.bind([user_id, to_email, subject, email_type, status, error_message]);
      stmt.step();
      stmt.free();
      save();
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  // Get email logs for user
  static getEmailLogs(user_id, limit = 50) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM email_logs
      WHERE user_id = ?
      ORDER BY sent_at DESC
      LIMIT ?
    `);
    stmt.bind([user_id, limit]);

    const logs = [];
    while (stmt.step()) {
      logs.push(stmt.getAsObject());
    }
    stmt.free();

    return logs;
  }
}

module.exports = NotificationService;
