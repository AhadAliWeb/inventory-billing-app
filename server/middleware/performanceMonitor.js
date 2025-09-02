const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      dbQueries: 0,
      slowQueries: []
    };
    this.logDir = path.join(__dirname, '..', 'logs');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  // Middleware for request monitoring
  requestMonitor() {
    return (req, res, next) => {
      const startTime = Date.now();
      this.metrics.requests++;

      // Override res.json to capture response time
      const originalJson = res.json;
      res.json = function(data) {
        const responseTime = Date.now() - startTime;
        this.metrics.responseTime.push(responseTime);
        
        // Log slow requests (>1000ms)
        if (responseTime > 1000) {
          this.logSlowRequest(req, responseTime);
        }
        
        return originalJson.call(this, data);
      }.bind(this);

      // Override res.status for error tracking
      const originalStatus = res.status;
      res.status = function(code) {
        if (code >= 400) {
          this.metrics.errors++;
          this.logError(req, code);
        }
        return originalStatus.call(this, code);
      }.bind(this);

      next();
    };
  }

  // Database query monitor
  queryMonitor() {
    return {
      logQuery: (query, duration) => {
        this.metrics.dbQueries++;
        if (duration > 500) { // Log queries taking more than 500ms
          this.metrics.slowQueries.push({
            query: query.substring(0, 100) + '...',
            duration,
            timestamp: new Date().toISOString()
          });
        }
      }
    };
  }

  // Memory usage tracking
  trackMemoryUsage() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: new Date().toISOString(),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024) // MB
    });

    // Keep only last 100 entries
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
  }

  // Log slow requests
  async logSlowRequest(req, responseTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    try {
      const logFile = path.join(this.logDir, 'slow-requests.log');
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to log slow request:', error);
    }
  }

  // Log errors
  async logError(req, statusCode) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.body
    };

    try {
      const logFile = path.join(this.logDir, 'errors.log');
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  // Get performance metrics
  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;

    const currentMemory = process.memoryUsage();
    
    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
      avgResponseTime: Math.round(avgResponseTime),
      dbQueries: this.metrics.dbQueries,
      slowQueries: this.metrics.slowQueries.slice(-10), // Last 10 slow queries
      memoryUsage: {
        current: {
          heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024),
          rss: Math.round(currentMemory.rss / 1024 / 1024)
        },
        history: this.metrics.memoryUsage.slice(-20) // Last 20 entries
      },
      uptime: Math.round(process.uptime())
    };
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      dbQueries: 0,
      slowQueries: []
    };
  }

  // Start periodic memory tracking
  startPeriodicTracking() {
    setInterval(() => {
      this.trackMemoryUsage();
    }, 60000); // Track every minute
  }
}

module.exports = PerformanceMonitor;
