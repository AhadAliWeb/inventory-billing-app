const express = require('express');
const router = express.Router();
const { Account, Transaction } = require('../models/schemas');
const { requireAuth, requireAdmin } = require('./auth');

// Get all accounts
router.get('/', requireAuth, async (req, res) => {
  try {
    const accounts = await Account.find({ is_active: true }).sort({ name: 1 });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new account
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, type, description, balance = 0 } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const existingAccount = await Account.findOne({ name });
    if (existingAccount) {
      return res.status(400).json({ error: 'Account with this name already exists' });
    }

    const newAccount = new Account({
      name,
      type,
      description,
      balance,
      is_active: true
    });

    const savedAccount = await newAccount.save();
    res.json({
      success: true,
      message: 'Account added successfully',
      account: savedAccount
    });
  } catch (error) {
    console.error('Error adding account:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all transactions
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('from_account_id', 'name')
      .populate('to_account_id', 'name')
      .sort({ date: -1 });
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new transaction
router.post('/transactions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      from_account_id, 
      to_account_id, 
      amount, 
      type, 
      description, 
      reference_id, 
      reference_type 
    } = req.body;
    
    if (!amount || !type || !description) {
      return res.status(400).json({ error: 'Amount, type, and description are required' });
    }

    const newTransaction = new Transaction({
      from_account_id,
      to_account_id,
      amount,
      type,
      description,
      reference_id,
      reference_type,
      date: new Date()
    });

    const savedTransaction = await newTransaction.save();

    // Update account balances if this is a transfer
    if (type === 'transfer' && from_account_id && to_account_id) {
      await Account.findByIdAndUpdate(from_account_id, { $inc: { balance: -amount } });
      await Account.findByIdAndUpdate(to_account_id, { $inc: { balance: amount } });
    } else if (type === 'income' && to_account_id) {
      await Account.findByIdAndUpdate(to_account_id, { $inc: { balance: amount } });
    } else if (type === 'expense' && from_account_id) {
      await Account.findByIdAndUpdate(from_account_id, { $inc: { balance: -amount } });
    }

    res.json({
      success: true,
      message: 'Transaction added successfully',
      transaction: savedTransaction
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get account balance
router.get('/:id/balance', requireAuth, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Calculate current balance from transactions
    const transactions = await Transaction.find({
      $or: [
        { from_account_id: req.params.id },
        { to_account_id: req.params.id }
      ]
    });

    let balance = account.balance || 0;
    
    // Recalculate balance from transactions
    transactions.forEach(transaction => {
      if (transaction.type === 'transfer') {
        if (transaction.from_account_id?.toString() === req.params.id) {
          balance -= transaction.amount;
        }
        if (transaction.to_account_id?.toString() === req.params.id) {
          balance += transaction.amount;
        }
      } else if (transaction.type === 'income' && transaction.to_account_id?.toString() === req.params.id) {
        balance += transaction.amount;
      } else if (transaction.type === 'expense' && transaction.from_account_id?.toString() === req.params.id) {
        balance -= transaction.amount;
      }
    });

    res.json({
      success: true,
      account: {
        ...account.toObject(),
        calculated_balance: balance
      }
    });
  } catch (error) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get account transactions
router.get('/:id/transactions', requireAuth, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { from_account_id: req.params.id },
        { to_account_id: req.params.id }
      ]
    })
    .populate('from_account_id', 'name')
    .populate('to_account_id', 'name')
    .sort({ date: -1 });
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update account
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, type, description } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const existingAccount = await Account.findOne({ name, _id: { $ne: req.params.id } });
    if (existingAccount) {
      return res.status(400).json({ error: 'Account with this name already exists' });
    }

    const updatedAccount = await Account.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        type, 
        description,
        updated_at: new Date()
      },
      { new: true }
    );

    if (!updatedAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      success: true,
      message: 'Account updated successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete account
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if account has transactions
    const transactionCount = await Transaction.countDocuments({
      $or: [
        { from_account_id: req.params.id },
        { to_account_id: req.params.id }
      ]
    });
    
    if (transactionCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete account with existing transactions' 
      });
    }
    
    // Soft delete by setting is_active to false
    const deletedAccount = await Account.findByIdAndUpdate(
      req.params.id,
      { is_active: false, updated_at: new Date() },
      { new: true }
    );

    if (!deletedAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 