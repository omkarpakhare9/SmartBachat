const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Category = require('../models/Category');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', color: '#10B981', icon: 'briefcase' },
  { name: 'Freelance', type: 'income', color: '#3B82F6', icon: 'laptop' },
  { name: 'Investments', type: 'income', color: '#8B5CF6', icon: 'trending-up' },
  { name: 'Other Income', type: 'income', color: '#F59E0B', icon: 'plus-circle' },
  { name: 'Food & Dining', type: 'expense', color: '#EF4444', icon: 'utensils' },
  { name: 'Transportation', type: 'expense', color: '#F97316', icon: 'car' },
  { name: 'Shopping', type: 'expense', color: '#EC4899', icon: 'shopping-bag' },
  { name: 'Entertainment', type: 'expense', color: '#8B5CF6', icon: 'film' },
  { name: 'Bills & Utilities', type: 'expense', color: '#06B6D4', icon: 'file-text' },
  { name: 'Healthcare', type: 'expense', color: '#14B8A6', icon: 'heart' },
  { name: 'Education', type: 'expense', color: '#6366F1', icon: 'book' },
  { name: 'Other Expenses', type: 'expense', color: '#6B7280', icon: 'minus-circle' }
];

// Idempotent — seeds only if the user has zero categories.
// Called from register (new users) and login (backfills existing users
// who registered before category seeding was wired up).
async function ensureDefaultCategories(userId) {
  try {
    const existing = await Category.findByUser(userId);
    if (existing.length > 0) return;
    await Promise.all(
      DEFAULT_CATEGORIES.map(cat =>
        Category.create({ ...cat, user_id: userId, is_default: true })
      )
    );
  } catch (err) {
    console.error(`Failed to seed default categories for user ${userId}:`, err);
  }
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const userExists = await User.findByEmail(email);
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = await User.create({ name, email, password });
    await ensureDefaultCategories(user.id);

    res.status(201).json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency || 'USD'
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

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = User.matchPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Backfill for accounts registered before seeding was in place.
    await ensureDefaultCategories(user.id);

    res.json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency || 'USD'
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

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    // Also backfill here so a stale-token session with a categoryless
    // account can recover without logging out.
    await ensureDefaultCategories(req.user.id);
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency || 'USD'
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

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', require('../middleware/auth').protect, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', require('../middleware/auth').protect, [
  body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name } = req.body;
    const user = await User.updateName(req.user.id, name);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency || 'USD'
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

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', require('../middleware/auth').protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = User.matchPassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    await User.updatePassword(req.user.id, newPassword);

    res.json({
      success: true,
      message: 'Password updated successfully'
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
