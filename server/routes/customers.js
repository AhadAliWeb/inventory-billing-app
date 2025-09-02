const express = require('express');
const router = express.Router();
const { Customer, Bill } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');

// Get all customers with their credit information
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new customer
router.post('/', requireAuth, async (req, res) => {
  const { name, contact, email, address } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const newCustomer = new Customer({
      name: name.trim(),
      contact: contact?.trim() || '',
      email: email?.trim() || '',
      address: address?.trim() || ''
    });

    const savedCustomer = await newCustomer.save();
    console.log('New customer added:', savedCustomer.name);
    res.status(201).json(savedCustomer);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Customer with this name already exists' });
    } else {
      console.error('Error adding customer:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Update customer
router.put('/:id', requireAuth, async (req, res) => {
  const { name, contact, email, address } = req.body;
  const { id } = req.params;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        contact: contact?.trim() || '',
        email: email?.trim() || '',
        address: address?.trim() || ''
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log('Customer updated:', updatedCustomer.name);
    res.json(updatedCustomer);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Customer with this name already exists' });
    } else {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Get customer details with purchase history
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await Customer.findById(id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get purchase history (bills)
    const bills = await Bill.find({ customer_id: id })
      .sort({ created_at: -1 })
      .limit(50);

    // Calculate customer statistics
    const totalBills = bills.length;
    const totalPurchaseAmount = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const unpaidBills = bills.filter(bill => bill.payment_status === 'unpaid');
    const totalCredit = unpaidBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

    res.json({
      ...customer.toObject(),
      total_bills: totalBills,
      total_purchase_amount: totalPurchaseAmount,
      total_credit_due: totalCredit,
      pending_credit_bills: unpaidBills.length,
      purchase_history: bills
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if customer has any bills
    const billCount = await Bill.countDocuments({ customer_id: id });
    if (billCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing bills. Please archive instead.' 
      });
    }

    const deletedCustomer = await Customer.findByIdAndDelete(id);
    
    if (!deletedCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log('Customer deleted:', deletedCustomer.name);
    res.json({ message: 'Customer deleted successfully', customer: deletedCustomer });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer statistics
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    
    const customerStats = await Bill.aggregate([
      {
        $group: {
          _id: '$customer_id',
          totalSpent: { $sum: '$total_amount' },
          totalBills: { $sum: 1 },
          unpaidAmount: {
            $sum: {
              $cond: [{ $eq: ['$payment_status', 'unpaid'] }, '$total_amount', 0]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalSpent' },
          totalCredit: { $sum: '$unpaidAmount' },
          activeCustomers: { $sum: 1 },
          avgSpentPerCustomer: { $avg: '$totalSpent' }
        }
      }
    ]);

    const stats = customerStats[0] || {
      totalRevenue: 0,
      totalCredit: 0,
      activeCustomers: 0,
      avgSpentPerCustomer: 0
    };

    res.json({
      totalCustomers,
      activeCustomers: stats.activeCustomers,
      totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
      totalCredit: Math.round(stats.totalCredit * 100) / 100,
      avgSpentPerCustomer: Math.round(stats.avgSpentPerCustomer * 100) / 100
    });
  } catch (error) {
    console.error('Error getting customer stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;