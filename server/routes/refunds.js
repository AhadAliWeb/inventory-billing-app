const express = require('express');
const router = express.Router();
const { Refund, Bill, Customer, Inventory } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');

// Get all refunds
router.get('/', requireAuth, async (req, res) => {
  try {
    const refunds = await Refund.find()
      .populate('bill_id', 'total_amount')
      .populate('customer_id', 'name')
      .populate('items.item_id', 'name')
      .sort({ created_at: -1 });
    
    const refundsWithDetails = refunds.map(refund => ({
      ...refund.toObject(),
      bill_total: refund.bill_id?.total_amount || 0,
      customer_name: refund.customer_id?.name || 'Unknown Customer',
      item_name: refund.items?.[0]?.item_id?.name || 'Multiple Items'
    }));
    
    res.json({ success: true, refunds: refundsWithDetails });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// Create new refund
router.post('/', requireAuth, async (req, res) => {
  try {
    const { bill_id, item_id, quantity, reason, refund_type, refund_amount, notes } = req.body;
    
    if (!bill_id || !item_id || !quantity || !reason || !refund_amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: bill_id, item_id, quantity, reason, refund_amount' 
      });
    }

    // Verify the bill exists
    const bill = await Bill.findById(bill_id).populate('customer_id');
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Verify the item exists
    const item = await Inventory.findById(item_id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if item is in the bill
    const billItem = bill.items.find(bi => bi.item_id.toString() === item_id);
    if (!billItem) {
      return res.status(400).json({ error: 'Item not found in bill' });
    }

    if (quantity > billItem.quantity) {
      return res.status(400).json({ error: 'Refund quantity cannot exceed billed quantity' });
    }

    const newRefund = new Refund({
      bill_id,
      customer_id: bill.customer_id?._id,
      amount: refund_amount,
      reason,
      items: [{
        item_id,
        quantity,
        unit_price: billItem.unit_price
      }],
      refund_date: new Date()
    });

    const savedRefund = await newRefund.save();
    
    // Populate the saved refund for response
    const populatedRefund = await Refund.findById(savedRefund._id)
      .populate('bill_id', 'total_amount')
      .populate('customer_id', 'name')
      .populate('items.item_id', 'name');

    res.json({ 
      success: true, 
      message: 'Refund created successfully',
      refund: populatedRefund
    });
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({ error: 'Failed to create refund' });
  }
});

// Get refund by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id)
      .populate('bill_id')
      .populate('customer_id', 'name contact')
      .populate('items.item_id', 'name category');
    
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    
    res.json({ success: true, refund });
  } catch (error) {
    console.error('Error fetching refund:', error);
    res.status(500).json({ error: 'Failed to fetch refund' });
  }
});

// Delete refund
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deletedRefund = await Refund.findByIdAndDelete(req.params.id);
    
    if (!deletedRefund) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    
    res.json({ success: true, message: 'Refund deleted successfully' });
  } catch (error) {
    console.error('Error deleting refund:', error);
    res.status(500).json({ error: 'Failed to delete refund' });
  }
});

module.exports = router;