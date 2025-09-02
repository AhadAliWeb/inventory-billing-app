import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import formatCurrency from '../utils/formatCurrency';
import './CustomerManagement.css';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ 
    name: '', 
    contact: '', 
    email: '',
    address: '',
    customerType: 'retail',
    taxId: '',
    creditLimit: '',
    discountRate: '',
    id: null 
  });
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const loadCustomers = async (searchTerm = '') => {
    try {
      const data = await api.getCustomers(searchTerm);
      setCustomers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    loadCustomers(value);
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const customerData = {
        name: form.name,
        contact: form.contact,
        email: form.email,
        address: form.address,
        customerType: form.customerType,
        taxId: form.taxId,
        creditLimit: parseFloat(form.creditLimit) || 0,
        discountRate: parseFloat(form.discountRate) || 0
      };

      if (editing) {
        await api.updateCustomer(form.id, customerData);
      } else {
        await api.addCustomer(customerData);
      }
      
      setForm({ 
        name: '', 
        contact: '', 
        email: '',
        address: '',
        customerType: 'retail',
        taxId: '',
        creditLimit: '',
        discountRate: '',
        id: null 
      });
      setEditing(false);
      setShowForm(false);
      setError('');
      loadCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = customer => {
    setForm({ 
      name: customer.name, 
      contact: customer.contact,
      email: customer.email || '',
      address: customer.address || '',
      customerType: customer.customerType || 'retail',
      taxId: customer.taxId || '',
      creditLimit: customer.creditLimit || '',
      discountRate: customer.discountRate || '',
      id: customer._id 
    });
    setEditing(true);
    setShowForm(true);
    setError('');
  };

  const handleAddNew = () => {
    setForm({ 
      name: '', 
      contact: '', 
      email: '',
      address: '',
      customerType: 'retail',
      taxId: '',
      creditLimit: '',
      discountRate: '',
      id: null 
    });
    setEditing(false);
    setShowForm(true);
  };

  const handleCancel = () => {
    setForm({ 
      name: '', 
      contact: '', 
      email: '',
      address: '',
      customerType: 'retail',
      taxId: '',
      creditLimit: '',
      discountRate: '',
      id: null 
    });
    setEditing(false);
    setShowForm(false);
    setError('');
  };

  const viewDetails = async (customerId) => {
    try {
      setDetailsLoading(true);
      setDetailsError('');
      const customer = await api.getCustomer(customerId);
      setSelectedCustomer(customer);
    } catch (err) {
      setDetailsError('Failed to load customer details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedCustomer(null);
    setDetailsError('');
  };

  return (
    <div className="customer-management-modern">
      <div className="customer-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">👥</span>
            Wholesale Customer Management
          </h1>
          <p className="page-subtitle">
            Manage retail and wholesale customers with advanced billing features
          </p>
        </div>
        <button 
          className="btn btn-primary add-customer-btn"
          onClick={handleAddNew}
        >
          <span>➕</span>
          Add New Customer
        </button>
      </div>

      <div className="customer-controls">
        <div className="search-section">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search customers by name, contact, or email..."
              value={search}
              onChange={handleSearch}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>
        
        <div className="filter-tabs">
          <button className="filter-tab active">All Customers</button>
          <button className="filter-tab">Wholesale</button>
          <button className="filter-tab">Retail</button>
        </div>
      </div>

      {/* Enhanced Customer Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-container customer-form-modal">
            <div className="modal-header">
              <h2>{editing ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="modal-close-btn" onClick={handleCancel}>✕</button>
            </div>
            
            <form className="enhanced-customer-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="form-group">
                  <label>Customer Type</label>
                  <select
                    name="customerType"
                    value={form.customerType}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="retail">Retail Customer</option>
                    <option value="wholesale">Wholesale Customer</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="text"
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="customer@example.com"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="form-input"
                    rows="3"
                    placeholder="Complete address"
                  />
                </div>

                {form.customerType !== 'retail' && (
                  <>
                    <div className="form-group">
                      <label>Tax ID / GST Number</label>
                      <input
                        type="text"
                        name="taxId"
                        value={form.taxId}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Tax identification number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Credit Limit (AED)</label>
                      <input
                        type="number"
                        name="creditLimit"
                        value={form.creditLimit}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label>Discount Rate (%)</label>
                      <input
                        type="number"
                        name="discountRate"
                        value={form.discountRate}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="0.00"
                        step="0.01"
                        max="50"
                      />
                    </div>
                  </>
                )}
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modern Customer Cards Grid */}
      <div className="customers-grid">
        {customers.map(customer => (
          <div key={customer._id || customer.id} className="customer-card">
            <div className="customer-card-header">
              <div className="customer-avatar">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="customer-info">
                <h3 className="customer-name">{customer.name}</h3>
                <span className={`customer-type-badge ${customer.customerType || 'retail'}`}>
                  {customer.customerType === 'wholesale' ? '🏢 Wholesale' : 
                   customer.customerType === 'distributor' ? '🏭 Distributor' : 
                   '🛒 Retail'}
                </span>
              </div>
            </div>
            
            <div className="customer-details">
              <div className="detail-row">
                <span className="detail-label">📞 Contact:</span>
                <span className="detail-value">{customer.contact || 'Not provided'}</span>
              </div>
              
              {customer.email && (
                <div className="detail-row">
                  <span className="detail-label">✉️ Email:</span>
                  <span className="detail-value">{customer.email}</span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="detail-label">📊 Total Bills:</span>
                <span className="detail-value">{customer.total_bills || 0}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">💰 Credit Due:</span>
                <span className="detail-value credit-amount">
                  {formatCurrency(customer.total_credit_due || 0)}
                </span>
              </div>
              
              {customer.customerType !== 'retail' && (
                <>
                  {customer.creditLimit && (
                    <div className="detail-row">
                      <span className="detail-label">💳 Credit Limit:</span>
                      <span className="detail-value">{formatCurrency(customer.creditLimit)}</span>
                    </div>
                  )}
                  
                  {customer.discountRate && (
                    <div className="detail-row">
                      <span className="detail-label">🏷️ Discount:</span>
                      <span className="detail-value">{customer.discountRate}%</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="customer-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => handleEdit(customer)}
              >
                ✏️ Edit
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => viewDetails(customer._id || customer.id)}
              >
                👁️ Details
              </button>
            </div>
          </div>
        ))}
        
        {customers.length === 0 && (
          <div className="no-customers">
            <div className="no-customers-icon">👥</div>
            <h3>No customers found</h3>
            <p>Start by adding your first customer</p>
            <button className="btn btn-primary" onClick={handleAddNew}>
              Add First Customer
            </button>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div className="modal">
          <div className="modal-content" style={{maxWidth: '1000px'}}>
            <h3>Customer Details</h3>
            {detailsLoading && <div className="alert">Loading...</div>}
            {detailsError && <div className="alert alert-error">{detailsError}</div>}
            {!detailsLoading && !detailsError && (
              <>
                <div className="customer-summary" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'0.75rem',marginBottom:'1rem'}}>
                  <div className="card"><strong>Name:</strong> {selectedCustomer.name}</div>
                  <div className="card"><strong>Contact:</strong> {selectedCustomer.contact || 'N/A'}</div>
                  <div className="card"><strong>Total Bills:</strong> {selectedCustomer.total_bills || 0}</div>
                  <div className="card"><strong>Total Purchase:</strong> {formatCurrency(selectedCustomer.total_purchase_amount || 0)}</div>
                  <div className="card"><strong>Pending Credit Bills:</strong> {selectedCustomer.pending_credit_bills || 0}</div>
                  <div className="card"><strong>Credit Due:</strong> {formatCurrency(selectedCustomer.total_credit_due || 0)}</div>
                </div>

                <div className="details-sections" style={{display:'grid',gridTemplateColumns:'1fr',gap:'1rem'}}>
                  <div className="purchase-history">
                    <h4>Purchase History</h4>
                    <div className="responsive-table">
                      <table className="card-table">
                        <thead>
                          <tr>
                            <th>Bill #</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th>Payment Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedCustomer.purchase_history || []).map(b => (
                            <tr key={b.id}>
                              <td>#{b.id}</td>
                              <td>{new Date(b.created_at).toLocaleDateString()}</td>
                              <td>{b.items_summary || '—'}</td>
                              <td>{formatCurrency(b.total_amount)}</td>
                              <td>{formatCurrency(b.total_paid)}</td>
                              <td>{formatCurrency(b.amount_due)}</td>
                              <td>{b.payment_status}</td>
                              <td>{b.payment_type}</td>
                            </tr>
                          ))}
                          {selectedCustomer.purchase_history?.length === 0 && (
                            <tr>
                              <td colSpan="8" className="no-data">No purchases found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="credit-payments">
                    <h4>Credit Payments</h4>
                    <div className="responsive-table">
                      <table className="card-table">
                        <thead>
                          <tr>
                            <th>Payment ID</th>
                            <th>Date</th>
                            <th>Bill #</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedCustomer.credit_payments || []).map(p => (
                            <tr key={p.id}>
                              <td>{p.id}</td>
                              <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                              <td>#{p.bill_id}</td>
                              <td>{formatCurrency(p.amount)}</td>
                            </tr>
                          ))}
                          {selectedCustomer.credit_payments?.length === 0 && (
                            <tr>
                              <td colSpan="4" className="no-data">No credit payments found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="modal-actions" style={{marginTop:'1rem',textAlign:'right'}}>
              <button className="btn btn-primary" onClick={closeDetails}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;