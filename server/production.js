/**
 * Simple production server configuration
 * This file configures the server to serve the React production build
 */

const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../public')));

// Handle any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Production server running on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser`);
});