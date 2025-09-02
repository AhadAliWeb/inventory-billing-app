import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import formatCurrency from '../utils/formatCurrency';

const QuickBilling = ({ onClose, onBillCreated }) => {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [billId, setBillId] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isWalkInCustomer, setIsWalkInCustomer] = useState(true);
  const [paymentType, setPaymentType] = useState('cash');
  const [buyerType, setBuyerType] = useState('Local');
  const [amountPaid, setAmountPaid] = useState(0);
  
  // Enhanced features for quick billing
  const [quickMode, setQuickMode] = useState(false);
  const [recentItems, setRecentItems] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);

  useEffect(() => {
    loadItems();
    loadCustomers();
    generateBillId();
  }, []);

  // Add keyboard shortcuts for super fast billing
  useEffect(() => {
    const handleKeyPress = (e) => {
      // F1 - Toggle between modes
      if (e.key === 'F1') {
        e.preventDefault();
        setQuickMode(!quickMode);
      }
      // F2 - Focus barcode scanner
      if (e.key === 'F2') {
        e.preventDefault();
        document.querySelector('.barcode-input')?.focus();
      }
      // F3 - Create bill quickly
      if (e.key === 'F3') {
        e.preventDefault();
        if (cart.length > 0) {
          handleCreateBill();
        }
      }
      // Escape - Clear cart
      if (e.key === 'Escape') {
        setCart([]);
        setBarcode('');
      }
      // Enter in barcode field
      if (e.key === 'Enter' && e.target.classList.contains('barcode-input')) {
        e.preventDefault();
        handleBarcodeSearch(barcode);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [quickMode, cart, barcode]);

  const loadItems = async () => {
    try {
      const data = await api.getInventory();
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const generateBillId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    setBillId(`BILL-${timestamp}-${random}`);
  };

  const addToCart = (item) => {
    // Ensure price is a valid number
    const itemPrice = parseFloat(item.price) || 0;
    const itemWithValidPrice = { ...item, price: itemPrice };
    
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...itemWithValidPrice, quantity: 1 }]);
    }
    
    // Auto-update amount paid for cash payments
    if (paymentType === 'cash') {
      setTimeout(() => setAmountPaid(getTotal()), 100);
    }
  };

  const updateCartQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      const item = items.find(item => item.id === id);
      if (quantity > item.quantity) {
        alert('Not enough stock available');
        return;
      }
      setCart(cart.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getSubtotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    return subtotal;
  };

  const getDiscount = () => {
    const subtotal = getSubtotal();
    return (subtotal * discount) / 100;
  };

  const getTax = () => {
    const subtotalAfterDiscount = getSubtotal() - getDiscount();
    return (subtotalAfterDiscount * taxRate) / 100;
  };

  const getTotal = () => {
    return getSubtotal() - getDiscount() + getTax();
  };

  // Enhanced item addition with quick quantity
  const quickAddItem = (item, quantity = 1) => {
    // Ensure price is a valid number
    const itemPrice = parseFloat(item.price) || 0;
    const itemWithValidPrice = { ...item, price: itemPrice };
    
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + quantity }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...itemWithValidPrice, quantity }]);
    }
    
    // Update amount paid to total if cash payment
    if (paymentType === 'cash') {
      setTimeout(() => setAmountPaid(getTotal()), 100);
    }
  };

  // Barcode scanner functionality
  const handleBarcodeSearch = (code) => {
    const item = items.find(item => 
      item.barcode === code || 
      item.id.toString() === code ||
      item.name.toLowerCase().includes(code.toLowerCase())
    );
    if (item) {
      quickAddItem(item);
      setBarcode('');
    } else {
      alert('Item not found!');
    }
  };

  const handleCreateBill = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    if (paymentType === 'credit' && isWalkInCustomer) {
      alert('Credit payment is only available for existing customers');
      return;
    }

    if (paymentType === 'credit' && !selectedCustomer) {
      alert('Please select a customer for credit payment');
      return;
    }

    const subtotal = getSubtotal();
    if (amountPaid > subtotal) {
      alert('Amount paid cannot be greater than total amount');
      return;
    }

    setLoading(true);
    try {
      const billItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price
      }));

      const billData = {
        customer_id: isWalkInCustomer ? null : selectedCustomer?.id,
        total_amount: getTotal(),
        discount: getDiscount(),
        tax: getTax(),
        items: billItems,
        payment_method: paymentType,
        amount_paid: amountPaid,
        buyer_type: buyerType
      };

      console.log('Sending bill data:', JSON.stringify(billData, null, 2));

      const response = await api.createBill(billData);
      
      console.log('Bill created successfully:', response);
      
      printBill(response.id || billId);
      
      setCart([]);
      generateBillId();
      setAmountPaid(0);
      
      if (onBillCreated) {
        onBillCreated();
      }
      
      alert('Bill created and printed successfully!');
    } catch (error) {
      console.error('Error creating bill:', error);
      console.error('Error response:', error.response);
      alert('Error creating bill: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const printBill = (actualBillId) => {
    const printWindow = window.open('', '_blank');
    const billContent = `
      <html>
        <head>
          <title>Quick Bill - ${actualBillId}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 20px; 
              background: #fff;
              color: #333;
            }
            .bill-header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #3498db;
              padding-bottom: 20px;
            }
            .bill-header h1 {
              color: #3498db;
              font-size: 28px;
              margin: 0 0 10px 0;
              font-weight: bold;
            }
            .bill-details { 
              margin-bottom: 30px; 
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
            }
            .bill-info {
              flex: 1;
              min-width: 200px;
            }
            .bill-id {
              font-size: 18px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px 8px; 
              text-align: left; 
            }
            th { 
              background: linear-gradient(135deg, #3498db, #2980b9);
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            tr:hover {
              background-color: #e3f2fd;
            }
            .total { 
              font-weight: bold; 
              font-size: 20px; 
              color: #2c3e50;
              text-align: right;
              padding: 20px;
              background: #ecf0f1;
              border-radius: 8px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #7f8c8d;
              font-size: 14px;
            }
            
            @media print {
              body { margin: 0; padding: 15px; }
              .bill-header h1 { font-size: 24px; margin-bottom: 10px; }
              table { page-break-inside: avoid; }
              .footer { margin-top: 20px; }
            }
            
            @media screen and (max-width: 600px) {
              body { margin: 10px; }
              table { font-size: 14px; }
              th, td { padding: 8px 6px; }
              .bill-header h1 { font-size: 22px; }
              .total { font-size: 18px; }
              .bill-details { flex-direction: column; }
            }
          </style>
        </head>
        <body>
          <div class="bill-header">
            <h1>QUICK BILL</h1>
            <p style="margin: 5px 0; color: #7f8c8d;">Inventory & Billing System</p>
          </div>
          <div class="bill-details">
            <div class="bill-info">
              <div class="bill-id">Bill ID: ${actualBillId}</div>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            </div>
            <div class="bill-info">
              <p><strong>Customer:</strong> ${isWalkInCustomer ? 'Walk-in Customer' : `${selectedCustomer.name} (${selectedCustomer.contact || 'No contact'})`}</p>
              <p><strong>Items:</strong> ${cart.length} items</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map(item => `
                <tr>
                  <td><strong>${item.name}</strong><br><small style="color: #7f8c8d;">${item.category}</small></td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td><strong>${formatCurrency(item.quantity * item.price)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <strong>TOTAL AMOUNT: ${formatCurrency(getSubtotal())}</strong>
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated by Inventory & Billing System</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(billContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (customer.contact && customer.contact.toLowerCase().includes(customerSearchTerm.toLowerCase()))
  );

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="quick-billing-modal">
      <div className="quick-billing-content">
        <div className="quick-billing-header super-enhanced">
          <div className="header-left">
            <div className="title-section">
              <h2>⚡ Super Quick Billing</h2>
              <div className="bill-id-mini">ID: {billId.split('-').pop()}</div>
            </div>
            <div className="mode-toggle">
              <button 
                onClick={() => setQuickMode(!quickMode)}
                className={`mode-btn ${quickMode ? 'active' : ''}`}
                title="Toggle mode (F1)"
              >
                {quickMode ? '🏃‍♂️ Express Mode' : '⚡ Quick Mode'}
              </button>
            </div>
          </div>
          
          <div className="header-center">
            {/* Enhanced Barcode Scanner */}
            <div className="barcode-scanner enhanced">
              <div className="scanner-icon">📱</div>
              <input
                type="text"
                placeholder="🔍 Scan barcode or search item..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch(barcode)}
                className="barcode-input enhanced"
                autoFocus
              />
              <button 
                onClick={() => handleBarcodeSearch(barcode)} 
                className="scan-btn enhanced"
                disabled={!barcode.trim()}
              >
                ➕ Add
              </button>
            </div>
          </div>
          
          <div className="header-right">
            <div className="shortcuts-info">
              <div className="shortcut-item" title="Toggle mode">F1</div>
              <div className="shortcut-item" title="Focus scanner">F2</div>
              <div className="shortcut-item" title="Create bill">F3</div>
              <div className="shortcut-item" title="Clear all">ESC</div>
            </div>
            <button onClick={onClose} className="close-btn enhanced">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className="quick-billing-body">
          <div className="bill-id-section">
            <div className="bill-id-display">
              <span className="bill-id-label">Bill ID:</span>
              <span className="bill-id-value">{billId}</span>
            </div>
            <button onClick={generateBillId} className="regenerate-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              New ID
            </button>
          </div>

          <div className="customer-selection-section">
            <h3>👤 Customer Selection</h3>
            <div className="customer-type-toggle">
              <button 
                className={`toggle-btn ${isWalkInCustomer ? 'active' : ''}`}
                onClick={() => {
                  setIsWalkInCustomer(true);
                  setSelectedCustomer(null);
                }}
              >
                Walk-in Customer
              </button>
              <button 
                className={`toggle-btn ${!isWalkInCustomer ? 'active' : ''}`}
                onClick={() => setIsWalkInCustomer(false)}
              >
                Existing Customer
              </button>
            </div>

            {!isWalkInCustomer && (
              <div className="customer-search">
                {selectedCustomer ? (
                  <div className="selected-customer-display">
                    <div className="selected-customer-info">
                      <h4>{selectedCustomer.name}</h4>
                      {selectedCustomer.contact && (
                        <p className="customer-contact">{selectedCustomer.contact}</p>
                      )}
                    </div>
                    <button 
                      className="change-customer-btn"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      Change Customer
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search customers by name or contact..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="search-input"
                      />
                      <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                      </svg>
                    </div>
                    
                    <div className="customers-list">
                      {filteredCustomers.length === 0 ? (
                        <div className="no-customers">
                          <p>No customers found</p>
                        </div>
                      ) : (
                        filteredCustomers.map(customer => (
                          <div 
                            key={customer.id} 
                            className="customer-card"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <div className="customer-info">
                              <h4>{customer.name}</h4>
                              {customer.contact && <p className="customer-contact">{customer.contact}</p>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {quickMode ? (
            /* Express Mode - Simplified Interface */
            <div className="express-mode">
              <div className="express-items">
                <h3>⚡ Express Item Selection</h3>
                <div className="express-grid">
                  {items.slice(0, 12).map(item => {
                    const itemPrice = parseFloat(item.price) || 0;
                    const isOutOfStock = item.quantity <= 0;
                    const isLowStock = item.quantity <= 5 && item.quantity > 0;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => !isOutOfStock && quickAddItem(item)}
                        className={`express-item-btn super ${isOutOfStock ? 'disabled' : ''} ${isLowStock ? 'low-stock' : ''}`}
                        disabled={isOutOfStock}
                      >
                        <div className="express-item-name">{item.name}</div>
                        <div className="express-item-price">{formatCurrency(itemPrice)}</div>
                        <div className="express-stock-info">
                          {isOutOfStock ? '❌' : isLowStock ? `⚠️${item.quantity}` : `✅${item.quantity}`}
                        </div>
                        {!isOutOfStock && <div className="express-add-icon">➕</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="express-cart">
                <h3>🛒 Quick Cart</h3>
                {cart.length === 0 ? (
                  <p>No items added yet</p>
                ) : (
                  <div className="express-cart-items">
                    {cart.map(item => (
                      <div key={item.id} className="express-cart-item">
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                        <button onClick={() => removeFromCart(item.id)}>×</button>
                      </div>
                    ))}
                    <div className="express-total">
                      <strong>Total: {formatCurrency(getTotal())}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Regular Mode */
            <div className="quick-billing-grid">
              <div className="items-section">
                <h3>📦 Select Items</h3>
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search items by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.35-4.35"></path>
                  </svg>
                </div>
                
                <div className="items-list">
                  {filteredItems.length === 0 ? (
                    <div className="no-items">
                      <p>No items found</p>
                    </div>
                  ) : (
                    filteredItems.map(item => {
                      const itemPrice = parseFloat(item.price) || 0;
                      const isOutOfStock = item.quantity <= 0;
                      const isLowStock = item.quantity <= 5 && item.quantity > 0;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`item-card super-enhanced ${isOutOfStock ? 'out-of-stock' : ''} ${isLowStock ? 'low-stock' : ''}`} 
                          onClick={() => !isOutOfStock && quickAddItem(item)}
                        >
                          <div className="item-info">
                            <h4>{item.name}</h4>
                            <p className="item-category">{item.category}</p>
                            <div className="stock-info">
                              <span className={`stock-badge ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'good'}`}>
                                {isOutOfStock ? '❌ Out of Stock' : 
                                 isLowStock ? `⚠️ Low Stock: ${item.quantity}` : 
                                 `✅ Stock: ${item.quantity}`}
                              </span>
                            </div>
                          </div>
                          <div className="item-actions">
                            <div className="price-section">
                              <span className="price-label">Price:</span>
                              <span className="price-value">{formatCurrency(itemPrice)}</span>
                            </div>
                            {!isOutOfStock && (
                              <div className="quantity-buttons">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); quickAddItem(item, 1); }} 
                                  className="qty-btn small"
                                  title="Add 1 item"
                                >
                                  +1
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); quickAddItem(item, 5); }} 
                                  className="qty-btn medium"
                                  title="Add 5 items"
                                >
                                  +5
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); quickAddItem(item, 10); }} 
                                  className="qty-btn large"
                                  title="Add 10 items"
                                >
                                  +10
                                </button>
                              </div>
                            )}
                          </div>
                          {!isOutOfStock && (
                            <div className="add-indicator">
                              <span>Click to add ➕</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="cart-section">
                <h3>🛒 Cart ({cart.length} items)</h3>
              
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <div className="empty-cart-icon">🛒</div>
                  <p>Your cart is empty</p>
                  <p className="empty-cart-hint">Click on items to add them</p>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map(item => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-info">
                          <h4>{item.name}</h4>
                          <p className="cart-item-category">{item.category}</p>
                        </div>
                        <div className="cart-item-controls">
                          <div className="quantity-controls">
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="qty-btn"
                            >
                              -
                            </button>
                            <span className="quantity">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="qty-btn"
                            >
                              +
                            </button>
                          </div>
                          <div className="cart-item-price">
                            <span className="price">{formatCurrency(item.price * item.quantity)}</span>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="remove-btn"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="cart-summary enhanced">
                    {/* Quick Settings */}
                    <div className="quick-settings">
                      <div className="setting-row">
                        <label>💰 Discount (%):</label>
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                          className="setting-input"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="setting-row">
                        <label>🏛️ Tax (%):</label>
                        <input
                          type="number"
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          className="setting-input"
                          min="0"
                          max="50"
                        />
                      </div>
                    </div>

                    {/* Enhanced Calculation Display */}
                    <div className="calculation-breakdown">
                      <div className="calc-row">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(getSubtotal())}</span>
                      </div>
                      {getDiscount() > 0 && (
                        <div className="calc-row discount">
                          <span>Discount ({discount}%):</span>
                          <span>-{formatCurrency(getDiscount())}</span>
                        </div>
                      )}
                      {getTax() > 0 && (
                        <div className="calc-row tax">
                          <span>Tax ({taxRate}%):</span>
                          <span>+{formatCurrency(getTax())}</span>
                        </div>
                      )}
                      <div className="calc-row total">
                        <span><strong>Total:</strong></span>
                        <span><strong>{formatCurrency(getTotal())}</strong></span>
                      </div>
                    </div>

                    {/* Payment Section moved here */}
                    <div className="payment-section">
                      <h3>💳 Quick Payment</h3>
                      <div className="buyer-type-row">
                        <label>Buyer Type:</label>
                        <select value={buyerType} onChange={(e) => setBuyerType(e.target.value)}>
                          <option>International</option>
                          <option>Local</option>
                          <option>Wholesale</option>
                        </select>
                      </div>
                      <div className="payment-type-toggle">
                        <button 
                          className={`toggle-btn ${paymentType === 'cash' ? 'active' : ''}`}
                          onClick={() => {
                            setPaymentType('cash');
                            setAmountPaid(getSubtotal()); // For cash, default to full amount
                          }}
                        >
                          Cash Payment
                        </button>
                        <button 
                          className={`toggle-btn ${paymentType === 'credit' ? 'active' : ''}`}
                          onClick={() => {
                            if (!isWalkInCustomer && selectedCustomer) {
                              setPaymentType('credit');
                              setAmountPaid(0); // For credit, default to 0
                            } else {
                              alert('Please select an existing customer for credit payment');
                            }
                          }}
                          disabled={isWalkInCustomer || !selectedCustomer}
                        >
                          Credit Payment
                        </button>
                      </div>

                      <div className="amount-paid-section">
                        <label htmlFor="amountPaid">Amount Paid:</label>
                        <div className="amount-input-container">
                          <input
                            type="number"
                            id="amountPaid"
                            value={amountPaid}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              if (value >= 0 && value <= getSubtotal()) {
                                setAmountPaid(value);
                              }
                            }}
                            className="amount-input"
                            min="0"
                            max={getSubtotal()}
                            step="0.01"
                          />
                          <div className="amount-summary">
                            <div className="amount-row">
                              <span>Total Amount:</span>
                              <span>{formatCurrency(getSubtotal())}</span>
                            </div>
                            <div className="amount-row">
                              <span>Amount Due:</span>
                              <span>{formatCurrency(getSubtotal() - amountPaid)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleCreateBill}
                      disabled={loading || cart.length === 0}
                      className="create-bill-btn"
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner-small"></div>
                          Creating Bill...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                          </svg>
                          Create & Print Bill
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickBilling; 