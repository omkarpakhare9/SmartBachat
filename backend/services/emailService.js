const { sendEmail } = require('../config/mailer');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { getDb, save } = require('../config/database');

const loadTemplate = (templateName, replacements) => {
  const templatePath = path.join(__dirname, `../templates/${templateName}.html`);
  let template = fs.readFileSync(templatePath, 'utf8');
  
  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  return template;
};

const logEmail = (userId, toEmail, subject, emailType, status, errorMessage = null) => {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO email_logs (user_id, to_email, subject, email_type, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.bind([userId, toEmail, subject, emailType, status, errorMessage]);
  stmt.step();
  stmt.free();
  save();
};

const sendBudgetAlertEmail = async (userId, budgetData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const notificationSettings = await User.getNotificationSettings(userId);
    if (!notificationSettings || !notificationSettings.email_budget_alerts) {
      console.log('Budget alerts disabled for user:', userId);
      return null;
    }

    const percentageUsed = Math.round((budgetData.spentAmount / budgetData.budgetLimit) * 100);
    const overBudgetAmount = budgetData.spentAmount - budgetData.budgetLimit;

    const html = loadTemplate('budget-alert', {
      userName: user.name,
      categoryName: budgetData.categoryName,
      budgetLimit: `$${budgetData.budgetLimit.toFixed(2)}`,
      amountSpent: `$${budgetData.spentAmount.toFixed(2)}`,
      overBudgetAmount: `$${overBudgetAmount.toFixed(2)}`,
      percentageUsed: percentageUsed,
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    });

    const result = await sendEmail({
      to: user.email,
      subject: `⚠️ Budget Alert: You've exceeded your ${budgetData.categoryName} budget`,
      html,
      text: `You have exceeded your budget for ${budgetData.categoryName}. Spent: $${budgetData.spentAmount.toFixed(2)}, Budget: $${budgetData.budgetLimit.toFixed(2)}`
    });

    if (result?.success === false) {
      throw new Error(result.error || 'Email provider failed');
    }

    logEmail(userId, user.email, `Budget Alert: You've exceeded your ${budgetData.categoryName} budget`, 'budget_alert', 'sent');
    return result;
  } catch (error) {
    console.error('Error sending budget alert email:', error);
    logEmail(userId, budgetData.userEmail, 'Budget Alert', 'budget_alert', 'failed', error.message);
    throw error;
  }
};

const sendSplitReminderEmail = async (userId, splitData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const notificationSettings = await User.getNotificationSettings(userId);
    if (!notificationSettings || !notificationSettings.email_split_reminders) {
      console.log('Split reminders disabled for user:', userId);
      return null;
    }

    const participantsList = splitData.participants.map(p => `
      <div class="participant-item">
        <span>${p.name || p.email}</span>
        <span class="${p.paid ? 'status-paid' : 'status-pending'}">${p.paid ? 'Paid' : 'Pending'}</span>
      </div>
    `).join('');

    const html = loadTemplate('split-reminder', {
      userName: user.name,
      expenseName: splitData.expenseName,
      totalAmount: `$${splitData.totalAmount.toFixed(2)}`,
      yourShare: `$${splitData.yourShare.toFixed(2)}`,
      splitType: splitData.splitType,
      createdBy: splitData.createdBy,
      participantsList,
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    });

    const result = await sendEmail({
      to: user.email,
      subject: `💰 Split Reminder: Payment pending for ${splitData.expenseName}`,
      html,
      text: `You have a pending payment of $${splitData.yourShare.toFixed(2)} for ${splitData.expenseName}. Total: $${splitData.totalAmount.toFixed(2)}`
    });

    if (result?.success === false) {
      throw new Error(result.error || 'Email provider failed');
    }

    logEmail(userId, user.email, `Split Reminder: Payment pending for ${splitData.expenseName}`, 'split_reminder', 'sent');
    return result;
  } catch (error) {
    console.error('Error sending split reminder email:', error);
    logEmail(userId, splitData.userEmail, 'Split Reminder', 'split_reminder', 'failed', error.message);
    throw error;
  }
};

const sendRecurringReminderEmail = async (userId, recurringData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const notificationSettings = await User.getNotificationSettings(userId);
    if (!notificationSettings || !notificationSettings.email_recurring_reminders) {
      console.log('Recurring reminders disabled for user:', userId);
      return null;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3498db;">🔄 Recurring Transaction Reminder</h2>
        <p>Hello ${user.name},</p>
        <p>This is a reminder that your recurring transaction is due soon:</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>${recurringData.type === 'income' ? 'Income' : 'Expense'}:</strong> ${recurringData.description}</p>
          <p><strong>Amount:</strong> $${recurringData.amount.toFixed(2)}</p>
          <p><strong>Category:</strong> ${recurringData.categoryName}</p>
          <p><strong>Frequency:</strong> ${recurringData.frequency}</p>
          <p><strong>Next Date:</strong> ${new Date(recurringData.nextDate).toLocaleDateString()}</p>
        </div>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 4px;">View Details</a>
      </div>
    `;

    const result = await sendEmail({
      to: user.email,
      subject: `🔄 Recurring Transaction Reminder: ${recurringData.description}`,
      html,
      text: `Your recurring ${recurringData.type} of $${recurringData.amount.toFixed(2)} for ${recurringData.description} is due on ${new Date(recurringData.nextDate).toLocaleDateString()}`
    });

    if (result?.success === false) {
      throw new Error(result.error || 'Email provider failed');
    }

    logEmail(userId, user.email, `Recurring Transaction Reminder: ${recurringData.description}`, 'recurring_reminder', 'sent');
    return result;
  } catch (error) {
    console.error('Error sending recurring reminder email:', error);
    logEmail(userId, recurringData.userEmail, 'Recurring Reminder', 'recurring_reminder', 'failed', error.message);
    throw error;
  }
};

module.exports = {
  sendBudgetAlertEmail,
  sendSplitReminderEmail,
  sendRecurringReminderEmail
};
