const express = require('express');
const router = express.Router();
const { AuditLog, User } = require('../models/schemas');

router.get('/', async (req, res) => {
  try {
    const auditLogs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(500);

    // Populate user information manually since we might not have user_id as ObjectId
    const logsWithUserInfo = await Promise.all(auditLogs.map(async (log) => {
      let username = 'System';
      let full_name = 'System';
      
      if (log.user_id) {
        try {
          const user = await User.findById(log.user_id);
          if (user) {
            username = user.username;
            full_name = user.full_name || user.username;
          }
        } catch (err) {
          // If user_id is not a valid ObjectId, keep default values
        }
      }
      
      return {
        ...log.toObject(),
        username,
        full_name
      };
    }));

    res.json(logsWithUserInfo);
  } catch (e) {
    console.error('Error fetching audit logs:', e);
    res.status(500).json({ error: e.message });
  }
});

// Create audit log entry
router.post('/', async (req, res) => {
  try {
    const { action, table_name, record_id, old_values, new_values, user_id } = req.body;
    
    const auditLog = new AuditLog({
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      user_id,
      timestamp: new Date()
    });
    
    const savedLog = await auditLog.save();
    res.json(savedLog);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs for specific entity
router.get('/entity/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    
    const logs = await AuditLog.find({
      table_name: table,
      record_id: id
    }).sort({ timestamp: -1 });
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;