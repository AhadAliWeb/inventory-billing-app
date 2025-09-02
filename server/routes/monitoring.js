const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('./auth');

// Performance monitoring route
router.get('/performance', requireAuth, requireAdmin, (req, res) => {
  try {
    const metrics = req.app.locals.performanceMonitor.getMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics'
    });
  }
});

// System health check
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
});

// Reset performance metrics (admin only)
router.post('/performance/reset', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    req.app.locals.performanceMonitor.resetMetrics();
    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset performance metrics'
    });
  }
});

module.exports = router;
