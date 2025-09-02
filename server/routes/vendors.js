const express = require('express');
const router = express.Router();
const { Vendor, Inventory, PurchaseOrder } = require('../models/schemas');

// Get all vendors with their total dues and items count
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
    
    // Enhance with aggregated data
    const vendorsWithStats = await Promise.all(vendors.map(async (vendor) => {
      const itemsCount = await Inventory.countDocuments({ supplier: vendor._id });
      const purchaseOrdersCount = await PurchaseOrder.countDocuments({ vendor_id: vendor._id });
      
      return {
        ...vendor.toObject(),
        items_count: itemsCount,
        purchase_orders_count: purchaseOrdersCount,
        total_dues: vendor.total_dues || 0
      };
    }));
    
    res.json(vendorsWithStats);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vendor details
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get vendor items
    const items = await Inventory.find({ supplier: id });
    
    // Get purchase orders
    const purchaseOrders = await PurchaseOrder.find({ vendor_id: id }).sort({ created_at: -1 });

    res.json({
      ...vendor.toObject(),
      items,
      purchase_orders: purchaseOrders,
      payment_history: []
    });
  } catch (error) {
    console.error('Error fetching vendor details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new vendor
router.post('/', async (req, res) => {
  const { name, contact, address, email, gst_number } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const newVendor = new Vendor({
      name,
      contact: contact || '',
      address: address || '',
      email: email || '',
      gst_number: gst_number || '',
      total_dues: 0
    });

    const savedVendor = await newVendor.save();
    res.json(savedVendor);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Vendor with this name already exists' });
    } else {
      console.error('Error adding vendor:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Update vendor
router.put('/:id', async (req, res) => {
  const { name, contact, address, email, gst_number } = req.body;
  const { id } = req.params;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      {
        name,
        contact: contact || '',
        address: address || '',
        email: email || '',
        gst_number: gst_number || ''
      },
      { new: true, runValidators: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(updatedVendor);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Vendor with this name already exists' });
    } else {
      console.error('Error updating vendor:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if vendor has associated items
    const itemsCount = await Inventory.countDocuments({ supplier: id });
    if (itemsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor with associated items. Please reassign or delete items first.' 
      });
    }

    const deletedVendor = await Vendor.findByIdAndDelete(id);
    if (!deletedVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;