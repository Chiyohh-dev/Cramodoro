const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

router.post('/signup', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    // Check for validation errors
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

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: { 
          message: 'User with this email already exists',
          status: 400 
        } 
      });
    }

    // Create new user
    const user = new User({
      email,
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        bio: user.bio
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: { 
        message: 'Error creating user. Please try again.',
        status: 500 
      } 
    });
  }
});

router.post('/login', [
  body('usernameOrEmail').notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
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

    const { usernameOrEmail, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: usernameOrEmail.toLowerCase() },
        { username: usernameOrEmail }
      ]
    });

    if (!user) {
      return res.status(401).json({ 
        error: { 
          message: 'Invalid credentials',
          status: 401 
        } 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ 
        error: { 
          message: 'Invalid credentials',
          status: 401 
        } 
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        bio: user.bio
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: { 
        message: `Error logging in: ${error.message}`,
        status: 500 
      } 
    });
  }
});

module.exports = router;
