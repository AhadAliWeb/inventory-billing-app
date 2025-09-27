const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Initialize MongoDB connection
require('./database');

const app = express();
const port = process.env.PORT;



// // Now go to build folder and now go to index.html

// const staticPath = path.join(path.dirname(__filename), '..', 'build', 'index.html');

// // Serve static files from the build folder


// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/purchase-orders', require('./routes/purchase-orders'));
app.use('/api/accounts', require('./routes/accounts'));

// Optional routes
try { app.use('/api/serials', require('./routes/serials')); } catch (e) {}
try { app.use('/api/audit', require('./routes/audit')); } catch (e) {}
try { app.use('/api/reports', require('./routes/reports')); } catch (e) {}
try { app.use('/api/refunds', require('./routes/refunds')); } catch (e) {}


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


if (process.env.NODE_ENV === "production") {
  console.log("Production mode");
  const serverDir = __dirname; // directory of this file (server/)
  const projectRoot = path.join(serverDir, ".."); // go up to project root
  const buildDir = path.join(projectRoot, "build");

  app.use(express.static(buildDir));

  app.get("*", (req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });
}



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});