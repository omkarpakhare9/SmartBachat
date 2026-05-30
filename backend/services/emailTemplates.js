// Email templates for different notification types

const templates = {
  // Budget alert template
  budgetAlert: ({ userName, categoryName, spentAmount, budgetAmount, percentage }) => {
    return {
      subject: `⚠️ Budget Alert: ${categoryName} Budget`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .alert-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 15px 0; border-radius: 3px; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin-top: 15px; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Budget Alert</h2>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>You're approaching your budget limit for <strong>${categoryName}</strong>.</p>
              <div class="alert-box">
                <p><strong>Category:</strong> ${categoryName}</p>
                <p><strong>Amount Spent:</strong> $${spentAmount.toFixed(2)}</p>
                <p><strong>Budget Limit:</strong> $${budgetAmount.toFixed(2)}</p>
                <p><strong>Usage:</strong> ${percentage.toFixed(1)}%</p>
              </div>
              <p>Consider reviewing your expenses in this category to avoid exceeding your budget.</p>
              <a href="${process.env.APP_URL}/budgets" class="button">View Budgets</a>
              <div class="footer">
                <p>This is an automated message from Expense Tracker. You can disable these notifications in your settings.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  // Split reminder template
  splitReminder: ({ userName, creatorName, amount, splitDescription, participantCount }) => {
    return {
      subject: `💰 Expense Split Reminder: ${splitDescription || 'Shared Expense'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .split-box { background: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 15px 0; border-radius: 3px; }
            .button { display: inline-block; background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin-top: 15px; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Expense Split Reminder</h2>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p><strong>${creatorName}</strong> has shared an expense with you.</p>
              <div class="split-box">
                <p><strong>Description:</strong> ${splitDescription || 'Shared Expense'}</p>
                <p><strong>Total Amount:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Participants:</strong> ${participantCount} people</p>
              </div>
              <p>Check the split details and mark your portion as paid if applicable.</p>
              <a href="${process.env.APP_URL}/splits" class="button">View Splits</a>
              <div class="footer">
                <p>This is an automated message from Expense Tracker.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  // Split invitation template
  splitInvitation: ({ userName, email, creatorName, amount, invitationLink }) => {
    return {
      subject: `✉️ You've been invited to a split expense!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8B5CF6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .invite-box { background: #F3E8FF; border-left: 4px solid #8B5CF6; padding: 15px; margin: 15px 0; border-radius: 3px; }
            .button { display: inline-block; background: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin-top: 15px; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>You're Invited!</h2>
            </div>
            <div class="content">
              <p>Hi,</p>
              <p><strong>${creatorName}</strong> has invited you to join a shared expense!</p>
              <div class="invite-box">
                <p><strong>Expense Amount:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Invitation for:</strong> ${email}</p>
              </div>
              <p>Click the button below to accept this invitation and join the expense split.</p>
              <a href="${invitationLink}" class="button">Accept Invitation</a>
              <p style="font-size: 12px; color: #999; margin-top: 15px;">
                If the button doesn't work, copy and paste this link in your browser:<br>
                <code style="background: #eee; padding: 5px; border-radius: 3px;">${invitationLink}</code>
              </p>
              <p>This invitation will expire in 7 days.</p>
              <div class="footer">
                <p>This is an automated message from Expense Tracker.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  // Recurring transaction created template
  recurringCreated: ({ userName, transactionDescription, frequency, amount, startDate }) => {
    return {
      subject: `🔄 Recurring Transaction Set Up: ${transactionDescription}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #06B6D4; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .recurring-box { background: #ECFDF5; border-left: 4px solid #06B6D4; padding: 15px; margin: 15px 0; border-radius: 3px; }
            .button { display: inline-block; background: #06B6D4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin-top: 15px; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Recurring Transaction Set Up</h2>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your recurring transaction has been successfully created!</p>
              <div class="recurring-box">
                <p><strong>Description:</strong> ${transactionDescription}</p>
                <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Frequency:</strong> ${frequency}</p>
                <p><strong>Start Date:</strong> ${startDate}</p>
              </div>
              <p>This transaction will be automatically created on the specified schedule.</p>
              <a href="${process.env.APP_URL}/recurring" class="button">Manage Recurring</a>
              <div class="footer">
                <p>This is an automated message from Expense Tracker. You can manage recurring transactions in your dashboard.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  // Welcome email template
  welcome: ({ userName, email }) => {
    return {
      subject: `Welcome to Expense Tracker!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin-top: 15px; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
            .feature-list { margin: 15px 0; }
            .feature-list li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Welcome to Expense Tracker!</h2>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We're excited to have you on board! Your account has been successfully created.</p>
              <p><strong>Account Email:</strong> ${email}</p>
              <p><strong>Key Features:</strong></p>
              <ul class="feature-list">
                <li>✓ Track your income and expenses</li>
                <li>✓ Organize transactions by category</li>
                <li>✓ Create and manage budgets</li>
                <li>✓ Split expenses with friends</li>
                <li>✓ Generate detailed financial reports</li>
                <li>✓ Upload and store receipts</li>
              </ul>
              <a href="${process.env.APP_URL}/dashboard" class="button">Get Started</a>
              <div class="footer">
                <p>Need help? Contact our support team.</p>
                <p>This is an automated message from Expense Tracker.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }
};

module.exports = templates;
