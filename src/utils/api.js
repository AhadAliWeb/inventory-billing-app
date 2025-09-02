import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Attach auth token if available
    this.client.interceptors.request.use((config) => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (_) {}
      return config;
    });
  }

  // Inventory API
  async getInventory(search = '') {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await this.client.get(`/inventory${query}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  }

  async addItem(item) {
    try {
      const response = await this.client.post('/inventory', item);
      return response.data;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }

  async updateItem(id, item) {
    try {
      const response = await this.client.put(`/inventory/${id}`, item);
      return response.data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async deleteItem(id) {
    try {
      const response = await this.client.delete(`/inventory/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Item Groups API
  async getItemGroups() {
    try {
      const response = await this.client.get('/item-groups');
      return response.data;
    } catch (error) {
      console.error('Error fetching item groups:', error);
      throw error;
    }
  }

  async createItemGroup(groupData) {
    try {
      const response = await this.client.post('/item-groups', groupData);
      return response.data;
    } catch (error) {
      console.error('Error creating item group:', error);
      throw error;
    }
  }

  async addVariantToGroup(groupId, variantData) {
    try {
      const response = await this.client.post(`/item-groups/${groupId}/variants`, variantData);
      return response.data;
    } catch (error) {
      console.error('Error adding variant:', error);
      throw error;
    }
  }

  async getItemGroupVariants(groupId) {
    try {
      const response = await this.client.get(`/item-groups/${groupId}/variants`);
      return response.data;
    } catch (error) {
      console.error('Error fetching item group variants:', error);
      throw error;
    }
  }

  async deleteItemGroup(id) {
    try {
      const response = await this.client.delete(`/item-groups/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting item group:', error);
      throw error;
    }
  }

  // Composite Items API
  async getCompositeItems() {
    try {
      const response = await this.client.get('/composite-items');
      return response.data;
    } catch (error) {
      console.error('Error fetching composite items:', error);
      throw error;
    }
  }

  async createCompositeItem(itemData) {
    try {
      const response = await this.client.post('/composite-items', itemData);
      return response.data;
    } catch (error) {
      console.error('Error creating composite item:', error);
      throw error;
    }
  }

  async getCompositeItemComponents(compositeItemId) {
    try {
      const response = await this.client.get(`/composite-items/${compositeItemId}/components`);
      return response.data;
    } catch (error) {
      console.error('Error fetching composite item components:', error);
      throw error;
    }
  }

  async deleteCompositeItem(id) {
    try {
      const response = await this.client.delete(`/composite-items/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting composite item:', error);
      throw error;
    }
  }

  // Billing API
  async createBill(billData) {
    try {
      const response = await this.client.post('/billing', billData);
      return response.data;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  }

  // Serials API
  async generateSerials({ item_id, quantity, prefix, cost_price, purchase_date }) {
    try {
      const response = await this.client.post('/serials/generate', { item_id, quantity, prefix, cost_price, purchase_date });
      return response.data;
    } catch (error) {
      console.error('Error generating serials:', error);
      throw error;
    }
  }

  async lookupSerial(serial_code) {
    try {
      const response = await this.client.get(`/serials/${encodeURIComponent(serial_code)}`);
      return response.data;
    } catch (error) {
      console.error('Error looking up serial:', error);
      throw error;
    }
  }

  async getSerialLabelsByItem(itemId) {
    try {
      const response = await this.client.get(`/serials/labels/by-item/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
  }

  async deleteSerial(serial_code) {
    try {
      const response = await this.client.delete(`/serials/${encodeURIComponent(serial_code)}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting serial:', error);
      throw error;
    }
  }

  // Audit logs
  async getAuditLogs() {
    try {
      const response = await this.client.get('/audit');
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  // Reports
  async getProfitReport({ startDate, endDate, groupBy = 'product' }) {
    try {
      const response = await this.client.get('/reports/profit', { params: { startDate, endDate, groupBy } });
      return response.data;
    } catch (error) {
      console.error('Error fetching profit report:', error);
      throw error;
    }
  }

  async getInventoryReport() {
    try {
      const response = await this.client.get('/reports/inventory');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      throw error;
    }
  }

  async getSalesReport({ startDate, endDate, groupBy = 'product' }) {
    try {
      const response = await this.client.get('/reports/sales', { params: { startDate, endDate, groupBy } });
      return response.data;
    } catch (error) {
      console.error('Error fetching sales report:', error);
      throw error;
    }
  }

  async getCustomerReport({ startDate, endDate, customerId }) {
    try {
      const response = await this.client.get('/reports/customer', { params: { startDate, endDate, customerId } });
      return response.data;
    } catch (error) {
      console.error('Error fetching customer report:', error);
      throw error;
    }
  }

  async getVendorReport({ startDate, endDate, vendorId }) {
    try {
      const response = await this.client.get('/reports/vendor', { params: { startDate, endDate, vendorId } });
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor report:', error);
      throw error;
    }
  }

  // Bills API
  async getBills() {
    try {
      const response = await this.client.get('/bills');
      return response.data;
    } catch (error) {
      console.error('Error fetching bills:', error);
      throw error;
    }
  }

  async getBillDetails(id) {
    try {
      const response = await this.client.get(`/bills/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bill details:', error);
      throw error;
    }
  }

  async getBillsReport(startDate, endDate) {
    try {
      const response = await this.client.get('/bills/report', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching bills report:', error);
      throw error;
    }
  }

  // Customer API
  async getCustomers(search = '') {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await this.client.get(`/customers${query}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  async addCustomer(customer) {
    try {
      const response = await this.client.post('/customers', customer);
      return response.data;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  }

  async updateCustomer(id, customer) {
    try {
      const response = await this.client.put(`/customers/${id}`, customer);
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  async getCustomer(id) {
    try {
      const response = await this.client.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  // Vendor API
  async getVendors() {
    try {
      const response = await this.client.get('/vendors');
      return response.data;
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  }

  async addVendor(vendor) {
    try {
      const response = await this.client.post('/vendors', vendor);
      return response.data;
    } catch (error) {
      console.error('Error adding vendor:', error);
      throw error;
    }
  }

  async updateVendor(id, vendor) {
    try {
      const response = await this.client.put(`/vendors/${id}`, vendor);
      return response.data;
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  }

  async getVendorDetails(id) {
    try {
      const response = await this.client.get(`/vendors/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      throw error;
    }
  }

  // Purchase Orders API
  async getPurchaseOrders() {
    try {
      const response = await this.client.get('/purchase-orders');
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  }

  async createPurchaseOrder(orderData) {
    try {
      const response = await this.client.post('/purchase-orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  }

  async updatePurchaseOrder(id, orderData) {
    try {
      const response = await this.client.put(`/purchase-orders/${id}`, orderData);
      return response.data;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  }

  async deletePurchaseOrder(id) {
    try {
      const response = await this.client.delete(`/purchase-orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  }

  async getPurchaseOrderItems(orderId) {
    try {
      const response = await this.client.get(`/purchase-orders/${orderId}/items`);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase order items:', error);
      throw error;
    }
  }

  // Pricing API
  async getItemPricing(itemId) {
    try {
      const response = await this.client.get(`/pricing/item/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching item pricing:', error);
      throw error;
    }
  }

  async getBuyerTypes() {
    try {
      const response = await this.client.get('/pricing/buyer-types');
      return response.data;
    } catch (error) {
      console.error('Error fetching buyer types:', error);
      throw error;
    }
  }

  async updateItemPricing(itemId, pricingData) {
    try {
      const response = await this.client.put(`/pricing/item/${itemId}`, pricingData);
      return response.data;
    } catch (error) {
      console.error('Error updating item pricing:', error);
      throw error;
    }
  }

  async getQuantityTiers(itemId, buyerTypeId) {
    try {
      const response = await this.client.get(`/pricing/quantity-tiers/${itemId}/${buyerTypeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quantity tiers:', error);
      throw error;
    }
  }

  async updateQuantityTiers(itemId, buyerTypeId, tiersData) {
    try {
      const response = await this.client.put(`/pricing/quantity-tiers/${itemId}/${buyerTypeId}`, tiersData);
      return response.data;
    } catch (error) {
      console.error('Error updating quantity tiers:', error);
      throw error;
    }
  }

  // Authentication API
  async login(username, password) {
    try {
      const response = await this.client.post('/auth/login', { username, password });
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  // User Management API
  async getUsers() {
    try {
      const response = await this.client.get('/auth/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const response = await this.client.post('/auth/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const response = await this.client.delete(`/auth/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async updateUserStatus(userId, isActive) {
    try {
      const response = await this.client.put(`/auth/users/${userId}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  // Expense API
  async getExpenses(filters = {}) {
    try {
      const response = await this.client.get('/expenses', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  async createExpense(expenseData) {
    try {
      const response = await this.client.post('/expenses', expenseData);
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async deleteExpense(expenseId) {
    try {
      const response = await this.client.delete(`/expenses/${expenseId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  async getExpenseCategories() {
    try {
      const response = await this.client.get('/expenses/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      throw error;
    }
  }

  async createExpenseCategory(categoryData) {
    try {
      const response = await this.client.post('/expenses/categories', categoryData);
      return response.data;
    } catch (error) {
      console.error('Error creating expense category:', error);
      throw error;
    }
  }

  // Refund API
  async getRefunds() {
    try {
      const response = await this.client.get('/refunds');
      return response.data;
    } catch (error) {
      console.error('Error fetching refunds:', error);
      throw error;
    }
  }

  async createRefund(refundData) {
    try {
      const response = await this.client.post('/refunds', refundData);
      return response.data;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  async deleteRefund(refundId) {
    try {
      const response = await this.client.delete(`/refunds/${refundId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting refund:', error);
      throw error;
    }
  }

  // Backup API
  async getBackupStatus() {
    try {
      const response = await this.client.get('/backup/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching backup status:', error);
      throw error;
    }
  }

  async getBackupConfig() {
    try {
      const response = await this.client.get('/backup/config');
      return response.data;
    } catch (error) {
      console.error('Error fetching backup config:', error);
      throw error;
    }
  }

  async updateBackupConfig(configData) {
    try {
      const response = await this.client.put('/backup/config', configData);
      return response.data;
    } catch (error) {
      console.error('Error updating backup config:', error);
      throw error;
    }
  }

  async getGoogleDriveAuth() {
    try {
      const response = await this.client.get('/backup/google-drive/auth');
      return response.data;
    } catch (error) {
      console.error('Error getting Google Drive auth:', error);
      throw error;
    }
  }

  async testGoogleDriveConnection() {
    try {
      const response = await this.client.get('/backup/google-drive/test');
      return response.data;
    } catch (error) {
      console.error('Error testing Google Drive connection:', error);
      throw error;
    }
  }

  async createBackup() {
    try {
      const response = await this.client.post('/backup/create');
      return response.data;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async getBackups() {
    try {
      const response = await this.client.get('/backup/list');
      return response.data;
    } catch (error) {
      console.error('Error fetching backups:', error);
      throw error;
    }
  }

  async getBackupStats() {
    try {
      const response = await this.client.get('/backup/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching backup stats:', error);
      throw error;
    }
  }

  async deleteBackup(filename) {
    try {
      const response = await this.client.delete(`/backup/delete/${filename}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  // Accounts and Transactions API
  async getTransactions() {
    try {
      const response = await this.client.get('/accounts/transactions');
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async createTransaction(transactionData) {
    try {
      const response = await this.client.post('/accounts/transactions', transactionData);
      return response.data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async getAccountBalance(accountId) {
    try {
      const response = await this.client.get(`/accounts/${accountId}/balance`);
      return response.data;
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw error;
    }
  }

  async getAccountTransactions(accountId) {
    try {
      const response = await this.client.get(`/accounts/${accountId}/transactions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching account transactions:', error);
      throw error;
    }
  }

  async updateAccount(accountId, accountData) {
    try {
      const response = await this.client.put(`/accounts/${accountId}`, accountData);
      return response.data;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  async deleteAccount(accountId) {
    try {
      const response = await this.client.delete(`/accounts/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
}

export default new ApiClient();