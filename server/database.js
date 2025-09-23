const mongoose = require('mongoose');
const dotenv = require("dotenv");
dotenv.config()

// MongoDB connection string
// add local mongodb uri here
const MONGODB_URI = process.env.MONGO_URI 

// 'mongodb+srv://danielsmith4hd:Qw4hddqcrg@art.v75zq7w.mongodb.net/inventory_billing_db?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB database');
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Export mongoose instance
module.exports = mongoose;