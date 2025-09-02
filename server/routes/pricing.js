const express = require('express');
const router = express.Router();
const { Pricing, BuyerType, Inventory } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');

// Get all buyer types
router.get('/buyer-types', requireAuth, async (req, res) => {
  try {
    const buyerTypes = await BuyerType.find().sort({ name: 1 });
    res.json({ success: true, buyerTypes });
  } catch (error) {
    console.error('Get buyer types error:', error);
    res.status(500).json({ error: 'Failed to get buyer types' });
  }
});

// Create new buyer type
router.post('/buyer-types', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, discount_percentage = 0 } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Buyer type name required' });
    }

    const existingBuyerType = await BuyerType.findOne({ name });
    if (existingBuyerType) {
      return res.status(400).json({ error: 'Buyer type with this name already exists' });
    }

    const newBuyerType = new BuyerType({
      name,
      description: description || '',
      discount_percentage
    });

    const savedBuyerType = await newBuyerType.save();

    res.json({ 
      success: true, 
      buyer_type: savedBuyerType,
      message: 'Buyer type created successfully'
    });
  } catch (error) {
    console.error('Create buyer type error:', error);
    res.status(500).json({ error: 'Failed to create buyer type' });
  }
});

// Get pricing for a specific item
router.get('/item/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Get item details
    const item = await Inventory.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Get pricing for all buyer types
    const pricing = await Pricing.find({ 
      item_id: itemId, 
      is_active: true 
    }).populate('buyer_type_id', 'name description');
    
    // Get quantity tiers for all buyer types
    const quantityTiers = await QuantityTier.find({ 
      item_id: itemId, 
      is_active: true 
    }).populate('buyer_type_id', 'name');
    
    res.json({
      success: true,
      item,
      pricing,
      quantityTiers
    });
  } catch (error) {
    console.error('Get item pricing error:', error);
    res.status(500).json({ error: 'Failed to get item pricing' });
  }
});

// Update pricing for an item and buyer type
router.put('/item/:itemId/buyer-type/:buyerTypeId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { itemId, buyerTypeId } = req.params;
    const { price, effective_date } = req.body;
    
    if (!price) {
      return res.status(400).json({ error: 'Price is required' });
    }

    // Check if pricing exists
    const existingPricing = await Pricing.findOne({
      item_id: itemId,
      buyer_type_id: buyerTypeId
    });

    if (existingPricing) {
      // Update existing pricing
      existingPricing.price = price;
      existingPricing.effective_date = effective_date || new Date();
      await existingPricing.save();
    } else {
      // Create new pricing
      const newPricing = new Pricing({
        item_id: itemId,
        buyer_type_id: buyerTypeId,
        price,
        effective_date: effective_date || new Date()
      });
      await newPricing.save();
    }

    res.json({ 
      success: true, 
      message: 'Pricing updated successfully'
    });
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

// Calculate price for a specific buyer type with quantity-based pricing
router.post('/calculate-price', requireAuth, async (req, res) => {
  try {
    const { item_id, buyer_type_id, quantity = 1 } = req.body;
    
    if (!item_id || !buyer_type_id) {
      return res.status(400).json({ error: 'Item ID and buyer type ID required' });
    }

    // Get item base price
    const item = await Inventory.findById(item_id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get buyer type markup
    const buyerType = await BuyerType.findById(buyer_type_id);
    if (!buyerType) {
      return res.status(404).json({ error: 'Buyer type not found' });
    }

    // Get custom pricing if exists
    const customPricing = await Pricing.findOne({
      item_id,
      buyer_type_id,
      is_active: true
    });

    let finalPrice;
    let markupPercentage;
    let discountPercentage = buyerType.discount_percentage || 0;

    if (customPricing) {
      finalPrice = customPricing.price;
      markupPercentage = ((finalPrice - item.cost_price) / item.cost_price) * 100;
    } else {
      markupPercentage = buyerType.discount_percentage || 0;
      finalPrice = item.cost_price * (1 + markupPercentage / 100);
    }

    // Apply quantity-based discount
    if (quantity > 1) {
      if (quantity >= 100) {
        discountPercentage += 12; // Large wholesale
      } else if (quantity >= 50) {
        discountPercentage += 8;  // Medium wholesale
      } else if (quantity >= 10) {
        discountPercentage += 5;  // Small wholesale
      }
    }

    const discountedPrice = finalPrice * (1 - discountPercentage / 100);
    const totalPrice = discountedPrice * quantity;
    const markupAmount = (discountedPrice - item.cost_price) * quantity;
    const savingsAmount = (finalPrice - discountedPrice) * quantity;

    res.json({
      success: true,
      pricing: {
        base_price: item.cost_price,
        selling_price: item.selling_price,
        markup_percentage: markupPercentage,
        final_price: discountedPrice,
        quantity,
        total_price: totalPrice,
        markup_amount: markupAmount,
        discount_percentage: discountPercentage,
        savings_amount: savingsAmount,
        buyer_type_id,
        buyer_type_name: buyerType.name,
        item_id,
        item_name: item.name
      }
    });
  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});

// Get all pricing rules
router.get('/rules', requireAuth, async (req, res) => {
  try {
    const pricing = await Pricing.find({ is_active: true })
      .populate('item_id', 'name category')
      .populate('buyer_type_id', 'name description')
      .sort({ 'item_id.name': 1, 'buyer_type_id.name': 1 });
    
    res.json({ success: true, rules: pricing });
  } catch (error) {
    console.error('Get pricing rules error:', error);
    res.status(500).json({ error: 'Failed to get pricing rules' });
  }
});

// Bulk update pricing for multiple items
router.post('/bulk-update', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array required' });
    }

    const results = [];
    
    for (const update of updates) {
      const { item_id, buyer_type_id, price, effective_date } = update;
      
      try {
        // Check if pricing exists
        const existingPricing = await Pricing.findOne({
          item_id,
          buyer_type_id
        });

        if (existingPricing) {
          // Update existing pricing
          existingPricing.price = price;
          existingPricing.effective_date = effective_date || new Date();
          await existingPricing.save();
        } else {
          // Create new pricing
          const newPricing = new Pricing({
            item_id,
            buyer_type_id,
            price,
            effective_date: effective_date || new Date()
          });
          await newPricing.save();
        }
        
        results.push({ item_id, buyer_type_id, status: 'success' });
      } catch (error) {
        results.push({ item_id, buyer_type_id, status: 'error', error: error.message });
      }
    }

    res.json({ 
      success: true, 
      results,
      message: 'Bulk pricing update completed'
    });
  } catch (error) {
    console.error('Bulk update pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

// Get quantity tiers for an item
router.get('/quantity-tiers/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const tiers = await QuantityTier.find({ 
      item_id: itemId, 
      is_active: true 
    })
    .populate('buyer_type_id', 'name')
    .sort({ 'buyer_type_id.name': 1, min_quantity: 1 });
    
    res.json({ success: true, tiers });
  } catch (error) {
    console.error('Get quantity tiers error:', error);
    res.status(500).json({ error: 'Failed to get quantity tiers' });
  }
});

