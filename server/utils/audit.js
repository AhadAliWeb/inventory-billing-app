// Simple audit logger utility
// Usage: logAction(db, 'create_bill', 'bill', billId, { total_amount }, userId)

function logAction(db, action, entity = null, entityId = null, details = null, userId = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, details, user_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(action, entity, entityId, details ? JSON.stringify(details) : null, userId);
  } catch (e) {
    // Don't crash app on audit failures
    // eslint-disable-next-line no-console
    console.error('Audit log failed:', e.message);
  }
}

module.exports = { logAction };


