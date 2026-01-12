const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        error: { 
          message: 'User not found',
          status: 404 
        } 
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: { 
        message: 'Error fetching profile',
        status: 500 
      } 
    });
  }
});

router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be between 1 and 50 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('fontSize').optional().isInt({ min: 10, max: 24 }).withMessage('Font size must be between 10 and 24'),
  body('profilePicture').optional().isString().withMessage('Profile picture must be a valid string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { 
          message: errors.array()[0].msg,
          status: 400,
          errors: errors.array()
        } 
      });
    }

    const { name, bio, fontSize, profilePicture } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (fontSize !== undefined) updateFields.fontSize = fontSize;
    if (profilePicture !== undefined) updateFields.profilePicture = profilePicture;
    updateFields.updatedAt = Date.now();

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        error: { 
          message: 'User not found',
          status: 404 
        } 
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: { 
        message: 'Error updating profile',
        status: 500 
      } 
    });
  }
});

// @route   DELETE /api/users/profile
// @desc    Delete user account
// @access  Private
router.delete('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);

    if (!user) {
      return res.status(404).json({ 
        error: { 
          message: 'User not found',
          status: 404 
        } 
      });
    }

    res.json({ 
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      error: { 
        message: 'Error deleting account',
        status: 500 
      } 
    });
  }
});

module.exports = router;
