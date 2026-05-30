const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

// @route   GET /api/categories
// @desc    Get all categories for a user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type } = req.query;
    const categories = await Category.findByUser(req.user.id, { type });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/categories
// @desc    Create new category
// @access  Private
router.post('/', protect, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const category = await Category.create({
      ...req.body,
      user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error(error);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify default categories'
      });
    }

    const updated = await Category.update(req.params.id, req.body);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.user !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default categories'
      });
    }

    await Category.delete(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted'
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
