const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        error: { 
          message: 'No authentication token, access denied',
          status: 401 
        } 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ 
        error: { 
          message: 'User not found, token invalid',
          status: 401 
        } 
      });
    }

    req.user = user;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: { 
          message: 'Invalid token',
          status: 401 
        } 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: { 
          message: 'Token expired',
          status: 401 
        } 
      });
    }

    res.status(500).json({ 
      error: { 
        message: 'Server error in authentication',
        status: 500 
      } 
    });
  }
};

module.exports = auth;
