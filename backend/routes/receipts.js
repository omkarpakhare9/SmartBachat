const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Receipt = require('../models/Receipt');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { getMulterInstance } = require('../config/storage');
const fs = require('fs');
const path = require('path');

const upload = getMulterInstance();

// @route   GET /api/receipts
// @desc    Get all receipts for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const receipts = await Receipt.findByUser(req.user.id, limit);

    res.json({
      success: true,
      receipts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/receipts/transaction/:transactionId
// @desc    Get receipts for a specific transaction
// @access  Private
router.get('/transaction/:transactionId', protect, async (req, res) => {
  try {
    // Verify user owns this transaction
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction || transaction.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view receipts for this transaction'
      });
    }

    const receipts = await Receipt.findByTransaction(req.params.transactionId);

    res.json({
      success: true,
      receipts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/receipts/transaction/:transactionId/upload
// @desc    Upload receipt for transaction
// @access  Private
router.post('/transaction/:transactionId/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    // Verify user owns this transaction
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction || transaction.user !== req.user.id) {
      // Delete uploaded file if not authorized
      if (req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload receipt for this transaction'
      });
    }

    // Determine file URL
    let file_url;
    let storage_type;

    if (req.file.location) {
      // S3 storage
      file_url = req.file.location;
      storage_type = 's3';
    } else {
      // Local storage
      file_url = `/uploads/receipts/${req.file.filename}`;
      storage_type = 'local';
    }

    // Create receipt record
    const receipt = await Receipt.create({
      transaction_id: req.params.transactionId,
      user_id: req.user.id,
      file_url,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      storage_type
    });

    res.status(201).json({
      success: true,
      receipt,
      message: 'Receipt uploaded successfully'
    });
  } catch (error) {
    console.error(error);
    
    // Delete uploaded file on error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload receipt'
    });
  }
});

// @route   GET /api/receipts/:id
// @desc    Get receipt by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Check if user owns this receipt
    if (receipt.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this receipt'
      });
    }

    res.json({
      success: true,
      receipt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/receipts/:id
// @desc    Delete receipt
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Check if user owns this receipt
    if (receipt.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this receipt'
      });
    }

    // Delete file if it's local storage
    if (receipt.storage_type === 'local') {
      const uploadDir = path.join(__dirname, '../uploads/receipts');
      const filePath = path.join(uploadDir, path.basename(receipt.file_url));
      
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
    }

    // Delete receipt record
    await Receipt.delete(req.params.id);

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/receipts/:id/download
// @desc    Download receipt file
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Check if user owns this receipt
    if (receipt.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this receipt'
      });
    }

    if (receipt.storage_type === 'local') {
      const uploadDir = path.join(__dirname, '../uploads/receipts');
      const filePath = path.join(uploadDir, path.basename(receipt.file_url));

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      res.download(filePath, receipt.file_name);
    } else {
      // For S3, redirect to the file URL
      res.redirect(receipt.file_url);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