// Create or update quantity tier
router.post('/quantity-tiers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      item_id, 
      buyer_type_id, 
      min_quantity, 
      max_quantity, 
      discount_percentage, 
      fixed_price, 
      tier_name 
    } = req.body;
    
    if (!item_id || !buyer_type_id || !min_quantity) {
      return res.status(400).json({ error: 'Item ID, buyer type ID, and minimum quantity required' });
    }

    if (!discount_percentage && !fixed_price) {
      return res.status(400).json({ error: 'Either discount percentage or fixed price required' });
    }

    const newTier = new QuantityTier({
      item_id,
      buyer_type_id,
      min_quantity,
      max_quantity,
      discount_percentage: discount_percentage || 0,
      fixed_price,
      tier_name,
      is_active: true
    });
    
    const savedTier = await newTier.save();
    
    res.json({ 
      success: true, 
      tier: savedTier,
      message: 'Quantity tier created successfully' 
    });
  } catch (error) {
    console.error('Create quantity tier error:', error);
    res.status(500).json({ error: 'Failed to create quantity tier' });
  }
});

// Update quantity tier
router.put('/quantity-tiers/:tierId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { tierId } = req.params;
    const { 
      min_quantity, 
      max_quantity, 
      discount_percentage, 
      fixed_price, 
      tier_name,
      is_active 
    } = req.body;
    
    const updatedTier = await QuantityTier.findByIdAndUpdate(
      tierId,
      {
        min_quantity,
        max_quantity,
        discount_percentage: discount_percentage || 0,
        fixed_price,
        tier_name,
        is_active: is_active !== undefined ? is_active : true
      },
      { new: true }
    );

    if (!updatedTier) {
      return res.status(404).json({ error: 'Quantity tier not found' });
    }
    
    res.json({ success: true, message: 'Quantity tier updated successfully', tier: updatedTier });
  } catch (error) {
    console.error('Update quantity tier error:', error);
    res.status(500).json({ error: 'Failed to update quantity tier' });
  }
});

// Delete quantity tier
router.delete('/quantity-tiers/:tierId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { tierId } = req.params;
    
    const deletedTier = await QuantityTier.findByIdAndUpdate(
      tierId,
      { is_active: false },
      { new: true }
    );

    if (!deletedTier) {
      return res.status(404).json({ error: 'Quantity tier not found' });
    }
    
    res.json({ success: true, message: 'Quantity tier deleted successfully' });
  } catch (error) {
    console.error('Delete quantity tier error:', error);
    res.status(500).json({ error: 'Failed to delete quantity tier' });
  }
});

// Get all quantity tiers with wholesale discounts
router.get('/wholesale-tiers', requireAuth, async (req, res) => {
  try {
    const { buyer_type_id } = req.query;
    
    let filter = { is_active: true };
    if (buyer_type_id) {
      filter.buyer_type_id = buyer_type_id;
    }
    
    const tiers = await QuantityTier.find(filter)
      .populate('item_id', 'name category')
      .populate('buyer_type_id', 'name')
      .sort({ 'item_id.name': 1, min_quantity: 1 });
    
    res.json({ success: true, tiers });
  } catch (error) {
    console.error('Get wholesale tiers error:', error);
    res.status(500).json({ error: 'Failed to get wholesale tiers' });
  }
});

// Get quantity tiers for a specific item and buyer type
router.get('/quantity-tiers/:itemId/:buyerTypeId', requireAuth, async (req, res) => {
  try {
    const { itemId, buyerTypeId } = req.params;
    
    // Validate item exists
    const item = await Inventory.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Validate buyer type exists
    const buyerType = await BuyerType.findById(buyerTypeId);
    if (!buyerType) {
      return res.status(404).json({ error: 'Buyer type not found' });
    }
    
    // Get quantity tiers
    const tiers = await QuantityTier.find({
      item_id: itemId,
      buyer_type_id: buyerTypeId,
      is_active: true
    }).sort({ min_quantity: 1 });
    
    res.json({
      success: true,
      item,
      buyerType,
      tiers
    });
  } catch (error) {
    console.error('Get quantity tiers error:', error);
    res.status(500).json({ error: 'Failed to get quantity tiers' });
  }
});

module.exports = router;
