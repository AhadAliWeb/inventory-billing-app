const { body, param, query, validationResult } = require('express-validator');

// Common validation rules
const commonValidations = {
  id: param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  name: body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be less than 255 characters'),
  email: body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
  phone: body('contact').optional().isMobilePhone().withMessage('Invalid phone number format'),
  price: body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  quantity: body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  date: body('date').optional().isISO8601().toDate().withMessage('Invalid date format')
};

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    next();
  };
};

// Specific validation rules for different entities
const validationRules = {
  // Customer validations
  createCustomer: [
    commonValidations.name,
    commonValidations.email,
    commonValidations.phone,
    body('address').optional().isLength({ max: 500 }).withMessage('Address must be less than 500 characters')
  ],

  updateCustomer: [
    commonValidations.id,
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be less than 255 characters'),
    commonValidations.email,
    commonValidations.phone,
    body('address').optional().isLength({ max: 500 }).withMessage('Address must be less than 500 characters')
  ],

  // Item validations
  createItem: [
    commonValidations.name,
    body('category').trim().isLength({ min: 1, max: 100 }).withMessage('Category is required and must be less than 100 characters'),
    commonValidations.quantity,
    commonValidations.price,
    body('model').optional().isLength({ max: 100 }).withMessage('Model must be less than 100 characters'),
    body('product_type').optional().isLength({ max: 100 }).withMessage('Product type must be less than 100 characters'),
    body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
    body('vendor_id').optional().isInt({ min: 1 }).withMessage('Vendor ID must be a positive integer'),
    body('purchase_price').optional().isFloat({ min: 0 }).withMessage('Purchase price must be a positive number')
  ],

  updateItem: [
    commonValidations.id,
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be less than 255 characters'),
    body('category').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Category must be less than 100 characters'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('model').optional().isLength({ max: 100 }).withMessage('Model must be less than 100 characters'),
    body('product_type').optional().isLength({ max: 100 }).withMessage('Product type must be less than 100 characters'),
    body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
    body('vendor_id').optional().isInt({ min: 1 }).withMessage('Vendor ID must be a positive integer'),
    body('purchase_price').optional().isFloat({ min: 0 }).withMessage('Purchase price must be a positive number')
  ],

  // Vendor validations
  createVendor: [
    commonValidations.name,
    commonValidations.phone,
    body('address').optional().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
    commonValidations.email,
    body('gst_number').optional().isLength({ max: 50 }).withMessage('GST number must be less than 50 characters')
  ],

  // Bill validations
  createBill: [
    body('customer_id').optional().isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
    body('total_amount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('payment_type').isIn(['cash', 'credit']).withMessage('Payment type must be cash or credit'),
    body('payment_status').optional().isIn(['paid', 'partial', 'unpaid']).withMessage('Payment status must be paid, partial, or unpaid'),
    body('amount_paid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be a non-negative number'),
    body('buyer_type').optional().isLength({ max: 100 }).withMessage('Buyer type must be less than 100 characters'),
    body('items').isArray({ min: 1 }).withMessage('Items array is required and must not be empty'),
    body('items.*.item_id').isInt({ min: 1 }).withMessage('Item ID must be a positive integer'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
  ],

  // Expense validations
  createExpense: [
    body('category_id').isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('expense_date').isISO8601().toDate().withMessage('Invalid expense date format'),
    body('payment_method').isIn(['cash', 'bank', 'card', 'upi']).withMessage('Payment method must be cash, bank, card, or upi'),
    body('reference_number').optional().isLength({ max: 100 }).withMessage('Reference number must be less than 100 characters'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
  ],

  // User validations
  createUser: [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('full_name').trim().isLength({ min: 1, max: 255 }).withMessage('Full name is required and must be less than 255 characters'),
    commonValidations.email,
    body('role').isIn(['admin', 'manager', 'staff', 'viewer']).withMessage('Role must be admin, manager, staff, or viewer')
  ],

  // Login validation
  login: [
    body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
  ],

  // Query parameter validations
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort').optional().isIn(['name', 'created_at', 'price', 'quantity']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
  ],

  // Date range validation
  dateRange: [
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format')
  ]
};

// Custom validation for date ranges
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }
    
    // Check if date range is not too large (e.g., more than 1 year)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 365 days'
      });
    }
  }
  
  next();
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Basic XSS prevention
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

module.exports = {
  validate,
  validationRules,
  validateDateRange,
  sanitizeInput
};
