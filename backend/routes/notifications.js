const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendBudgetAlertEmail, sendSplitReminderEmail, sendRecurringReminderEmail } = require('../services/emailService');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get notification settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user.id;
    let settings = await User.getNotificationSettings(userId);
    
    if (!settings) {
      settings = await User.createNotificationSettings(userId);
    }
    
    res.json({
      emailBudgetAlerts: settings.email_budget_alerts === 1,
      emailSplitReminders: settings.email_split_reminders === 1,
      emailRecurringReminders: settings.email_recurring_reminders === 1,
      emailReceipts: settings.email_receipts === 1
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: 'Failed to fetch notification settings' });
  }
});

// Update notification settings
router.put('/settings', [
  body('emailBudgetAlerts').optional().isBoolean(),
  body('emailSplitReminders').optional().isBoolean(),
  body('emailRecurringReminders').optional().isBoolean(),
  body('emailReceipts').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const settings = {
      emailBudgetAlerts: req.body.emailBudgetAlerts !== undefined ? (req.body.emailBudgetAlerts ? 1 : 0) : undefined,
      emailSplitReminders: req.body.emailSplitReminders !== undefined ? (req.body.emailSplitReminders ? 1 : 0) : undefined,
      emailRecurringReminders: req.body.emailRecurringReminders !== undefined ? (req.body.emailRecurringReminders ? 1 : 0) : undefined,
      emailReceipts: req.body.emailReceipts !== undefined ? (req.body.emailReceipts ? 1 : 0) : undefined
    };

    const updatedSettings = await User.updateNotificationSettings(userId, settings);
    
    res.json({
      emailBudgetAlerts: updatedSettings.email_budget_alerts === 1,
      emailSplitReminders: updatedSettings.email_split_reminders === 1,
      emailRecurringReminders: updatedSettings.email_recurring_reminders === 1,
      emailReceipts: updatedSettings.email_receipts === 1
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: 'Failed to update notification settings' });
  }
});

// Send test budget alert email
router.post('/test/budget-alert', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    const testBudgetData = {
      categoryName: 'Food & Dining',
      budgetLimit: 500,
      spentAmount: 550,
      userEmail: user.email
    };

    await sendBudgetAlertEmail(userId, testBudgetData);
    
    res.json({ message: 'Test budget alert email sent successfully' });
  } catch (error) {
    console.error('Error sending test budget alert:', error);
    res.status(500).json({ message: 'Failed to send test budget alert email' });
  }
});

// Send test split reminder email
router.post('/test/split-reminder', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    const testSplitData = {
      expenseName: 'Dinner at Restaurant',
      totalAmount: 120,
      yourShare: 40,
      splitType: 'equal',
      createdBy: 'John Doe',
      participants: [
        { name: 'John Doe', paid: true },
        { name: 'Jane Smith', paid: false },
        { name: user.name, paid: false }
      ],
      userEmail: user.email
    };

    await sendSplitReminderEmail(userId, testSplitData);
    
    res.json({ message: 'Test split reminder email sent successfully' });
  } catch (error) {
    console.error('Error sending test split reminder:', error);
    res.status(500).json({ message: 'Failed to send test split reminder email' });
  }
});

// Get email logs
router.get('/logs', async (req, res) => {
  try {
    const userId = req.user.id;
    const { getDb } = require('../config/database');
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT * FROM email_logs 
      WHERE user_id = ? 
      ORDER BY sent_at DESC 
      LIMIT 50
    `);
    stmt.bind([userId]);
    
    const logs = [];
    while (stmt.step()) {
      logs.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ message: 'Failed to fetch email logs' });
  }
});

module.exports = router;
