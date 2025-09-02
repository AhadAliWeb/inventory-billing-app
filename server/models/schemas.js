const mongoose = require('mongoose');

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  contact: String,
  email: String,
  address: String,
  created_at: { type: Date, default: Date.now }
});

// Vendor Schema
const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  contact: String,
  address: String,
  email: String,
  gst_number: String,
  total_dues: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

// Inventory Item Schema
const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  quantity: { type: Number, default: 0 },
  unit: String,
  cost_price: { type: Number, default: 0 },
  selling_price: { type: Number, default: 0 },
  min_stock_level: { type: Number, default: 0 },
  max_stock_level: { type: Number, default: 1000 },
  location: String,
  supplier: String,
  barcode: String,
  image_url: String,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Bill Schema
const billSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customer_name: String,
  total_amount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  payment_method: String,
  items: [{
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    item_name: String,
    quantity: Number,
    unit_price: Number,
    total_price: Number
  }],
  created_at: { type: Date, default: Date.now }
});

// Serial Schema
const serialSchema = new mongoose.Schema({
  serial_code: { type: String, required: true, unique: true },
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  cost_price: { type: Number, required: true },
  purchase_date: { type: Date, required: true },
  status: { type: String, enum: ['available', 'sold', 'damaged'], default: 'available' },
  sold_date: Date,
  created_at: { type: Date, default: Date.now }
});

// Purchase Order Schema
const purchaseOrderSchema = new mongoose.Schema({
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendor_name: String,
  order_date: { type: Date, default: Date.now },
  expected_delivery: Date,
  status: { type: String, enum: ['pending', 'received', 'cancelled'], default: 'pending' },
  total_amount: { type: Number, default: 0 },
  items: [{
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    item_name: String,
    quantity: Number,
    unit_price: Number,
    total_price: Number
  }],
  created_at: { type: Date, default: Date.now }
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff', 'viewer'], default: 'staff' },
  is_active: { type: Boolean, default: true },
  last_login: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Session Schema
const sessionSchema = new mongoose.Schema({
  sessionToken: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  table_name: String,
  record_id: String,
  old_values: mongoose.Schema.Types.Mixed,
  new_values: mongoose.Schema.Types.Mixed,
  user_id: String,
  timestamp: { type: Date, default: Date.now }
});

// Pricing Schema
const pricingSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  buyer_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerType' },
  price: { type: Number, required: true },
  effective_date: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

// Quantity Tier Schema
const quantityTierSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  buyer_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerType', required: true },
  min_quantity: { type: Number, required: true },
  max_quantity: { type: Number },
  discount_percentage: { type: Number, default: 0 },
  fixed_price: { type: Number },
  tier_name: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

// Buyer Type Schema
const buyerTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  discount_percentage: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
  category: String,
  description: String,
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  receipt_url: String,
  created_at: { type: Date, default: Date.now }
});

// Refund Schema
const refundSchema = new mongoose.Schema({
  bill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  amount: { type: Number, required: true },
  reason: String,
  refund_date: { type: Date, default: Date.now },
  items: [{
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    quantity: Number,
    unit_price: Number
  }],
  created_at: { type: Date, default: Date.now }
});

// Account Schema
const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['cash', 'bank', 'digital'], required: true },
  balance: { type: Number, default: 0 },
  description: String,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  from_account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  to_account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  description: String,
  reference_id: String,
  reference_type: String,
  date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

// Create models
const Customer = mongoose.model('Customer', customerSchema);
const Vendor = mongoose.model('Vendor', vendorSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Bill = mongoose.model('Bill', billSchema);
const Serial = mongoose.model('Serial', serialSchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const Pricing = mongoose.model('Pricing', pricingSchema);
const BuyerType = mongoose.model('BuyerType', buyerTypeSchema);
const QuantityTier = mongoose.model('QuantityTier', quantityTierSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Refund = mongoose.model('Refund', refundSchema);
const Account = mongoose.model('Account', accountSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = {
  Customer,
  Vendor,
  Inventory,
  Bill,
  Serial,
  PurchaseOrder,
  User,
  Session,
  AuditLog,
  Pricing,
  BuyerType,
  QuantityTier,
  Expense,
  Refund,
  Account,
  Transaction
};
