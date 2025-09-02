const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User } = require('../models/schemas');

// Simple in-memory session store
const sessions = new Map();

// Simplified authentication middleware
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  console.log(token)
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const session = sessions.get(token);
    
    if (!session || session.expires < new Date()) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await User.findById(session.userId).select('username role is_active full_name email');
    
    if (!user || !user.is_active) {
      sessions.delete(token);
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Update last login
    await User.findByIdAndUpdate(session.userId, { last_login: new Date() });

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Simplified role check (admin only)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Simple login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user in database
    const user = await User.findOne({ username, is_active: true });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate simple session token
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session
    sessions.set(sessionToken, {
      userId: user._id,
      expires: expiresAt
    });

    // Update last login
    await User.findByIdAndUpdate(user._id, { last_login: new Date() });

    res.json({
      success: true,
      message: 'Login successful',
      token: sessionToken,
      user: {
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      sessions.delete(token);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user info
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      full_name: req.user.full_name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Get all users (admin only)
router.get('/users', async (req, res) => {

  try {
    const users = await User.find({}, '-password').sort({ username: 1 });
    res.json({ 
      success: true, 
      users: users 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users' 
    });
  }
});

// Create new user (admin only)
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;

    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ error: 'Username, password, full name, and email are required' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      full_name,
      email,
      role: role || 'staff',
      is_active: true
    });

    const savedUser = await newUser.save();

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: savedUser._id,
        username: savedUser.username,
        full_name: savedUser.full_name,
        email: savedUser.email,
        role: savedUser.role,
        is_active: savedUser.is_active,
        created_at: savedUser.created_at
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user status (admin only)
router.put('/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be boolean' });
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === id && !is_active) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { is_active },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove all sessions for deactivated user
    if (!is_active) {
      for (const [token, session] of sessions.entries()) {
        if (session.userId.toString() === id) {
          sessions.delete(token);
        }
      }
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove all sessions for deleted user
    for (const [token, session] of sessions.entries()) {
      if (session.userId.toString() === id) {
        sessions.delete(token);
      }
    }

    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change password
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(req.user._id, { password: hashedNewPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Clean up expired sessions periodically
setInterval(() => {
  const now = new Date();
  for (const [token, session] of sessions.entries()) {
    if (session.expires < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Every hour

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;