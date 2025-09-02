const express = require('express');
const router = express.Router();
const { Inventory, Customer, Vendor, Bill } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

// Export data in various formats
router.get('/export/:type', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', dateRange, categories } = req.query;
    
    let data = {};
    let filename = '';
    
    switch (type) {
      case 'inventory':
        data = await exportInventoryData(dateRange, categories);
        filename = `inventory_export_${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'sales':
        data = await exportSalesData(dateRange);
        filename = `sales_export_${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'customers':
        data = await exportCustomersData();
        filename = `customers_export_${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'complete':
        data = await exportCompleteData();
        filename = `complete_export_${new Date().toISOString().split('T')[0]}`;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }
    
    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else if (format === 'excel') {
      // For Excel format, we'll use a simple tab-separated format
      const tsv = convertToTSV(data);
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
      res.send(tsv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        data,
        exportDate: new Date().toISOString(),
        exportType: type,
        recordCount: Array.isArray(data) ? data.length : Object.keys(data).length
      });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message
    });
  }
});

// Import data from uploaded file
router.post('/import/:type', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { type } = req.params;
    const { data, options = {} } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected array of objects.'
      });
    }
    
    let result = {};
    
    switch (type) {
      case 'inventory':
        result = await importInventoryData(data, options);
        break;
        
      case 'customers':
        result = await importCustomersData(data, options);
        break;
        
      case 'vendors':
        result = await importVendorsData(data, options);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid import type'
        });
    }
    
    res.json({
      success: true,
      message: 'Import completed successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message
    });
  }
});

// Get import template
router.get('/template/:type', requireAuth, (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;
    
    let template = {};
    
    switch (type) {
      case 'inventory':
        template = [
          {
            name: 'Sample Item',
            category: 'Electronics',
            quantity: 10,
            selling_price: 99.99,
            unit: 'piece',
            cost_price: 75.00,
            min_stock_level: 5,
            description: 'Sample product description'
          }
        ];
        break;
        
      case 'customers':
        template = [
          {
            name: 'John Doe',
            contact: '+1-234-567-8900',
            email: 'john@example.com',
            address: '123 Main St, City, State'
          }
        ];
        break;
        
      case 'vendors':
        template = [
          {
            name: 'Supplier Inc',
            contact: '+1-234-567-8900',
            email: 'info@supplier.com',
            address: '456 Business Ave, City, State',
            gst_number: 'GST123456789'
          }
        ];
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid template type'
        });
    }
    
    const filename = `${type}_import_template`;
    
    if (format === 'csv') {
      const csv = convertToCSV(template);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        template,
        instructions: {
          format: 'Fill in the data following the template structure',
          required_fields: getRequiredFields(type),
          notes: 'Remove this instructions object before importing'
        }
      });
    }
    
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template'
    });
  }
});

// Export functions
async function exportInventoryData(dateRange, categories) {
  let filter = {};
  
  if (categories) {
    const categoryList = categories.split(',');
    filter.category = { $in: categoryList };
  }
  
  const inventory = await Inventory.find(filter)
    .populate('supplier', 'name')
    .sort({ name: 1 })
    .lean();
  
  return inventory.map(item => ({
    ...item,
    vendor_name: item.supplier?.name || 'Unknown',
    stock_status: item.quantity === 0 ? 'Out of Stock' : 
                  item.quantity <= item.min_stock_level ? 'Low Stock' : 'In Stock'
  }));
}

async function exportSalesData(dateRange) {
  let filter = {};
  
  if (dateRange) {
    const [startDate, endDate] = dateRange.split(',');
    filter.created_at = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  const bills = await Bill.find(filter)
    .populate('customer_id', 'name contact')
    .sort({ created_at: -1 })
    .lean();
  
  return bills.map(bill => ({
    bill_id: bill._id,
    created_at: bill.created_at,
    total_amount: bill.total_amount,
    payment_type: bill.payment_method,
    payment_status: bill.payment_status || 'unknown',
    customer_name: bill.customer_id?.name || 'Unknown',
    customer_contact: bill.customer_id?.contact || '',
    items: bill.items || []
  }));
}

async function exportCustomersData() {
  const customers = await Customer.find()
    .sort({ name: 1 })
    .lean();
  
  // Get additional data for each customer
  const customersWithStats = await Promise.all(
    customers.map(async (customer) => {
      const bills = await Bill.find({ customer_id: customer._id });
      const totalOrders = bills.length;
      const totalSpent = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
      const lastOrderDate = bills.length > 0 ? 
        Math.max(...bills.map(bill => new Date(bill.created_at))) : null;
      
      return {
        ...customer,
        total_orders: totalOrders,
        total_spent: totalSpent,
        last_order_date: lastOrderDate
      };
    })
  );
  
  return customersWithStats;
}

async function exportCompleteData() {
  const [inventory, customers, vendors, salesSummary] = await Promise.all([
    exportInventoryData(),
    exportCustomersData(),
    Vendor.find().sort({ name: 1 }).lean(),
    Bill.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          total_bills: { $sum: 1 },
          total_revenue: { $sum: '$total_amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ])
  ]);
  
  return {
    inventory,
    customers,
    vendors,
    sales_summary: salesSummary
  };
}

// Import functions
async function importInventoryData(data, options) {
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const item of data) {
    try {
      // Validate required fields
      if (!item.name || !item.category || item.quantity === undefined || item.selling_price === undefined) {
        results.failed++;
        results.errors.push(`Missing required fields for item: ${item.name || 'Unknown'}`);
        continue;
      }
      
      if (options.updateExisting) {
        // Update existing or create new
        await Inventory.findOneAndUpdate(
          { name: item.name },
          {
            name: item.name,
            category: item.category,
            quantity: parseInt(item.quantity) || 0,
            selling_price: parseFloat(item.selling_price) || 0,
            unit: item.unit || 'piece',
            cost_price: parseFloat(item.cost_price) || 0,
            min_stock_level: parseInt(item.min_stock_level) || 10,
            description: item.description || ''
          },
          { upsert: true, new: true }
        );
      } else {
        // Check if item exists
        const existingItem = await Inventory.findOne({ name: item.name });
        if (existingItem) {
          results.failed++;
          results.errors.push(`Item already exists: ${item.name}`);
          continue;
        }
        
        // Create new item
        const newItem = new Inventory({
          name: item.name,
          category: item.category,
          quantity: parseInt(item.quantity) || 0,
          selling_price: parseFloat(item.selling_price) || 0,
          unit: item.unit || 'piece',
          cost_price: parseFloat(item.cost_price) || 0,
          min_stock_level: parseInt(item.min_stock_level) || 10,
          description: item.description || ''
        });
        
        await newItem.save();
      }
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to import item ${item.name}: ${error.message}`);
    }
  }
  
  return results;
}

