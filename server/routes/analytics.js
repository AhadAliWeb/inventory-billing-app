const express = require('express');
const router = express.Router();
const { Bill, Customer, Inventory, Vendor } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');

// Advanced sales analytics
router.get('/sales-analytics', requireAuth, async (req, res) => {
  try {
    const { period = '30', startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      dateFilter.created_at = { $gte: daysAgo };
    }

    // Sales overview
    const salesOverview = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total_bills: { $sum: 1 },
          total_revenue: { $sum: '$total_amount' },
          avg_bill_value: { $avg: '$total_amount' },
          paid_revenue: {
            $sum: {
              $cond: [{ $eq: ['$payment_status', 'paid'] }, '$total_amount', 0]
            }
          },
          pending_revenue: {
            $sum: {
              $cond: [{ $eq: ['$payment_status', 'unpaid'] }, '$total_amount', 0]
            }
          },
          unique_customers: { $addToSet: '$customer_id' }
        }
      },
      {
        $project: {
          total_bills: 1,
          total_revenue: 1,
          avg_bill_value: { $round: ['$avg_bill_value', 2] },
          paid_revenue: 1,
          pending_revenue: 1,
          unique_customers: { $size: '$unique_customers' }
        }
      }
    ]);

    // Daily sales trend
    const dailySales = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          bills_count: { $sum: 1 },
          revenue: { $sum: '$total_amount' },
          avg_bill_value: { $avg: '$total_amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    // Top selling items (simplified - would need bill items in schema)
    const topItems = await Bill.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item_name',
          total_quantity: { $sum: '$items.quantity' },
          total_revenue: { $sum: '$items.total_price' },
          times_sold: { $sum: 1 },
          avg_price: { $avg: '$items.unit_price' }
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: 10 }
    ]);

    // Customer analytics
    const customerAnalytics = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$customer_id',
          total_orders: { $sum: 1 },
          total_spent: { $sum: '$total_amount' },
          avg_order_value: { $avg: '$total_amount' },
          last_order_date: { $max: '$created_at' }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $project: {
          customer_name: { $arrayElemAt: ['$customer.name', 0] },
          total_orders: 1,
          total_spent: 1,
          avg_order_value: { $round: ['$avg_order_value', 2] },
          last_order_date: 1
        }
      },
      { $sort: { total_spent: -1 } },
      { $limit: 10 }
    ]);

    // Payment method breakdown
    const paymentMethods = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$payment_method',
          count: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
          avg_amount: { $avg: '$total_amount' }
        }
      },
      {
        $project: {
          payment_type: '$_id',
          count: 1,
          total_amount: 1,
          avg_amount: { $round: ['$avg_amount', 2] }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: salesOverview[0] || {},
        dailyTrend: dailySales.reverse(),
        topItems,
        topCustomers: customerAnalytics,
        paymentMethods
      }
    });

  } catch (error) {
    console.error('Error getting sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales analytics'
    });
  }
});

// Inventory analytics
router.get('/inventory-analytics', requireAuth, async (req, res) => {
  try {
    // Inventory overview
    const inventoryOverview = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          total_items: { $sum: 1 },
          total_value: { $sum: { $multiply: ['$quantity', '$selling_price'] } },
          avg_item_price: { $avg: '$selling_price' },
          out_of_stock: {
            $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
          },
          low_stock: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$min_stock_level'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          total_items: 1,
          total_value: { $round: ['$total_value', 2] },
          avg_item_price: { $round: ['$avg_item_price', 2] },
          out_of_stock: 1,
          low_stock: 1
        }
      }
    ]);

    // Category breakdown
    const categoryBreakdown = await Inventory.aggregate([
      {
        $group: {
          _id: '$category',
          item_count: { $sum: 1 },
          total_quantity: { $sum: '$quantity' },
          total_value: { $sum: { $multiply: ['$quantity', '$selling_price'] } },
          avg_price: { $avg: '$selling_price' }
        }
      },
      {
        $project: {
          category: '$_id',
          item_count: 1,
          total_quantity: 1,
          total_value: { $round: ['$total_value', 2] },
          avg_price: { $round: ['$avg_price', 2] }
        }
      },
      { $sort: { total_value: -1 } }
    ]);

    // Low stock alerts
    const lowStockAlerts = await Inventory.find({
      $or: [
        { quantity: 0 },
        { $expr: { $lte: ['$quantity', '$min_stock_level'] } }
      ]
    })
    .select('name category quantity min_stock_level selling_price')
    .sort({ quantity: 1 })
    .limit(20);

    // Add current value to low stock alerts
    const lowStockAlertsWithValue = lowStockAlerts.map(item => ({
      ...item.toObject(),
      current_value: item.quantity * item.selling_price
    }));

    res.json({
      success: true,
      data: {
        overview: inventoryOverview[0] || {},
        categoryBreakdown,
        lowStockAlerts: lowStockAlertsWithValue
      }
    });

  } catch (error) {
    console.error('Error getting inventory analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory analytics'
    });
  }
});

// Profit analytics
router.get('/profit-analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));
    const dateFilter = { created_at: { $gte: daysAgo } };

    // Profit overview (simplified calculation)
    const profitOverview = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$total_amount' },
          total_transactions: { $sum: 1 }
        }
      },
      {
        $project: {
          total_revenue: 1,
          total_cost: { $multiply: ['$total_revenue', 0.7] }, // Estimated 70% cost
          total_profit: { $multiply: ['$total_revenue', 0.3] }, // Estimated 30% profit
          total_transactions: 1
        }
      }
    ]);

    // Calculate profit margin
    if (profitOverview[0] && profitOverview[0].total_revenue > 0) {
      profitOverview[0].profit_margin = 30; // Fixed 30% for now
    }

    // Daily profit trend
    const dailyProfit = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          revenue: { $sum: '$total_amount' }
        }
      },
      {
        $project: {
          date: '$_id',
          revenue: 1,
          cost: { $multiply: ['$revenue', 0.7] },
          profit: { $multiply: ['$revenue', 0.3] }
        }
      },
      { $sort: { date: -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        overview: profitOverview[0] || {},
        dailyTrend: dailyProfit.reverse()
      }
    });

  } catch (error) {
    console.error('Error getting profit analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profit analytics'
    });
  }
});

// Export analytics data
router.get('/export/:type', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', period = '30' } = req.query;

    let data = [];
    let filename = '';

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    switch (type) {
      case 'sales':
        // Get sales data for export
        data = await Bill.find({ created_at: { $gte: daysAgo } })
          .populate('customer_id', 'name')
          .sort({ created_at: -1 })
          .lean();
        
        // Transform data for export
        data = data.map(bill => ({
          id: bill._id,
          created_at: bill.created_at,
          customer_name: bill.customer_id?.name || 'Unknown',
          total_amount: bill.total_amount,
          payment_type: bill.payment_method,
          payment_status: bill.payment_status || 'unknown'
        }));
        
        filename = `sales_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'inventory':
        data = await Inventory.find()
          .populate('supplier', 'name')
          .sort({ name: 1 })
          .lean();
        
        // Transform data for export
        data = data.map(item => ({
          ...item,
          vendor_name: item.supplier?.name || 'Unknown',
          stock_status: item.quantity === 0 ? 'Out of Stock' : 
                      item.quantity <= item.min_stock_level ? 'Low Stock' : 'In Stock'
        }));
        
        filename = `inventory_report_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        data,
        exportDate: new Date().toISOString(),
        recordCount: data.length
      });
    }

  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

module.exports = router;
