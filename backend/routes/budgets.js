const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

// @route   GET /api/budgets
// @desc    Get all budgets for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { period } = req.query;
    const budgets = await Budget.findByUser(req.user.id, period);

    res.json({
      success: true,
      budgets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/budgets/:id
// @desc    Get budget by ID
// @access  Private
router.get('/:id(\\d+)', protect, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Check if user owns this budget
    if (budget.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this budget'
      });
    }

    res.json({
      success: true,
      budget
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/budgets
// @desc    Create budget
// @access  Private
router.post('/', [
  protect,
  body('category_id').isInt().withMessage('Category ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('period').optional().isIn(['weekly', 'monthly', 'yearly']).withMessage('Invalid period'),
  body('alert_threshold').optional().isFloat({ min: 0, max: 100 }).withMessage('Alert threshold must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { category_id, amount, period = 'monthly', alert_threshold = 80, alert_enabled = 1 } = req.body;

    // Verify category exists and belongs to user
    const category = await Category.findById(category_id);
    if (!category || category.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if budget already exists for this category and period
    const existingBudget = await Budget.findByUserAndCategory(req.user.id, category_id, period);
    if (existingBudget) {
      return res.status(400).json({
        success: false,
        message: 'Budget already exists for this category and period'
      });
    }

    const budget = await Budget.create({
      user_id: req.user.id,
      category_id,
      amount,
      period,
      alert_threshold,
      alert_enabled
    });

    res.status(201).json({
      success: true,
      budget,
      message: 'Budget created successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/budgets/:id
// @desc    Update budget
// @access  Private
router.put('/:id(\\d+)', [
  protect,
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('alert_threshold').optional().isFloat({ min: 0, max: 100 }).withMessage('Alert threshold must be between 0 and 100'),
  body('alert_enabled').optional().isBoolean().withMessage('Alert enabled must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Check if user owns this budget
    if (budget.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this budget'
      });
    }

    const updatedBudget = await Budget.update(req.params.id, req.body);

    res.json({
      success: true,
      budget: updatedBudget,
      message: 'Budget updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete budget
// @access  Private
router.delete('/:id(\\d+)', protect, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Check if user owns this budget
    if (budget.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this budget'
      });
    }

    await Budget.delete(req.params.id);

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/budgets/alerts/unread
// @desc    Get unread budget alerts
// @access  Private
router.get('/alerts/unread', protect, async (req, res) => {
  try {
    const alerts = await Budget.getUnreadAlerts(req.user.id);

    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/budgets/alerts/:alertId/dismiss
// @desc    Dismiss budget alert
// @access  Private
router.put('/alerts/:alertId/dismiss', protect, async (req, res) => {
  try {
    await Budget.dismissAlert(req.params.alertId);

    res.json({
      success: true,
      message: 'Alert dismissed'
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