async function importCustomersData(data, options) {
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const customer of data) {
    try {
      if (!customer.name) {
        results.failed++;
        results.errors.push('Missing required field: name');
        continue;
      }
      
      if (options.updateExisting) {
        // Update existing or create new
        await Customer.findOneAndUpdate(
          { name: customer.name },
          {
            name: customer.name,
            contact: customer.contact || '',
            email: customer.email || '',
            address: customer.address || ''
          },
          { upsert: true, new: true }
        );
      } else {
        // Check if customer exists
        const existingCustomer = await Customer.findOne({ name: customer.name });
        if (existingCustomer) {
          results.failed++;
          results.errors.push(`Customer already exists: ${customer.name}`);
          continue;
        }
        
        // Create new customer
        const newCustomer = new Customer({
          name: customer.name,
          contact: customer.contact || '',
          email: customer.email || '',
          address: customer.address || ''
        });
        
        await newCustomer.save();
      }
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to import customer ${customer.name}: ${error.message}`);
    }
  }
  
  return results;
}

async function importVendorsData(data, options) {
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const vendor of data) {
    try {
      if (!vendor.name) {
        results.failed++;
        results.errors.push('Missing required field: name');
        continue;
      }
      
      if (options.updateExisting) {
        // Update existing or create new
        await Vendor.findOneAndUpdate(
          { name: vendor.name },
          {
            name: vendor.name,
            contact: vendor.contact || '',
            email: vendor.email || '',
            address: vendor.address || '',
            gst_number: vendor.gst_number || ''
          },
          { upsert: true, new: true }
        );
      } else {
        // Check if vendor exists
        const existingVendor = await Vendor.findOne({ name: vendor.name });
        if (existingVendor) {
          results.failed++;
          results.errors.push(`Vendor already exists: ${vendor.name}`);
          continue;
        }
        
        // Create new vendor
        const newVendor = new Vendor({
          name: vendor.name,
          contact: vendor.contact || '',
          email: vendor.email || '',
          address: vendor.address || '',
          gst_number: vendor.gst_number || ''
        });
        
        await newVendor.save();
      }
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to import vendor ${vendor.name}: ${error.message}`);
    }
  }
  
  return results;
}

// Helper functions
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

function convertToTSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const tsvHeaders = headers.join('\t');
  
  const tsvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return String(value).replace(/\t/g, ' ');
    }).join('\t');
  });
  
  return [tsvHeaders, ...tsvRows].join('\n');
}

function getRequiredFields(type) {
  switch (type) {
    case 'inventory':
      return ['name', 'category', 'quantity', 'selling_price'];
    case 'customers':
      return ['name'];
    case 'vendors':
      return ['name'];
    default:
      return [];
  }
}

module.exports = router;
