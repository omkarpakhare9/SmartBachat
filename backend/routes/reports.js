const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { protect } = require('../middleware/auth');
const Currency = require('../models/Currency');
const User = require('../models/User');

const convertForUser = (amount, user) => Currency.withDisplayAmount(amount, user?.preferredCurrency);

// @route   GET /api/reports/summary
// @desc    Get summary statistics
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const pool = getPool();
    const { startDate, endDate } = req.query;
    let query = 'SELECT type, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      query += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ' GROUP BY type';

    const { rows: results } = await pool.query(query, params);

    const income = results.find(r => r.type === 'income') || { total: 0, count: 0 };
    const expense = results.find(r => r.type === 'expense') || { total: 0, count: 0 };
    const incomeTotal = Number(income.total || 0);
    const expenseTotal = Number(expense.total || 0);
    const balance = incomeTotal - expenseTotal;
    const user = await User.findById(req.user.id);
    const incomeDisplay = await convertForUser(incomeTotal, user);
    const expenseDisplay = await convertForUser(expenseTotal, user);
    const balanceDisplay = await convertForUser(balance, user);

    res.json({
      success: true,
      data: {
        income: incomeTotal,
        expense: expenseTotal,
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
    const pool = getPool();
    const { type, startDate, endDate } = req.query;
    let query = `
      SELECT t.category_id, c.name as "categoryName", c.color as "categoryColor", c.icon as "categoryIcon",
             SUM(t.amount) as total, COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (startDate) {
      query += ` AND t.date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      query += ` AND t.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ' GROUP BY t.category_id, c.name, c.color, c.icon ORDER BY total DESC';

    const { rows: results } = await pool.query(query, params);
    const user = await User.findById(req.user.id);

    const categoryData = await Promise.all(results.map(async (r) => {
      const display = await convertForUser(Number(r.total || 0), user);

      return {
        _id: r.category_id,
        categoryName: r.categoryName,
        categoryColor: r.categoryColor,
        categoryIcon: r.categoryIcon,
        total: Number(r.total || 0),
        displayTotal: display.displayAmount,
        displayCurrency: display.displayCurrency,
        count: Number(r.count || 0)
      };
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
    const pool = getPool();
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const query = `
      SELECT EXTRACT(MONTH FROM date)::int as month, type, SUM(amount) as total
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date)::int = $2
      GROUP BY month, type
      ORDER BY month
    `;

    const { rows: results } = await pool.query(query, [req.user.id, currentYear]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0
    }));

    const user = await User.findById(req.user.id);
    for (const item of results) {
      const monthIndex = parseInt(item.month) - 1;
      const total = Number(item.total || 0);
      const display = await convertForUser(total, user);
      months[monthIndex][item.type] = total;
      months[monthIndex][`display${item.type.charAt(0).toUpperCase()}${item.type.slice(1)}`] = display.displayAmount;
    }

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
