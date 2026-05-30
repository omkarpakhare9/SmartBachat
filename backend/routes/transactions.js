const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/transactions
// @desc    Get all transactions for a user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const filters = {
      type: type,
      category_id: category,
      start_date: startDate,
      end_date: endDate,
      limit: parseInt(limit),
      offset: (page - 1) * limit
    };

    const [transactions, total] = await Promise.all([
      Transaction.findByUser(req.user.id, filters),
      Transaction.countByUser(req.user.id, { type, category_id: category, start_date: startDate, end_date: endDate })
    ]);

    res.json({
      success: true,
      count: transactions.length,
      total,
      pages: Math.ceil(total / limit),
      data: transactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const transaction = await Transaction.findById(req.params.id, user?.preferredCurrency);

    if (!transaction || transaction.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/transactions
// @desc    Create new transaction
// @access  Private
router.post('/', protect, [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('category').notEmpty().withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    const transaction = await Transaction.create({
      user_id: req.user.id,
      type: req.body.type,
      amount: req.body.amount,
      category_id: req.body.category,
      description: req.body.description,
      date: req.body.date || new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: await Transaction.findById(transaction.id, user?.preferredCurrency)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const existing = await Transaction.findById(req.params.id, user?.preferredCurrency);

    if (!existing || existing.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = await Transaction.update(req.params.id, req.body);

    res.json({
      success: true,
      data: await Transaction.findById(transaction.id, user?.preferredCurrency)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const existing = await Transaction.findById(req.params.id);

    if (!existing || existing.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await Transaction.delete(req.params.id);

    res.json({
      success: true,
      message: 'Transaction deleted'
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
