const nodemailer = require('nodemailer');

// Email transporter setup
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  
  let config = {};

  if (emailService === 'gmail') {
    config = {
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
      }
    };
  } else if (emailService === 'smtp') {
    config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };
  } else if (emailService === 'sendgrid') {
    config = {
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    };
  }

  try {
    transporter = nodemailer.createTransport(config);
    console.log('Email transporter configured successfully');
  } catch (error) {
    console.error('Failed to configure email transporter:', error);
  }

  return transporter;
};

// Verify transporter
const verifyTransporter = async () => {
  try {
    const t = getTransporter();
    if (t) {
      await t.verify();
      console.log('Email transporter verified');
      return true;
    }
  } catch (error) {
    console.error('Email transporter verification failed:', error);
  }
  return false;
};

// Send email
const sendEmail = async ({ to, subject, html, text, from }) => {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    const mailOptions = {
      from: from || process.env.EMAIL_FROM || 'noreply@expensetracker.com',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getTransporter,
  verifyTransporter,
  sendEmail
};
