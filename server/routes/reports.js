const express = require('express');
const router = express.Router();
const { Inventory, Vendor, Bill, Customer } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');

// Get inventory status report
router.get('/inventory-status', requireAuth, async (req, res) => {
  try {
    const { category, low_stock_only } = req.query;
    
    let filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (low_stock_only === 'true') {
      filter.$expr = { $lte: ['$quantity', '$min_stock_level'] };
    }
    
    const items = await Inventory.find(filter)
      .populate('supplier', 'name')
      .sort({ quantity: 1, name: 1 });
    
    // Add stock status to each item
    const itemsWithStatus = items.map(item => ({
      ...item.toObject(),
      vendor_name: item.supplier?.name || 'N/A',
      stock_status: item.quantity === 0 ? 'Out of Stock' : 
                   item.quantity <= item.min_stock_level ? 'Low Stock' : 'In Stock'
    }));
    
    // Calculate summary statistics
    const totalItems = itemsWithStatus.length;
    const outOfStock = itemsWithStatus.filter(item => item.quantity === 0).length;
    const lowStock = itemsWithStatus.filter(item => item.quantity > 0 && item.quantity <= item.min_stock_level).length;
    const inStock = itemsWithStatus.filter(item => item.quantity > item.min_stock_level).length;
    const totalValue = itemsWithStatus.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
    
    res.json({
      items: itemsWithStatus,
      summary: {
        total_items: totalItems,
        out_of_stock: outOfStock,
        low_stock: lowStock,
        in_stock: inStock,
        total_inventory_value: totalValue
      }
    });
  } catch (error) {
    console.error('Error generating inventory status report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sales report
router.get('/sales', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'product' } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
      filter.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const bills = await Bill.find(filter)
      .populate('customer_id', 'name')
      .populate('items.item_id', 'name category')
      .sort({ created_at: -1 });
    
    let groupedData = [];
    let totalRevenue = 0;
    let totalQuantity = 0;
    
    if (groupBy === 'product') {
      const productMap = new Map();
      
      bills.forEach(bill => {
        bill.items.forEach(item => {
          const itemName = item.item_id?.name || 'Unknown Item';
          const revenue = item.total_price || (item.quantity * item.unit_price);
          
          if (productMap.has(itemName)) {
            const existing = productMap.get(itemName);
            existing.quantity += item.quantity;
            existing.revenue += revenue;
          } else {
            productMap.set(itemName, {
              name: itemName,
              quantity: item.quantity,
              revenue: revenue,
              category: item.item_id?.category || 'Unknown'
            });
          }
        });
      });
      
      groupedData = Array.from(productMap.values());
    } else if (groupBy === 'customer') {
      const customerMap = new Map();
      
      bills.forEach(bill => {
        const customerName = bill.customer_id?.name || bill.customer_name || 'Walk-in Customer';
        
        if (customerMap.has(customerName)) {
          const existing = customerMap.get(customerName);
          existing.orders += 1;
          existing.revenue += bill.total_amount;
        } else {
          customerMap.set(customerName, {
            name: customerName,
            orders: 1,
            revenue: bill.total_amount
          });
        }
      });
      
      groupedData = Array.from(customerMap.values());
    }
    
    totalRevenue = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
    totalQuantity = bills.reduce((sum, bill) => 
      sum + bill.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    res.json({
      groupBy,
      data: groupedData,
      summary: {
        total_bills: bills.length,
        total_revenue: totalRevenue,
        total_quantity: totalQuantity,
        average_bill_amount: bills.length > 0 ? totalRevenue / bills.length : 0,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get profit report
router.get('/profit', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'product' } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
      filter.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const bills = await Bill.find(filter)
      .populate('items.item_id', 'name category cost_price')
      .sort({ created_at: -1 });
    
    let profitData = [];
    let totalRevenue = 0;
    let totalCost = 0;
    
    const productMap = new Map();
    
    bills.forEach(bill => {
      bill.items.forEach(item => {
        const itemName = item.item_id?.name || 'Unknown Item';
        const revenue = item.total_price || (item.quantity * item.unit_price);
        const cost = item.quantity * (item.item_id?.cost_price || 0);
        const profit = revenue - cost;
        
        if (productMap.has(itemName)) {
          const existing = productMap.get(itemName);
          existing.revenue += revenue;
          existing.cost += cost;
          existing.profit += profit;
          existing.quantity += item.quantity;
        } else {
          productMap.set(itemName, {
            name: itemName,
            revenue: revenue,
            cost: cost,
            profit: profit,
            quantity: item.quantity,
            margin: revenue > 0 ? (profit / revenue) * 100 : 0,
            category: item.item_id?.category || 'Unknown'
          });
        }
      });
    });
    
    profitData = Array.from(productMap.values()).map(item => ({
      ...item,
      margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0
    }));
    
    totalRevenue = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
    totalCost = profitData.reduce((sum, item) => sum + item.cost, 0);
    
    res.json({
      data: profitData,
      summary: {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalRevenue - totalCost,
        profit_margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error generating profit report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard summary
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get basic counts
    const totalCustomers = await Customer.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    const totalItems = await Inventory.countDocuments();
    
    // Get low stock items
    const lowStockItems = await Inventory.countDocuments({
      $expr: { $lte: ['$quantity', '$min_stock_level'] }
    });
    
    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayBills = await Bill.find({
      created_at: { $gte: today, $lt: tomorrow }
    });
    
    const todaySales = todayBills.reduce((sum, bill) => sum + bill.total_amount, 0);
    
    // Get this month's sales
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBills = await Bill.find({
      created_at: { $gte: startOfMonth }
    });
    
    const monthlySales = monthlyBills.reduce((sum, bill) => sum + bill.total_amount, 0);
    
    // Get top selling items (last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentBills = await Bill.find({
      created_at: { $gte: last30Days }
    }).populate('items.item_id', 'name');
    
    const itemSales = new Map();
    recentBills.forEach(bill => {
      bill.items.forEach(item => {
        const itemName = item.item_id?.name || 'Unknown Item';
        const quantity = item.quantity;
        
        if (itemSales.has(itemName)) {
          itemSales.set(itemName, itemSales.get(itemName) + quantity);
        } else {
          itemSales.set(itemName, quantity);
        }
      });
    });
    
    const topItems = Array.from(itemSales.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    
    res.json({
      overview: {
        total_customers: totalCustomers,
        total_vendors: totalVendors,
        total_items: totalItems,
        low_stock_items: lowStockItems
      },
      sales: {
        today: todaySales,
        month: monthlySales,
        today_bills_count: todayBills.length,
        month_bills_count: monthlyBills.length
      },
      top_items: topItems
    });
  } catch (error) {
    console.error('Error generating dashboard report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;