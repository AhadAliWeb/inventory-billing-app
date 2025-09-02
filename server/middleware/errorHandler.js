const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
  constructor() {
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

  // Database error handler - MongoDB specific
  handleDatabaseError(error, operation = 'database operation') {
    const errorInfo = {
      type: 'DATABASE_ERROR',
      operation,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    // Return user-friendly error based on MongoDB error codes
    switch (error.code) {
      case 11000: // MongoDB duplicate key error
        return {
          status: 409,
          message: 'A record with this information already exists',
          code: 'DUPLICATE_ENTRY'
        };
      case 121: // MongoDB document validation failure
        return {
          status: 400,
          message: 'Document validation failed',
          code: 'VALIDATION_ERROR'
        };
      case 2: // MongoDB bad value error
        return {
          status: 400,
          message: 'Invalid data provided',
          code: 'INVALID_DATA'
        };
      case 13: // MongoDB unauthorized
        return {
          status: 401,
          message: 'Database access unauthorized',
          code: 'DB_UNAUTHORIZED'
        };
      case 89: // MongoDB network timeout
        return {
          status: 503,
          message: 'Database connection timeout. Please try again.',
          code: 'DATABASE_TIMEOUT'
        };
      default:
        // Handle MongoDB error names
        if (error.name === 'ValidationError') {
          return {
            status: 400,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR'
          };
        }
        if (error.name === 'CastError') {
          return {
            status: 400,
            message: 'Invalid data format',
            code: 'INVALID_FORMAT'
          };
        }
        if (error.name === 'MongoNetworkError') {
          return {
            status: 503,
            message: 'Database connection failed. Please try again.',
            code: 'DATABASE_CONNECTION_ERROR'
          };
        }
        return {
          status: 500,
          message: 'An unexpected database error occurred',
          code: 'DATABASE_ERROR'
        };
    }
  }

  // Authentication error handler
  handleAuthError(error) {
    const errorInfo = {
      type: 'AUTH_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    return {
      status: 401,
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    };
  }

  // Validation error handler
  handleValidationError(errors) {
    const errorInfo = {
      type: 'VALIDATION_ERROR',
      errors: errors,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    return {
      status: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    };
  }

  // File operation error handler
  handleFileError(error, operation = 'file operation') {
    const errorInfo = {
      type: 'FILE_ERROR',
      operation,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    switch (error.code) {
      case 'ENOENT':
        return {
          status: 404,
          message: 'File not found',
          code: 'FILE_NOT_FOUND'
        };
      case 'EACCES':
        return {
          status: 403,
          message: 'Permission denied',
          code: 'PERMISSION_DENIED'
        };
      case 'ENOSPC':
        return {
          status: 507,
          message: 'Insufficient storage space',
          code: 'STORAGE_FULL'
        };
      default:
        return {
          status: 500,
          message: 'File operation failed',
          code: 'FILE_ERROR'
        };
    }
  }

  // Network error handler
  handleNetworkError(error) {
    const errorInfo = {
      type: 'NETWORK_ERROR',
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    return {
      status: 503,
      message: 'Network operation failed. Please check your connection.',
      code: 'NETWORK_ERROR'
    };
  }

  // Generic error handler
  handleGenericError(error, context = 'operation') {
    const errorInfo = {
      type: 'GENERIC_ERROR',
      context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    return {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    };
  }

  // Log error to file
  async logError(errorInfo) {
    try {
      const logFile = path.join(this.logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
      const logEntry = JSON.stringify(errorInfo) + '\n';
      await fs.appendFile(logFile, logEntry);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  // Express error middleware
  middleware() {
    return (error, req, res, next) => {
      console.error('Error occurred:', error);

      let errorResponse;

      // Handle different types of errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError' || error.code === 11000) {
        errorResponse = this.handleDatabaseError(error, `${req.method} ${req.path}`);
      } else if (error.name === 'ValidationError') {
        errorResponse = this.handleValidationError(error.details || []);
      } else if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
        errorResponse = this.handleAuthError(error);
      } else if (error.code && ['ENOENT', 'EACCES', 'ENOSPC'].includes(error.code)) {
        errorResponse = this.handleFileError(error, `${req.method} ${req.path}`);
      } else if (error.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
        errorResponse = this.handleNetworkError(error);
      } else {
        errorResponse = this.handleGenericError(error, `${req.method} ${req.path}`);
      }

      // Add request context to error log
      const contextInfo = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      };

      this.logError({ ...errorResponse, context: contextInfo });

      res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message,
        code: errorResponse.code,
        ...(errorResponse.details && { details: errorResponse.details }),
        timestamp: new Date().toISOString()
      });
    };
  }

  // Async error wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Get error statistics
  async getErrorStats(days = 7) {
    try {
      const stats = {
        totalErrors: 0,
        errorsByType: {},
        errorsByDay: {},
        recentErrors: []
      };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const logFile = path.join(this.logDir, `error-${dateStr}.log`);
        
        try {
          const content = await fs.readFile(logFile, 'utf8');
          const lines = content.trim().split('\n').filter(line => line);
          
          stats.errorsByDay[dateStr] = lines.length;
          stats.totalErrors += lines.length;

          lines.forEach(line => {
            try {
              const error = JSON.parse(line);
              stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
              
              if (stats.recentErrors.length < 10) {
                stats.recentErrors.push(error);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          });
        } catch (fileError) {
          // File doesn't exist for this date
          stats.errorsByDay[dateStr] = 0;
        }
      }

      // Sort recent errors by timestamp
      stats.recentErrors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        totalErrors: 0,
        errorsByType: {},
        errorsByDay: {},
        recentErrors: []
      };
    }
  }
}

module.exports = ErrorHandler;
