const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Split = require('../models/Split');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/splits
// @desc    Get all splits for a user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const splits = Split.findByCreatedBy(req.user.id);

    res.json({
      success: true,
      count: splits.length,
      data: splits
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/splits
// @desc    Create a new split
// @access  Private
router.post('/', protect, [
  body('transaction').notEmpty().withMessage('Transaction ID is required'),
  body('participants').isArray({ min: 1 }).withMessage('At least one participant is required'),
  body('splitType').isIn(['equal', 'percentage', 'custom']).withMessage('Invalid split type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { transaction, participants, splitType, notes } = req.body;

    // Verify transaction exists and belongs to user
    const transactionDoc = Transaction.findById(transaction);

    if (!transactionDoc || transactionDoc.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Calculate shares based on split type
    let calculatedParticipants = [];
    const totalAmount = transactionDoc.amount;

    if (splitType === 'equal') {
      const share = totalAmount / participants.length;
      calculatedParticipants = participants.map(p => ({
        user: p.user,
        share,
        paid: false
      }));
    } else if (splitType === 'percentage') {
      const totalPercentage = participants.reduce((sum, p) => sum + p.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Percentages must add up to 100%'
        });
      }
      calculatedParticipants = participants.map(p => ({
        user: p.user,
        share: (p.percentage / 100) * totalAmount,
        paid: false
      }));
    } else {
      // Custom
      const totalCustom = participants.reduce((sum, p) => sum + p.share, 0);
      if (Math.abs(totalCustom - totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Custom shares must add up to total amount'
        });
      }
      calculatedParticipants = participants.map(p => ({
        user: p.user,
        share: p.share,
        paid: false
      }));
    }

    const user = User.findById(req.user.id);
    const split = Split.create({
      transaction_id: transaction,
      created_by: req.user.id,
      total_amount: totalAmount,
      split_type: splitType,
      notes,
      participants: calculatedParticipants
    });

    // Mark transaction as split
    Transaction.update(transaction, { is_split: true });

    res.status(201).json({
      success: true,
      data: Split.findById(split._id, user?.preferredCurrency)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/splits/:id/participants/:participantId
// @desc    Mark a participant as paid
// @access  Private
router.put('/:id/participants/:participantId', protect, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    const split = Split.findById(req.params.id, user?.preferredCurrency);

    if (!split || split.createdBy !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    Split.updateParticipantPaid(req.params.id, req.params.participantId);

    res.json({
      success: true,
      data: Split.findById(req.params.id, user?.preferredCurrency)
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
