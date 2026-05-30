const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Currency = require('../models/Currency');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const serializePreference = (user) => ({
  preferredCurrency: user.preferredCurrency || 'USD'
});

// @route   GET /api/currencies
// @desc    List supported currencies and cached exchange rates
// @access  Private
router.get('/', protect, (req, res) => {
  res.json({
    success: true,
    baseCurrency: process.env.BASE_CURRENCY || 'USD',
    data: Currency.findAll()
  });
});

// @route   POST /api/currencies/refresh
// @desc    Refresh exchange rates from exchangerate-api or compatible provider
// @access  Private
router.post('/refresh', protect, async (req, res) => {
  try {
    const currencies = await Currency.refreshRates();
    res.json({
      success: true,
      message: 'Exchange rates refreshed successfully',
      data: currencies
    });
  } catch (error) {
    console.error('Failed to refresh exchange rates:', error);
    res.status(502).json({
      success: false,
      message: 'Failed to refresh exchange rates'
    });
  }
});

// @route   POST /api/currencies/convert
// @desc    Convert an amount between supported currencies
// @access  Private
router.post('/convert', [
  protect,
  body('amount').isFloat().withMessage('Amount must be a number'),
  body('from').optional().isLength({ min: 3, max: 3 }).withMessage('Source currency must be an ISO code'),
  body('to').optional().isLength({ min: 3, max: 3 }).withMessage('Target currency must be an ISO code')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const user = User.findById(req.user.id);
  const from = req.body.from || process.env.BASE_CURRENCY || 'USD';
  const to = req.body.to || user?.preferredCurrency || 'USD';
  const convertedAmount = Currency.convert(req.body.amount, from, to);

  res.json({
    success: true,
    data: {
      amount: Number(req.body.amount),
      from: Currency.normalizeCode(from),
      to: Currency.normalizeCode(to),
      convertedAmount
    }
  });
});

// @route   GET /api/currencies/preference
// @desc    Get current user's currency preference
// @access  Private
router.get('/preference', protect, (req, res) => {
  const user = User.findById(req.user.id);
  res.json({
    success: true,
    data: serializePreference(user)
  });
});

// @route   PUT /api/currencies/preference
// @desc    Update current user's currency preference
// @access  Private
router.put('/preference', [
  protect,
  body('preferredCurrency').isLength({ min: 3, max: 3 }).withMessage('Preferred currency must be an ISO code')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const code = Currency.normalizeCode(req.body.preferredCurrency);
  if (!Currency.findByCode(code)) {
    return res.status(400).json({
      success: false,
      message: 'Unsupported currency'
    });
  }

  const user = User.updateCurrency(req.user.id, code);
  res.json({
    success: true,
    message: 'Currency preference updated successfully',
    data: serializePreference(user)
  });
});

module.exports = router;
