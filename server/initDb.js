const mongoose = require('./database');
const { 
  Customer, 
  Vendor, 
  Inventory, 
  User, 
  BuyerType, 
  Account 
} = require('./models/schemas');
const bcrypt = require('bcrypt');

// Initialize MongoDB with default data
async function initializeDatabase() {
  console.log('Initializing MongoDB database...');

  try {
    // Wait for MongoDB connection
    await new Promise(resolve => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
      }
    });

    console.log('MongoDB connected, initializing default data...');

    // Create default admin user if it doesn't exist
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = new User({
        username: 'admin',
        password: hashedPassword,
        full_name: 'System Administrator',
        email: 'admin@example.com',
        role: 'admin',
        is_active: true
      });
      await adminUser.save();
      console.log('Default admin user created (username: admin, password: admin123)');
    }

    // Create default buyer types
    const buyerTypes = [
      { name: 'Retail', description: 'Individual customers', discount_percentage: 0 },
      { name: 'Wholesale', description: 'Bulk buyers', discount_percentage: 10 },
      { name: 'Distributor', description: 'Business distributors', discount_percentage: 15 }
    ];

    for (const buyerType of buyerTypes) {
      const existing = await BuyerType.findOne({ name: buyerType.name });
      if (!existing) {
        await new BuyerType(buyerType).save();
        console.log(`Created buyer type: ${buyerType.name}`);
      }
    }

    // Create default accounts
    const accounts = [
      { name: 'Cash', type: 'cash', balance: 0, description: 'Cash payments' },
      { name: 'Bank Account', type: 'bank', balance: 0, description: 'Bank transactions' },
      { name: 'Digital Wallet', type: 'digital', balance: 0, description: 'Digital payments' }
    ];

    for (const account of accounts) {
      const existing = await Account.findOne({ name: account.name });
      if (!existing) {
        await new Account(account).save();
        console.log(`Created account: ${account.name}`);
      }
    }

    // Create sample customers
    const sampleCustomers = [
      { name: 'Walk-in Customer', contact: '', email: '', address: '' },
      { name: 'Regular Customer', contact: '123-456-7890', email: 'customer@example.com', address: '123 Main St' }
    ];

    for (const customer of sampleCustomers) {
      const existing = await Customer.findOne({ name: customer.name });
      if (!existing) {
        await new Customer(customer).save();
        console.log(`Created customer: ${customer.name}`);
      }
    }

    // Create sample vendors
    const sampleVendors = [
      { 
        name: 'Default Supplier', 
        contact: '987-654-3210', 
        email: 'supplier@example.com', 
        address: '456 Supply St',
        gst_number: 'GST123456789',
        total_dues: 0
      }
    ];

    for (const vendor of sampleVendors) {
      const existing = await Vendor.findOne({ name: vendor.name });
      if (!existing) {
        await new Vendor(vendor).save();
        console.log(`Created vendor: ${vendor.name}`);
      }
    }

    console.log('MongoDB database initialization completed successfully!');

  } catch (error) {
    console.error('Error initializing MongoDB database:', error);
    throw error;
  }
}

// Run the initialization
initializeDatabase()
  .then(() => {
    console.log('Database initialization completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error initializing database:', error);
    process.exit(1);
  });
