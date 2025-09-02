import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import BackupManagement from './BackupManagement';
import './Administration.css';

const Administration = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBackupManagement, setShowBackupManagement] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'staff'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const response = await api.getUsers();
      console.log('Users response:', response);
      if (response.success) {
        setUsers(response.users);
      } else {
        setError('Failed to fetch users: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await api.createUser(newUser);
      if (response.success) {
        setShowAddUser(false);
        setNewUser({ username: '', password: '', full_name: '', email: '', role: 'staff' });
        fetchUsers();
      }
    } catch (error) {
      setError('Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.deleteUser(userId);
        fetchUsers();
      } catch (error) {
        setError('Failed to delete user');
      }
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.updateUserStatus(userId, !currentStatus);
      fetchUsers();
    } catch (error) {
      setError('Failed to update user status');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="administration">
      <div className="administration-header">
        <h1>Administration</h1>
        <div className="header-actions">
          <button 
            className="backup-management-btn"
            onClick={() => setShowBackupManagement(true)}
          >
            🔄 Backup Management
          </button>
          <button 
            className="add-user-btn"
            onClick={() => setShowAddUser(true)}
          >
            Add New User
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="administration-content">
        <div className="users-section">
          <h2>User Management</h2>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'Never'
                      }
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`toggle-status-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="roles-section">
          <h2>Role Permissions</h2>
          <div className="roles-grid">
            <div className="role-card">
              <h3>Admin</h3>
              <ul>
                <li>Full system access</li>
                <li>User management</li>
                <li>System configuration</li>
                <li>All reports and analytics</li>
              </ul>
            </div>
            <div className="role-card">
              <h3>Manager</h3>
              <ul>
                <li>Inventory management</li>
                <li>Customer management</li>
                <li>Billing and invoices</li>
                <li>Basic reports</li>
              </ul>
            </div>
            <div className="role-card">
              <h3>Staff</h3>
              <ul>
                <li>Basic inventory operations</li>
                <li>Customer service</li>
                <li>Simple billing</li>
                <li>Limited reports</li>
              </ul>
            </div>
            <div className="role-card">
              <h3>Viewer</h3>
              <ul>
                <li>View inventory</li>
                <li>View reports</li>
                <li>No modifications</li>
                <li>Read-only access</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New User</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddUser(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser} className="modal-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddUser(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Add User
                </button>
              </div>
            </form>
          </div>
                 </div>
       )}

       {/* Backup Management Modal */}
       {showBackupManagement && (
         <div className="modal-overlay">
           <div className="modal backup-modal">
             <div className="modal-header">
               <h3>🔄 Backup Management</h3>
               <button 
                 className="close-btn"
                 onClick={() => setShowBackupManagement(false)}
               >
                 ×
               </button>
             </div>
             <div className="modal-content">
               <BackupManagement />
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default Administration;
