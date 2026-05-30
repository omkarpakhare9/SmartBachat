const express = require('express');
const router = express.Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const Split = require('../models/Split');
const SplitParticipant = require('../models/SplitParticipant');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/splits/:id/participants
// @desc    Get all participants for a split
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    // Check if user is the creator
    if (split.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view participants'
      });
    }

    const participants = await SplitParticipant.findBySplit(req.params.id);

    res.json({
      success: true,
      participants
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/splits/:id/participants
// @desc    Add participant to split
// @access  Private
router.post('/', [
  protect,
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('share').isFloat({ min: 0 }).withMessage('Share must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const split = await Split.findById(req.params.id);
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    // Check if user is the creator
    if (split.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage participants'
      });
    }

    const { email, share } = req.body;

    // Check if email already exists in split
    const existingParticipants = await SplitParticipant.findBySplit(req.params.id);
    const emailExists = existingParticipants.some(p => 
      (p.user_email === email || p.email === email) && p.status !== 'removed'
    );

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Participant already in split'
      });
    }

    // Check if user exists
    let user = await User.findByEmail(email);
    
    // Add participant
    const participant = await SplitParticipant.addParticipant({
      split_id: req.params.id,
      user_id: user ? user.id : null,
      email,
      share
    });

    // Create invitation if not existing user
    let invitationToken = null;
    if (!user) {
      invitationToken = await SplitParticipant.createInvitation({
        split_id: req.params.id,
        participant_id: participant.id,
        email
      });
    }

    res.status(201).json({
      success: true,
      participant,
      invitationToken: invitationToken,
      message: user ? 'Participant added successfully' : 'Invitation sent to participant'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/splits/:id/participants/:participantId/share
// @desc    Update participant share
// @access  Private
router.put('/:participantId/share', [
  protect,
  body('share').isFloat({ min: 0 }).withMessage('Share must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const split = await Split.findById(req.params.id);
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    // Check if user is the creator
    if (split.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update participant'
      });
    }

    const participant = await SplitParticipant.findById(req.params.participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    const updatedParticipant = await SplitParticipant.updateShare(
      req.params.participantId,
      req.body.share
    );

    res.json({
      success: true,
      participant: updatedParticipant,
      message: 'Share updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/splits/:id/participants/:participantId
// @desc    Remove participant from split
// @access  Private
router.delete('/:participantId', protect, async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    // Check if user is the creator
    if (split.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove participant'
      });
    }

    const participant = await SplitParticipant.findById(req.params.participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    await SplitParticipant.removeParticipant(req.params.participantId);

    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/splits/:id/participants/:participantId/resend-invitation
// @desc    Resend invitation to participant
// @access  Private
router.post('/:participantId/resend-invitation', protect, async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    // Check if user is the creator
    if (split.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const participant = await SplitParticipant.findById(req.params.participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    if (participant.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Participant has already accepted'
      });
    }

    const token = await SplitParticipant.resendInvitation(req.params.participantId);

    res.json({
      success: true,
      invitationToken: token,
      message: 'Invitation resent successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/splits/invitations/accept
// @desc    Accept split invitation
// @access  Private
router.post('/invitations/accept', protect, [
  body('token').notEmpty().withMessage('Invitation token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token } = req.body;

    const invitation = await SplitParticipant.findInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation'
      });
    }

    // Verify email matches
    if (invitation.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Invitation is for a different email address'
      });
    }

    const participant = await SplitParticipant.acceptInvitation(token, req.user.id);

    res.json({
      success: true,
      participant,
      message: 'Invitation accepted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/splits/invitations/decline
// @desc    Decline split invitation
// @access  Public
router.post('/invitations/decline', [
  body('token').notEmpty().withMessage('Invitation token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token } = req.body;

    const invitation = await SplitParticipant.findInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation'
      });
    }

    await SplitParticipant.declineInvitation(token);

    res.json({
      success: true,
      message: 'Invitation declined'
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
