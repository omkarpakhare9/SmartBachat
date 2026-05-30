const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Currency = require('../models/Currency');
const { protect } = require('../middleware/auth');

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  preferredCurrency: user.preferredCurrency || 'USD',
  createdAt: user.createdAt
});

// @route   GET /api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', protect, (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/profile
// @desc    Update user profile (name and email)
// @access  Private
router.put('/', [
  protect,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('preferredCurrency').optional().isLength({ min: 3, max: 3 }).withMessage('Preferred currency must be an ISO code')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, preferredCurrency } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = User.findByEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    let updatedUser = User.findById(req.user.id);

    if (name) {
      updatedUser = User.updateName(req.user.id, name);
    }

    if (email) {
      updatedUser = User.updateEmail(req.user.id, email);
    }

    if (preferredCurrency) {
      const code = Currency.normalizeCode(preferredCurrency);
      if (!Currency.findByCode(code)) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported currency'
        });
      }
      updatedUser = User.updateCurrency(req.user.id, code);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: serializeUser(updatedUser)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/profile/password
// @desc    Change user password
// @access  Private
router.put('/password', [
  protect,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').optional().custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = User.matchPassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    User.updatePassword(req.user.id, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
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
