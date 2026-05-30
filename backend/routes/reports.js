const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { protect } = require('../middleware/auth');
const Currency = require('../models/Currency');
const User = require('../models/User');

const convertForUser = (amount, user) => Currency.withDisplayAmount(amount, user?.preferredCurrency);

// @route   GET /api/reports/summary
// @desc    Get summary statistics
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const db = getDb();
    const { startDate, endDate } = req.query;
    let query = 'SELECT type, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE user_id = ?';
    const params = [req.user.id];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' GROUP BY type';

    const stmt = db.prepare(query);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    const income = results.find(r => r.type === 'income') || { total: 0, count: 0 };
    const expense = results.find(r => r.type === 'expense') || { total: 0, count: 0 };
    const balance = income.total - expense.total;
    const user = User.findById(req.user.id);
    const incomeDisplay = convertForUser(income.total, user);
    const expenseDisplay = convertForUser(expense.total, user);
    const balanceDisplay = convertForUser(balance, user);

    res.json({
      success: true,
      data: {
        income: income.total,
        expense: expense.total,
        balance,
        displayIncome: incomeDisplay.displayAmount,
        displayExpense: expenseDisplay.displayAmount,
        displayBalance: balanceDisplay.displayAmount,
        displayCurrency: balanceDisplay.displayCurrency,
        displaySymbol: balanceDisplay.displaySymbol,
        incomeCount: income.count,
        expenseCount: expense.count
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/by-category
// @desc    Get transactions grouped by category
// @access  Private
router.get('/by-category', protect, async (req, res) => {
  try {
    const db = getDb();
    const { type, startDate, endDate } = req.query;
    let query = `
      SELECT t.category_id, c.name as categoryName, c.color as categoryColor, c.icon as categoryIcon,
             SUM(t.amount) as total, COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }
    if (startDate) {
      query += ' AND t.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND t.date <= ?';
      params.push(endDate);
    }

    query += ' GROUP BY t.category_id, c.name, c.color, c.icon ORDER BY total DESC';

    const stmt = db.prepare(query);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    const user = User.findById(req.user.id);

    const categoryData = results.map(r => ({
      _id: r.category_id,
      categoryName: r.categoryName,
      categoryColor: r.categoryColor,
      categoryIcon: r.categoryIcon,
      total: r.total,
      displayTotal: convertForUser(r.total, user).displayAmount,
      displayCurrency: user?.preferredCurrency || 'USD',
      count: r.count
    }));

    res.json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/monthly
// @desc    Get monthly trends
// @access  Private
router.get('/monthly', protect, async (req, res) => {
  try {
    const db = getDb();
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const query = `
      SELECT strftime('%m', date) as month, type, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND strftime('%Y', date) = ?
      GROUP BY month, type
      ORDER BY month
    `;

    const stmt = db.prepare(query);
    stmt.bind([req.user.id, currentYear.toString()]);
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0
    }));

    const user = User.findById(req.user.id);
    results.forEach(item => {
      const monthIndex = parseInt(item.month) - 1;
      months[monthIndex][item.type] = item.total;
      months[monthIndex][`display${item.type.charAt(0).toUpperCase()}${item.type.slice(1)}`] = convertForUser(item.total, user).displayAmount;
    });

    months.forEach((month) => {
      month.displayIncome = month.displayIncome || 0;
      month.displayExpense = month.displayExpense || 0;
      month.displayCurrency = user?.preferredCurrency || 'USD';
    });

    res.json({
      success: true,
      data: months
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
