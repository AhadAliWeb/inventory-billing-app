import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import InventoryManagement from './components/InventoryManagement';
import CustomerManagement from './components/CustomerManagement';
import BillingSystem from './components/BillingSystem';
import Administration from './components/Administration';
import Login from './components/Login';
import Navigation from './components/Navigation';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      // Validate token and set user
      setIsAuthenticated(true);
      setCurrentView('dashboard');
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('authToken');
    setCurrentView('login');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'inventory':
        return <InventoryManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'billing':
        return <BillingSystem />;
      case 'administration':
        return <Administration />;
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <div className="app-header">
        <h1 className="app-title">🔌 Laptop Charger Wholesaler Pro</h1>
        <p className="app-subtitle">Professional Inventory & Billing Management System</p>
      </div>
      
      <Navigation 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout}
        user={user}
      />
      
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

export default App;