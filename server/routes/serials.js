const express = require('express');
const router = express.Router();
const db = require('../database');
const { logAction } = require('../utils/audit');

// Generate and assign serials for a given item and quantity
router.post('/generate', (req, res) => {
  const { item_id, quantity, prefix = 'SN', cost_price, purchase_date } = req.body;
  if (!item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'item_id and positive quantity are required' });
  }

  try {
    const result = db.transaction(() => {
      const serials = [];
      const insert = db.prepare(`
        INSERT INTO item_serials (item_id, serial_code, cost_price, purchase_date)
        VALUES (?, ?, ?, ?)
      `);
      for (let i = 0; i < quantity; i++) {
        const code = `${prefix}-${item_id}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        insert.run(item_id, code, cost_price || null, purchase_date || null);
        serials.push(code);
      }
      // Increase stock quantity accordingly
      const updateQty = db.prepare('UPDATE items SET quantity = quantity + ? WHERE id = ?');
      updateQty.run(quantity, item_id);
      return serials;
    })();
    // Audit
    logAction(db, 'generate_serials', 'item', item_id, { quantity, prefix });
    res.json({ serials: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Print-ready labels data (define before generic :serial_code route)
router.get('/labels/by-item/:item_id', (req, res) => {
  const { item_id } = req.params;
  try {
    const serials = db.prepare("SELECT serial_code FROM item_serials WHERE item_id = ? AND status = 'in_stock'").all(item_id);
    res.json({ item_id: Number(item_id), serials });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lookup an item by serial code
router.get('/:serial_code', (req, res) => {
  const { serial_code } = req.params;
  try {
    const record = db.prepare(`
      SELECT s.*, i.name, i.category, i.price
      FROM item_serials s
      JOIN items i ON s.item_id = i.id
      WHERE s.serial_code = ?
    `).get(serial_code);
    if (!record) return res.status(404).json({ error: 'Serial not found' });
    res.json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a serial (for admin use)
router.delete('/:serial_code', (req, res) => {
  const { serial_code } = req.params;
  try {
    const serial = db.prepare('SELECT * FROM item_serials WHERE serial_code = ?').get(serial_code);
    if (!serial) {
      return res.status(404).json({ error: 'Serial not found' });
    }
    
    // Only allow deletion of in_stock serials
    if (serial.status !== 'in_stock') {
      return res.status(400).json({ error: 'Cannot delete sold or assigned serials' });
    }
    
    // Delete the serial and reduce inventory count
    db.transaction(() => {
      db.prepare('DELETE FROM item_serials WHERE serial_code = ?').run(serial_code);
      db.prepare('UPDATE items SET quantity = quantity - 1 WHERE id = ?').run(serial.item_id);
    })();
    
    // Audit log
    logAction(db, 'delete_serial', 'item_serial', serial.id, { serial_code, item_id: serial.item_id });
    res.json({ success: true, message: 'Serial deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;


