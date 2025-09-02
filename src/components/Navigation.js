import React, { useState } from 'react';
import './Navigation.css';

const Navigation = ({ currentView, onViewChange, onLogout, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (view) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Overview & Analytics'
    },
    {
      id: 'inventory',
      label: 'Charger Inventory',
      icon: '🔌',
      description: 'Manage Charger Stock'
    },
    {
      id: 'customers',
      label: 'Wholesale Customers',
      icon: '🏢',
      description: 'Customer Management'
    },
    {
      id: 'billing',
      label: 'Billing System',
      icon: '💰',
      description: 'Create Bills & Invoices'
    },
    {
      id: 'administration',
      label: 'Administration',
      icon: '⚙️',
      description: 'System Settings',
      adminOnly: true
    }
  ];

  return (
    <nav className="navigation">
      {/* Mobile Menu Button */}
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Navigation Menu */}
      <div className={`nav-menu ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="nav-header">
          <div className="user-profile">
            <div className="profile-avatar">
              <span>👤</span>
            </div>
            <div className="profile-info">
              <h3 className="user-name">{user?.full_name || 'User'}</h3>
              <p className="user-role">{user?.role || 'Staff'}</p>
            </div>
          </div>
        </div>

        <div className="nav-items">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') {
              return null;
            }
            
            return (
              <button
                key={item.id}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.id)}
              >
                <div className="nav-item-icon">{item.icon}</div>
                <div className="nav-item-content">
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-description">{item.description}</span>
                </div>
                {currentView === item.id && <div className="nav-item-indicator"></div>}
              </button>
            );
          })}
        </div>

        <div className="nav-footer">
          <button className="logout-button" onClick={onLogout}>
            <span className="logout-icon">🚪</span>
            <span className="logout-text">Logout</span>
          </button>
          
          <div className="app-version">
            <span className="version-text">Charger Pro v2.0</span>
            <span className="version-tag">Wholesale Edition</span>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={toggleMobileMenu}></div>
      )}
    </nav>
  );
};

export default Navigation;
