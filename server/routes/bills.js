const express = require('express');
const router = express.Router();
const { Bill, Customer } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');

// Get all bills with customer details and item count
router.get('/', requireAuth, async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('customer_id', 'name')
      .sort({ created_at: -1 });

    const billsWithStats = bills.map(bill => ({
      ...bill.toObject(),
      customer_name: bill.customer_id?.name || bill.customer_name || 'Walk-in Customer',
      items_count: bill.items?.length || 0
    }));

    res.json(billsWithStats);
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get bill details by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id)
      .populate('customer_id', 'name contact email address')
      .populate('items.item_id', 'name category unit');

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const billDetails = {
      ...bill.toObject(),
      customer_name: bill.customer_id?.name || bill.customer_name || 'Walk-in Customer'
    };

    res.json(billDetails);
  } catch (err) {
    console.error('Error fetching bill details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get bills report for date range
router.get('/report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
      filter.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bills = await Bill.find(filter)
      .populate('customer_id', 'name')
      .sort({ created_at: -1 });

    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const totalDiscount = bills.reduce((sum, bill) => sum + (bill.discount || 0), 0);
    const totalTax = bills.reduce((sum, bill) => sum + (bill.tax || 0), 0);

    const report = {
      bills: bills.map(bill => ({
        ...bill.toObject(),
        customer_name: bill.customer_id?.name || bill.customer_name || 'Walk-in Customer'
      })),
      summary: {
        total_bills: bills.length,
        total_revenue: totalRevenue,
        total_discount: totalDiscount,
        total_tax: totalTax,
        average_bill_amount: bills.length > 0 ? totalRevenue / bills.length : 0
      }
    };

    res.json(report);
  } catch (err) {
    console.error('Error generating bills report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a bill
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBill = await Bill.findByIdAndDelete(id);
    if (!deletedBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;