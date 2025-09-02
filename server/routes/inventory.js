const express = require('express');
const { body, validationResult } = require('express-validator');
const { Inventory, Vendor } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');
const router = express.Router();

// Validation middleware for laptop charger inventory
const validateItem = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be less than 255 characters'),
  body('category').trim().isLength({ min: 1, max: 100 }).withMessage('Category is required'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Min stock level must be a non-negative integer'),
  body('max_stock_level').optional().isInt({ min: 0 }).withMessage('Max stock level must be a non-negative integer'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('unit').optional().trim().isLength({ max: 50 }).withMessage('Unit must be less than 50 characters'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be less than 100 characters'),
  body('supplier').optional().trim().isLength({ max: 100 }).withMessage('Supplier must be less than 100 characters'),
  body('barcode').optional().trim().isLength({ max: 100 }).withMessage('Barcode must be less than 100 characters'),
  body('image_url').optional().isURL().withMessage('Image URL must be a valid URL')
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      details: errors.array() 
    });
  }
  next();
};

// Get all items
router.get('/', requireAuth, async (req, res) => {
  const { search, category } = req.query;
  
  try {
    let filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    const items = await Inventory.find(filter)
      .sort({ name: 1 });
    
    res.json(items);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add new item (allow staff to add items too)
router.post('/', requireAuth, validateItem, handleValidation, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      quantity,
      unit,
      cost_price,
      selling_price,
      min_stock_level,
      max_stock_level,
      location,
      supplier,
      barcode,
      image_url
    } = req.body;

    // Check if item with same name or barcode already exists
    const existingItem = await Inventory.findOne({
      $or: [
        { name: { $regex: `^${name}$`, $options: 'i' } },
        ...(barcode ? [{ barcode }] : [])
      ]
    });

    if (existingItem) {
      return res.status(400).json({ 
        error: 'Item with this name or barcode already exists' 
      });
    }

    const newItem = new Inventory({
      name: name.trim(),
      description: description?.trim() || '',
      category: category.trim(),
      quantity: parseInt(quantity) || 0,
      unit: unit?.trim() || 'Units',
      cost_price: parseFloat(cost_price) || 0,
      selling_price: parseFloat(selling_price),
      min_stock_level: parseInt(min_stock_level) || 10,
      max_stock_level: parseInt(max_stock_level) || 1000,
      location: location?.trim() || '',
      supplier: supplier?.trim() || '',
      barcode: barcode?.trim() || '',
      image_url: image_url?.trim() || '',
      created_at: new Date(),
      updated_at: new Date()
    });

    const savedItem = await newItem.save();
    
    console.log('New item added:', savedItem.name);
    res.status(201).json(savedItem);
  } catch (err) {
    console.error('Error adding item:', err);
    if (err.code === 11000) {
      res.status(400).json({ error: 'Item with this name or barcode already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Update item (allow staff to edit items too)
router.put('/:id', requireAuth, validateItem, handleValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      quantity,
      unit,
      cost_price,
      selling_price,
      min_stock_level,
      max_stock_level,
      location,
      supplier,
      barcode,
      image_url
    } = req.body;

    // Check if another item with same name or barcode exists (excluding current item)
    const existingItem = await Inventory.findOne({
      _id: { $ne: id },
      $or: [
        { name: { $regex: `^${name}$`, $options: 'i' } },
        ...(barcode ? [{ barcode }] : [])
      ]
    });

    if (existingItem) {
      return res.status(400).json({ 
        error: 'Another item with this name or barcode already exists' 
      });
    }

    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || '',
        category: category.trim(),
        quantity: parseInt(quantity) || 0,
        unit: unit?.trim() || 'Units',
        cost_price: parseFloat(cost_price) || 0,
        selling_price: parseFloat(selling_price),
        min_stock_level: parseInt(min_stock_level) || 10,
        max_stock_level: parseInt(max_stock_level) || 1000,
        location: location?.trim() || '',
        supplier: supplier?.trim() || '',
        barcode: barcode?.trim() || '',
        image_url: image_url?.trim() || '',
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    console.log('Item updated:', updatedItem.name);
    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating item:', err);
    if (err.code === 11000) {
      res.status(400).json({ error: 'Item with this name or barcode already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Delete item
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedItem = await Inventory.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    console.log('Item deleted:', deletedItem.name);
    res.json({ message: 'Item deleted successfully', item: deletedItem });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get inventory stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalItems = await Inventory.countDocuments();
    const lowStockItems = await Inventory.countDocuments({
      $expr: { $lte: ['$quantity', '$min_stock_level'] }
    });
    
    const valueStats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$selling_price'] } },
          totalCost: { $sum: { $multiply: ['$quantity', '$cost_price'] } },
          potentialProfit: { 
            $sum: { 
              $multiply: [
                '$quantity', 
                { $subtract: ['$selling_price', '$cost_price'] }
              ] 
            } 
          }
        }
      }
    ]);

    const stats = valueStats[0] || {
      totalValue: 0,
      totalCost: 0,
      potentialProfit: 0
    };

    res.json({
      totalItems,
      lowStock: lowStockItems,
      totalValue: Math.round(stats.totalValue * 100) / 100,
      totalCost: Math.round(stats.totalCost * 100) / 100,
      potentialProfit: Math.round(stats.potentialProfit * 100) / 100
    });
  } catch (err) {
    console.error('Error getting inventory stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get low stock items
router.get('/low-stock', requireAuth, async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity', '$min_stock_level'] }
    }).sort({ quantity: 1 });
    
    res.json(lowStockItems);
  } catch (err) {
    console.error('Error getting low stock items:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk update stock levels
router.post('/bulk-update', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { updates } = req.body; // Array of {id, quantity}
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const results = [];
    for (const update of updates) {
      if (!update.id || typeof update.quantity !== 'number') {
        continue;
      }

      const updatedItem = await Inventory.findByIdAndUpdate(
        update.id,
        { 
          quantity: update.quantity,
          updated_at: new Date()
        },
        { new: true }
      );

      if (updatedItem) {
        results.push(updatedItem);
      }
    }

    res.json({ 
      message: `Updated ${results.length} items`,
      items: results 
    });
  } catch (err) {
    console.error('Error bulk updating items:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;