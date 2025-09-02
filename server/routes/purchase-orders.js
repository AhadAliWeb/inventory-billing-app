const express = require('express');
const router = express.Router();
const db = require('../database');

// Get all purchase orders
router.get('/', (req, res) => {
  try {
    const purchaseOrders = db.prepare(`
      SELECT 
        po.*,
        v.name as vendor_name,
        COUNT(poi.id) as items_count,
        COALESCE(SUM(vp.amount), 0) as total_paid
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      LEFT JOIN vendor_payments vp ON po.id = vp.purchase_order_id
      GROUP BY po.id
      ORDER BY po.created_at DESC
    `).all();
    res.json(purchaseOrders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get purchase order by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const order = db.prepare(`
      SELECT 
        po.*,
        v.name as vendor_name,
        v.contact as vendor_contact,
        v.email as vendor_email
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get items for a specific purchase order
router.get('/:id/items', (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate purchase order exists
    const order = db.prepare('SELECT id FROM purchase_orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const items = db.prepare(`
      SELECT 
        poi.*,
        i.name as item_name,
        i.category as item_category,
        i.model as item_model
      FROM purchase_order_items poi
      JOIN items i ON poi.item_id = i.id
      WHERE poi.purchase_order_id = ?
      ORDER BY i.name
    `).all(id);

    res.json(items);
  } catch (error) {
    console.error('Error fetching purchase order items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new purchase order
router.post('/', (req, res) => {
  const { vendor_id, items } = req.body;

  if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Vendor ID and items are required' });
  }

  try {
    const result = db.transaction(() => {
      // Calculate total amount
      const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);

      // Create purchase order
      const orderStmt = db.prepare(`
        INSERT INTO purchase_orders (
          vendor_id, total_amount, amount_due, 
          payment_status, status
        ) VALUES (?, ?, ?, 'unpaid', 'pending')
      `);
      const orderResult = orderStmt.run(vendor_id, total_amount, total_amount);
      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      const itemStmt = db.prepare(`
        INSERT INTO purchase_order_items (
          purchase_order_id, item_id, quantity,
          price_per_unit, total_price
        ) VALUES (?, ?, ?, ?, ?)
      `);

      items.forEach(item => {
        itemStmt.run(
          orderId,
          item.item_id,
          item.quantity,
          item.price_per_unit,
          item.quantity * item.price_per_unit
        );
      });

      // Update vendor's total dues
      const updateVendorStmt = db.prepare(`
        UPDATE vendors 
        SET total_dues = total_dues + ?
        WHERE id = ?
      `);
      updateVendorStmt.run(total_amount, vendor_id);

      // Get the created order with details
      return db.prepare(`
        SELECT 
          po.*,
          v.name as vendor_name,
          COUNT(poi.id) as items_count
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        WHERE po.id = ?
        GROUP BY po.id
      `).get(orderId);
    })();

    res.json(result);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update purchase order status
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required' });
  }

  try {
    const result = db.transaction(() => {
      const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
      if (!order) {
        throw new Error('Purchase order not found');
      }

      // Update order status
      const updateOrderStmt = db.prepare(`
        UPDATE purchase_orders SET status = ? WHERE id = ?
      `);
      updateOrderStmt.run(status, id);

      // If completed, update item quantities and vendor items
      if (status === 'completed') {
        const items = db.prepare(`
          SELECT 
            poi.*,
            i.vendor_id as current_vendor_id
          FROM purchase_order_items poi
          JOIN items i ON poi.item_id = i.id
          WHERE poi.purchase_order_id = ?
        `).all(id);

        const updateItemStmt = db.prepare(`
          UPDATE items 
          SET quantity = quantity + ?,
              vendor_id = ?,
              purchase_price = ?
          WHERE id = ?
        `);

        items.forEach(item => {
          updateItemStmt.run(
            item.quantity,
            order.vendor_id,
            item.price_per_unit,
            item.item_id
          );
        });
      }

      return db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    })();

    res.json(result);
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update received quantities
router.put('/:id/received', (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const result = db.transaction(() => {
      const updateItemStmt = db.prepare(`
        UPDATE purchase_order_items 
        SET received_quantity = ?
        WHERE purchase_order_id = ? AND item_id = ?
      `);

      items.forEach(item => {
        updateItemStmt.run(item.received_quantity, id, item.item_id);
      });

      // Check if all items are received
      const allReceived = db.prepare(`
        SELECT COUNT(*) as count
        FROM purchase_order_items
        WHERE purchase_order_id = ? 
        AND received_quantity < quantity
      `).get(id);

      if (allReceived.count === 0) {
        // Auto-complete the order if all items are received
        db.prepare(`
          UPDATE purchase_orders 
          SET status = 'completed'
          WHERE id = ?
        `).run(id);
      }

      return db.prepare(`
        SELECT poi.*, i.name as item_name
        FROM purchase_order_items poi
        JOIN items i ON poi.item_id = i.id
        WHERE poi.purchase_order_id = ?
      `).all(id);
    })();

    res.json(result);
  } catch (error) {
    console.error('Error updating received quantities:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 