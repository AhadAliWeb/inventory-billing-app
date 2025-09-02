import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './InventoryManagement.css';

const InventoryManagement = () => {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    quantity: '',
    unit: '',
    cost_price: '',
    selling_price: '',
    min_stock_level: '10',
    max_stock_level: '1000',
    supplier: ''
  });

  useEffect(() => {
    loadItems();
    loadVendors();
  }, []);

  const loadItems = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInventory(search);
      setItems(data);
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
        // Redirect to login
        localStorage.removeItem('authToken');
        window.location.reload();
      } else {
        setError(`Failed to load inventory items: ${error.response?.data?.error || error.message}`);
      }
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await api.getVendors();
      setVendors(data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    loadItems(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const itemData = {
        ...formData,
        quantity: parseInt(formData.quantity) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 10,
        max_stock_level: parseInt(formData.max_stock_level) || 1000,
        supplier: formData.supplier
      };

      if (editingItem) {
        await api.updateItem(editingItem._id, itemData);
        setSuccess('Charger updated successfully! ');
      } else {
        await api.addItem(itemData);
        setSuccess('New charger added successfully! ');
      }
      
      resetForm();
      loadItems(searchTerm);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save charger. Please try again.');
      console.error('Error saving item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || '',
      cost_price: item.cost_price?.toString() || '',
      selling_price: item.selling_price?.toString() || '',
      min_stock_level: item.min_stock_level?.toString() || '10',
      max_stock_level: item.max_stock_level?.toString() || '1000',
      supplier: item.supplier || ''
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this charger?')) {
      setLoading(true);
      setError(null);
      try {
        await api.deleteItem(id);
        setSuccess('Charger deleted successfully! ');
        loadItems(searchTerm);
      } catch (error) {
        setError('Failed to delete charger. Please try again.');
        console.error('Error deleting item:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      quantity: '',
      unit: '',
      cost_price: '',
      selling_price: '',
      min_stock_level: '10',
      max_stock_level: '1000',
      supplier: ''
    });
    setEditingItem(null);
    setShowForm(false);
    setError(null);
    setSuccess(null);
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getStockStatus = (quantity, minStock) => {
    if (quantity === 0) return { status: 'Out of Stock', class: 'out-of-stock' };
    if (quantity <= minStock) return { status: 'Low Stock', class: 'low-stock' };
    return { status: 'In Stock', class: 'in-stock' };
  };

  const categories = [
    'MacBook Chargers',
    'Dell Chargers', 
    'HP Chargers',
    'Lenovo Chargers',
    'ASUS Chargers',
    'Acer Chargers',
    'MSI Chargers',
    'Other'
  ];

  const units = ['Units', 'Pieces', 'Boxes', 'Sets'];

  // if (loading && items.length === 0) {
  //   return (
  //     <div className="loading-container">
  //       <div className="loading-spinner"></div>
  //       <p>Loading inventory...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="inventory-management">
      {/* Header Section */}
      <div className="inventory-header">
        <div className="header-content">
          <h1 className="page-title"> Charger Inventory Management</h1>
          <p className="page-subtitle">Manage your laptop charger stock efficiently</p>
        </div>
        <button 
          className="add-item-btn"
          onClick={() => setShowForm(true)}
        >
          <span className="btn-icon">+</span>
          Add New Charger
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search chargers by name or category..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-number">{items.length}</span>
            <span className="stat-label">Total Items</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{items.filter(item => item.quantity === 0).length}</span>
            <span className="stat-label">Out of Stock</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{items.filter(item => item.quantity <= (item.min_stock_level || 10)).length}</span>
            <span className="stat-label">Low Stock</span>
          </div>
        </div>
      </div>

      {/* Inventory Form */}
      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <div className="form-header">
              <h2>{editingItem ? 'Edit Charger' : 'Add New Charger'}</h2>
              <button className="close-btn" onClick={resetForm}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="inventory-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Charger Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., MacBook Pro 16 inch Charger"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Charger specifications..."
                  />
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Cost Price ($)</label>
                  <input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price ($) *</label>
                  <input
                    type="number"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Min Stock Level</label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                    placeholder="10"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Max Stock Level</label>
                  <input
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({...formData, max_stock_level: e.target.value})}
                    placeholder="1000"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    placeholder="e.g., Apple Inc."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingItem ? 'Update Charger' : 'Add Charger')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {
        loading ?  (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading inventory...</p>
          </div>
        ) : (
          <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Charger Info</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Pricing</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const stockStatus = getStockStatus(item.quantity, item.min_stock_level);
              return (
                <tr key={item._id} className="inventory-row">
                  <td className="item-info">
                    <div className="item-name">{item.name}</div>
                    {item.description && <div className="item-description">{item.description}</div>}
                  </td>
                  <td className="item-category">
                    <span className="category-badge">{item.category || 'Uncategorized'}</span>
                  </td>
                  <td className="item-stock">
                    <div className="stock-quantity">{item.quantity || 0}</div>
                    <div className="stock-unit">{item.unit || 'Units'}</div>
                  </td>
                  <td className="item-pricing">
                    <div className="cost-price">Cost: ${item.cost_price || 0}</div>
                    <div className="selling-price">Price: ${item.selling_price || 0}</div>
                    {item.cost_price && item.selling_price && (
                      <div className="profit-margin">
                        Margin: ${((item.selling_price - item.cost_price) * (item.quantity || 0)).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="item-status">
                    <span className={`stock-status ${stockStatus.class}`}>
                      {stockStatus.status}
                    </span>
                  </td>
                  <td className="item-actions">
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleEdit(item)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(item._id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {items.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <h3>No Chargers Found</h3>
            <p>Start by adding your first laptop charger to the inventory.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add First Charger
            </button>
          </div>
        )}
      </div>
        )
      }
      
    </div>
  );
};

export default InventoryManagement;
