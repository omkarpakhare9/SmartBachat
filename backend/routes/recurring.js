const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const RecurringTransaction = require('../models/RecurringTransaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

// @route   GET /api/recurring
// @desc    Get all recurring transactions for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { active } = req.query;
    let isActive = null;
    if (active !== undefined) {
      isActive = active === 'true' ? 1 : 0;
    }

    const recurringTransactions = await RecurringTransaction.findByUser(req.user.id, isActive);

    res.json({
      success: true,
      recurringTransactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/recurring/:id
// @desc    Get recurring transaction by ID
// @access  Private
router.get('/:id(\\d+)', protect, async (req, res) => {
  try {
    const recurring = await RecurringTransaction.findById(req.params.id);

    if (!recurring) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    // Check if user owns this
    if (recurring.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this'
      });
    }

    // Get instances
    const instances = await RecurringTransaction.getInstances(req.params.id);

    res.json({
      success: true,
      recurring,
      instances
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/recurring
// @desc    Create recurring transaction
// @access  Private
router.post('/', [
  protect,
  body('category_id').isInt().withMessage('Category ID is required'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('frequency').isIn(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid frequency'),
  body('start_date').isISO8601().withMessage('Start date must be valid'),
  body('end_date').optional().isISO8601().withMessage('End date must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      category_id,
      type,
      amount,
      description,
      frequency,
      start_date,
      end_date,
      day_of_week,
      day_of_month
    } = req.body;

    // Verify category exists and belongs to user
    const category = await Category.findById(category_id);
    if (!category || category.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validate day_of_week and day_of_month based on frequency
    if (frequency === 'weekly' && day_of_week === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Day of week is required for weekly frequency'
      });
    }

    if ((frequency === 'monthly' || frequency === 'quarterly') && day_of_month === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Day of month is required for this frequency'
      });
    }

    const recurring = await RecurringTransaction.create({
      user_id: req.user.id,
      category_id,
      type,
      amount,
      description,
      frequency,
      start_date: start_date.split('T')[0], // Get just the date part
      end_date: end_date ? end_date.split('T')[0] : null,
      day_of_week,
      day_of_month
    });

    res.status(201).json({
      success: true,
      recurring,
      message: 'Recurring transaction created successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/recurring/:id
// @desc    Update recurring transaction
// @access  Private
router.put('/:id(\\d+)', [
  protect,
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('end_date').optional().isISO8601().withMessage('End date must be valid'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const recurring = await RecurringTransaction.findById(req.params.id);
    if (!recurring) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    // Check if user owns this
    if (recurring.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this'
      });
    }

    const updatedRecurring = await RecurringTransaction.update(req.params.id, {
      amount: req.body.amount,
      description: req.body.description,
      end_date: req.body.end_date ? req.body.end_date.split('T')[0] : undefined,
      is_active: req.body.is_active,
      day_of_week: req.body.day_of_week,
      day_of_month: req.body.day_of_month
    });

    res.json({
      success: true,
      recurring: updatedRecurring,
      message: 'Recurring transaction updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/recurring/:id
// @desc    Delete recurring transaction
// @access  Private
router.delete('/:id(\\d+)', protect, async (req, res) => {
  try {
    const recurring = await RecurringTransaction.findById(req.params.id);
    if (!recurring) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    // Check if user owns this
    if (recurring.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this'
      });
    }

    await RecurringTransaction.delete(req.params.id);

    res.json({
      success: true,
      message: 'Recurring transaction deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/recurring/process/run
// @desc    Process recurring transactions (for scheduler)
// @access  Public (should be called by a cron job or scheduler)
router.post('/process/run', async (req, res) => {
  try {
    // In production, this should be secured with a shared secret
    const count = await RecurringTransaction.processRecurring();

    res.json({
      success: true,
      message: `Processed ${count} recurring transactions`,
      count
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
