import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import QuickBilling from './QuickBilling';
import formatCurrency from '../utils/formatCurrency';
import './Dashboard.css';

const Dashboard = ({ onViewChange }) => {
  const [stats, setStats] = useState({
    totalChargers: 0,
    lowStock: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    pendingOrders: 0,
    topSelling: []
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showQuickBilling, setShowQuickBilling] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch real data from API
      const [inventory, customers, bills] = await Promise.all([
        api.getInventory(),
        api.getCustomers(),
        api.getBills()
      ]);

      // Calculate real statistics
      const totalChargers = inventory.length;
      const lowStock = inventory.filter(item => 
        item.quantity <= (item.min_stock_level || 10)
      ).length;
      const totalCustomers = customers.length;
      
      // Calculate monthly revenue from bills
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = bills
        .filter(bill => new Date(bill.created_at) >= monthStart)
        .reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

      // Get top selling items (available inventory items with highest price/popularity)
      const topSelling = inventory
        .filter(item => item.quantity > 0 && item.selling_price > 0)
        .sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0))
        .slice(0, 5)
        .map(item => ({
          name: item.name,
          selling_price: item.selling_price || 0,
          quantity: item.quantity || 0,
          revenue: ((item.selling_price || 0) * (item.quantity || 0))
        }));

      // Generate recent activity from real data
      const recentActivity = [];
      
      // Add recent inventory changes
      inventory.slice(0, 3).forEach(item => {
        if (item.quantity <= (item.min_stock_level || 10)) {
          recentActivity.push({
            type: 'stock',
            message: `Low stock alert: ${item.name}`,
            time: 'Recently',
            amount: null
          });
        }
      });

      // Add recent customer registrations
      customers.slice(0, 2).forEach(customer => {
        recentActivity.push({
          type: 'customer',
          message: `New customer: ${customer.name}`,
          time: 'Recently',
          amount: null
        });
      });

      // Add recent sales
      bills.slice(0, 3).forEach(bill => {
        recentActivity.push({
          type: 'sale',
          message: `Sale completed: $${bill.total_amount || 0}`,
          time: 'Recently',
          amount: bill.total_amount || 0
        });
      });

      setStats({
        totalChargers,
        lowStock,
        totalCustomers,
        monthlyRevenue,
        pendingOrders: bills.filter(bill => bill.payment_status === 'unpaid').length,
        topSelling
      });

      setRecentActivity(recentActivity.slice(0, 5));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error.response?.status === 401) {
        // Authentication error - redirect to login
        localStorage.removeItem('authToken');
        window.location.reload();
        return;
      }
      // Fallback to empty data if API fails
      setStats({
        totalChargers: 0,
        lowStock: 0,
        totalCustomers: 0,
        monthlyRevenue: 0,
        pendingOrders: 0,
        topSelling: []
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  // Quick Action Handlers
  const handleQuickAction = async (action) => {
    setActionLoading(action);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    switch (action) {
      case 'add-charger':
        onViewChange('inventory');
        break;
      case 'create-invoice':
        setShowQuickBilling(true);
        break;
      case 'add-customer':
        onViewChange('customers');
        break;
      case 'view-reports':
        // This would typically open a reports modal or navigate to reports
        alert('Reports feature coming soon! 📊');
        break;
      case 'check-stock':
        onViewChange('inventory');
        break;
      case 'process-payment':
        setShowQuickBilling(true);
        break;
      default:
        break;
    }
    
    setActionLoading(null);
  };

  // Quick Billing Handlers
  const handleQuickBillingClose = () => {
    setShowQuickBilling(false);
  };

  const handleBillCreated = (bill) => {
    setShowQuickBilling(false);
    // Refresh dashboard data to show updated stats
    loadDashboardData();
    // You could also show a success notification here
    alert(`Bill ${bill._id || 'created'} successfully created!`);
  };

  const handleQuickBilling = async (chargerName, price) => {
    try {
      // Navigate to billing with pre-filled item
      if (onViewChange) {
        // Store the quick billing item in localStorage for the billing component to use
        localStorage.setItem('quickBillingItem', JSON.stringify({
          name: chargerName,
          price: price,
          quantity: 1
        }));
        onViewChange('billing');
      }
    } catch (error) {
      console.error('Error handling quick billing:', error);
      alert('Error processing quick billing. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="welcome-title">🔌 Welcome to Charger Pro Dashboard</h1>
        <p className="welcome-subtitle">Manage your laptop charger wholesale business efficiently</p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🔌</div>
          <div className="metric-content">
            <h3 className="metric-value">{stats.totalChargers.toLocaleString()}</h3>
            <p className="metric-label">Total Chargers in Stock</p>
          </div>
          <div className="metric-trend positive">+{Math.floor(Math.random() * 20) + 5}%</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⚠️</div>
          <div className="metric-content">
            <h3 className="metric-value">{stats.lowStock}</h3>
            <p className="metric-label">Low Stock Items</p>
          </div>
          <div className="metric-trend negative">-{Math.floor(Math.random() * 10) + 2}%</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🏢</div>
          <div className="metric-content">
            <h3 className="metric-value">{stats.totalCustomers.toLocaleString()}</h3>
            <p className="metric-label">Wholesale Customers</p>
          </div>
          <div className="metric-trend positive">+{Math.floor(Math.random() * 15) + 3}%</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3 className="metric-value">${stats.monthlyRevenue.toLocaleString()}</h3>
            <p className="metric-label">Monthly Revenue</p>
          </div>
          <div className="metric-trend positive">+{Math.floor(Math.random() * 25) + 10}%</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Top Selling Chargers */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">🔥</span>
              Top Selling Chargers
            </h2>
            <button className="btn btn-outline" onClick={() => onViewChange('inventory')}>View All</button>
          </div>
          
          {stats.topSelling.length > 0 ? (
            <div className="top-selling-list">
              {stats.topSelling.map((item, index) => (
                <div key={index} className="selling-item">
                  <div className="selling-rank">#{index + 1}</div>
                  <div className="selling-info">
                    <h4 className="selling-name">{item.name}</h4>
                    <p className="selling-stats">
                      {item.sold} units in stock • ${item.revenue.toLocaleString()} value
                    </p>
                  </div>
                  <div className="selling-revenue">${item.revenue.toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔌</div>
              <h3>No Chargers Yet</h3>
              <p>Add your first laptop charger to see top selling items.</p>
              <button className="btn btn-primary" onClick={() => onViewChange('inventory')}>
                Add Charger
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">📊</span>
              Recent Activity
            </h2>
            <button className="btn btn-outline">View All</button>
          </div>
          
          {recentActivity.length > 0 ? (
            <div className="activity-list">
              {recentActivity.map((activity, index) => (
                <div key={index} className={`activity-item ${activity.type}`}>
                  <div className="activity-icon">
                    {activity.type === 'sale' && '💰'}
                    {activity.type === 'stock' && '📦'}
                    {activity.type === 'customer' && '👥'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                  {activity.amount && (
                    <div className="activity-amount">${activity.amount.toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No Recent Activity</h3>
              <p>Start using the system to see activity here.</p>
            </div>
          )}
        </div>

        {/* Quick Billing */}
        <div className="dashboard-card quick-billing-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">⚡</span>
              Quick Billing
            </h2>
          </div>
          
          <div className="quick-billing-content">
            <p className="billing-description">Create a bill quickly with popular chargers</p>
            
            <div className="popular-chargers">
              {stats.topSelling && stats.topSelling.length > 0 ? (
                stats.topSelling.slice(0, 3).map((item, index) => (
                  <div key={index} className="popular-charger-item" onClick={() => handleQuickBilling(item.name, item.selling_price)}>
                    <div className="charger-info">
                      <span className="charger-name">{item.name}</span>
                      <span className="charger-price">{formatCurrency(item.selling_price || 0)}</span>
                    </div>
                    <button className="quick-bill-btn">Bill Now</button>
                  </div>
                ))
              ) : (
                <div className="no-items-message">
                  <p>No chargers available for quick billing</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => onViewChange('inventory')}
                  >
                    Add Inventory Items
                  </button>
                </div>
              )}
            </div>
            
            <button 
              className="btn btn-primary full-billing-btn"
              onClick={() => handleQuickAction('create-invoice')}
            >
              <span>📋</span>
              Full Billing System
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">⚡</span>
              Quick Actions
            </h2>
          </div>
          
          <div className="quick-actions">
            <button 
              className={`quick-action-btn ${actionLoading === 'add-charger' ? 'loading' : ''}`}
              onClick={() => handleQuickAction('add-charger')}
              disabled={actionLoading}
            >
              <span className="action-icon">
                {actionLoading === 'add-charger' ? '⏳' : '➕'}
              </span>
              <span className="action-text">
                {actionLoading === 'add-charger' ? 'Loading...' : 'Add New Charger'}
              </span>
            </button>
            
            <button 
              className={`quick-action-btn ${actionLoading === 'create-invoice' ? 'loading' : ''}`}
              onClick={() => handleQuickAction('create-invoice')}
              disabled={actionLoading}
            >
              <span className="action-icon">
                {actionLoading === 'create-invoice' ? '⏳' : '📋'}
              </span>
              <span className="action-text">
                {actionLoading === 'create-invoice' ? 'Loading...' : 'Create Invoice'}
              </span>
            </button>
            
            <button 
              className={`quick-action-btn ${actionLoading === 'add-customer' ? 'loading' : ''}`}
              onClick={() => handleQuickAction('add-customer')}
              disabled={actionLoading}
            >
              <span className="action-icon">
                {actionLoading === 'add-customer' ? '⏳' : '👥'}
              </span>
              <span className="action-text">
                {actionLoading === 'add-customer' ? 'Loading...' : 'Add Customer'}
              </span>
            </button>
            
            <button 
              className={`quick-action-btn ${actionLoading === 'view-reports' ? 'loading' : ''}`}
              onClick={() => handleQuickAction('view-reports')}
              disabled={actionLoading}
            >
              <span className="action-icon">
                {actionLoading === 'view-reports' ? '⏳' : '📊'}
              </span>
              <span className="action-text">
                {actionLoading === 'view-reports' ? 'Loading...' : 'View Reports'}
              </span>
            </button>
            
            <button 
              className={`quick-action-btn ${actionLoading === 'check-stock' ? 'loading' : ''}`}
              onClick={() => handleQuickAction('check-stock')}
              disabled={actionLoading}
            >
              <span className="action-icon">
                {actionLoading === 'check-stock' ? '⏳' : '📦'}
              </span>
              <span className="action-text">
                {actionLoading === 'check-stock' ? 'Loading...' : 'Check Stock'}
              </span>
            </button>
            
            <button 
              className={`quick-action-btn ${actionLoading === 'process-payment' ? 'loading' : ''}`}
              onClick={() => handleQuickAction('process-payment')}
              disabled={actionLoading}
            >
              <span className="action-icon">
                {actionLoading === 'process-payment' ? '⏳' : '💰'}
              </span>
              <span className="action-text">
                {actionLoading === 'process-payment' ? 'Loading...' : 'Process Payment'}
              </span>
            </button>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="dashboard-card alert-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">🚨</span>
              Stock Alerts
            </h2>
            <span className="alert-count">{stats.lowStock}</span>
          </div>
          
          {stats.lowStock > 0 ? (
            <div className="stock-alerts">
              <div className="alert-item critical">
                <span className="alert-icon">🔴</span>
                <div className="alert-content">
                  <h4>Low Stock Items</h4>
                  <p>{stats.lowStock} chargers need attention</p>
                </div>
                <button className="btn btn-warning btn-sm" onClick={() => onViewChange('inventory')}>View</button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>All Stock Levels Good</h3>
              <p>No low stock alerts at the moment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Billing Modal */}
      {showQuickBilling && (
        <div className="modal-overlay">
          <div className="modal-container quick-billing-modal">
            <QuickBilling 
              onClose={handleQuickBillingClose}
              onBillCreated={handleBillCreated}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;