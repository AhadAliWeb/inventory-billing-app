import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './BackupManagement.css';

const BackupManagement = () => {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    fetchBackupData();
  }, []);

  const fetchBackupData = async () => {
    try {
      setLoading(true);
      const [statusRes, configRes, backupsRes, statsRes] = await Promise.all([
        api.getBackupStatus(),
        api.getBackupConfig(),
        api.getBackups(),
        api.getBackupStats()
      ]);

      if (statusRes.success) setStatus(statusRes.status);
      if (configRes.success) setConfig(configRes.config);
      if (backupsRes.success) setBackups(backupsRes.backups);
      if (statsRes.success) setStats(statsRes.stats);
    } catch (error) {
      setError('Failed to fetch backup data');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDriveAuth = async () => {
    try {
      const response = await api.getGoogleDriveAuth();
      if (response.success) {
        setAuthUrl(response.authUrl);
        setShowGoogleAuth(true);
        // Open Google OAuth in new window
        window.open(response.authUrl, 'googleAuth', 'width=600,height=600');
      }
    } catch (error) {
      setError('Failed to start Google Drive authentication');
    }
  };

  const handleConfigUpdate = async (newConfig) => {
    try {
      const response = await api.updateBackupConfig(newConfig);
      if (response.success) {
        setConfig(newConfig);
        setShowConfig(false);
        fetchBackupData();
      }
    } catch (error) {
      setError('Failed to update backup configuration');
    }
  };

  const handleManualBackup = async () => {
    try {
      setLoading(true);
      const response = await api.createBackup();
      if (response.success) {
        fetchBackupData();
      } else {
        setError(response.error || 'Failed to create backup');
      }
    } catch (error) {
      setError('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const response = await fetch(`/api/backup/download/${filename}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError('Failed to download backup');
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (window.confirm('Are you sure you want to delete this backup?')) {
      try {
        const response = await api.deleteBackup(filename);
        if (response.success) {
          fetchBackupData();
        }
      } catch (error) {
        setError('Failed to delete backup');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div className="loading">Loading backup information...</div>;

  return (
    <div className="backup-management">
      <div className="backup-header">
        <h1>🔄 Backup Management</h1>
        <div className="header-actions">
          <button 
            className="config-btn"
            onClick={() => setShowConfig(true)}
          >
            ⚙️ Configuration
          </button>
          <button 
            className="backup-btn"
            onClick={handleManualBackup}
            disabled={loading}
          >
            📦 Create Backup
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Status Overview */}
      <div className="status-overview">
        <div className="status-card">
          <h3>📊 Backup Status</h3>
          <div className="status-info">
            <p><strong>System:</strong> {status?.enabled ? '✅ Enabled' : '❌ Disabled'}</p>
            <p><strong>Google Drive:</strong> {status?.googleDriveConnected ? '✅ Connected' : '❌ Not Connected'}</p>
            <p><strong>Schedule:</strong> {status?.schedule || 'Not set'}</p>
            <p><strong>Last Backup:</strong> {status?.lastBackup ? formatDate(status.lastBackup.created) : 'Never'}</p>
            <p><strong>Next Backup:</strong> {status?.nextBackup ? formatDate(status.nextBackup) : 'Not scheduled'}</p>
          </div>
        </div>

        <div className="stats-card">
          <h3>📈 Statistics</h3>
          <div className="stats-info">
            <p><strong>Total Backups:</strong> {stats?.totalBackups || 0}</p>
            <p><strong>Total Size:</strong> {stats?.totalSize ? formatFileSize(stats.totalSize) : '0 Bytes'}</p>
            <p><strong>Average Size:</strong> {stats?.averageSize ? formatFileSize(stats.averageSize) : '0 Bytes'}</p>
          </div>
        </div>
      </div>

      {/* Google Drive Connection */}
      <div className="google-drive-section">
        <h2>☁️ Google Drive Integration</h2>
        <div className="connection-status">
          {status?.googleDriveConnected ? (
            <div className="connected-status">
              <p>✅ Connected to Google Drive</p>
              <button 
                className="test-connection-btn"
                onClick={() => api.testGoogleDriveConnection()}
              >
                Test Connection
              </button>
            </div>
          ) : (
            <div className="not-connected-status">
              <p>❌ Not connected to Google Drive</p>
              <button 
                className="connect-btn"
                onClick={handleGoogleDriveAuth}
              >
                Connect Google Drive
              </button>
              <p className="help-text">
                Click to connect your Google Drive account for automatic cloud backups
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Backup List */}
      <div className="backups-section">
        <h2>📋 Backup History</h2>
        {backups.length === 0 ? (
          <p className="no-backups">No backups found</p>
        ) : (
          <div className="backups-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.name}>
                    <td>{backup.name}</td>
                    <td>{formatFileSize(backup.size)}</td>
                    <td>{formatDate(backup.created)}</td>
                    <td>
                      <button
                        className="download-btn"
                        onClick={() => handleDownloadBackup(backup.name)}
                      >
                        📥 Download
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteBackup(backup.name)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showConfig && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>⚙️ Backup Configuration</h3>
              <button 
                className="close-btn"
                onClick={() => setShowConfig(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <BackupConfigForm 
                config={config} 
                onSave={handleConfigUpdate}
                onCancel={() => setShowConfig(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Google Auth Modal */}
      {showGoogleAuth && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔐 Google Drive Authentication</h3>
              <button 
                className="close-btn"
                onClick={() => setShowGoogleAuth(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="auth-instructions">
                <p>1. Click the link below to authorize access to your Google Drive</p>
                <p>2. Sign in with your Google account</p>
                <p>3. Grant permission to access your Drive</p>
                <p>4. Return here after authorization</p>
                
                <a 
                  href={authUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="auth-link"
                >
                  🔗 Authorize Google Drive Access
                </a>
                
                <button 
                  className="check-status-btn"
                  onClick={fetchBackupData}
                >
                  Check Connection Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Backup Configuration Form Component
const BackupConfigForm = ({ config, onSave, onCancel }) => {
  const [formData, setFormData] = useState(config || {});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            name="enabled"
            checked={formData.enabled || false}
            onChange={handleChange}
          />
          Enable Automated Backups
        </label>
      </div>

      <div className="form-group">
        <label>Backup Schedule (Cron Format)</label>
        <input
          type="text"
          name="schedule"
          value={formData.schedule || '0 2 * * *'}
          onChange={handleChange}
          placeholder="0 2 * * * (Daily at 2 AM)"
        />
        <small>Format: Minute Hour Day Month DayOfWeek</small>
      </div>

      <div className="form-group">
        <label>Keep Local Copies</label>
        <input
          type="number"
          name="keepLocalCopies"
          value={formData.keepLocalCopies || 5}
          onChange={handleChange}
          min="1"
          max="50"
        />
      </div>

      <div className="form-group">
        <label>Keep Cloud Copies</label>
        <input
          type="number"
          name="keepCloudCopies"
          value={formData.keepCloudCopies || 10}
          onChange={handleChange}
          min="1"
          max="100"
        />
      </div>

      <div className="form-group">
        <label>Google Drive Folder Name</label>
        <input
          type="text"
          name="folderName"
          value={formData.folderName || 'Inventory_Backups'}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            name="compressBackups"
            checked={formData.compressBackups !== false}
            onChange={handleChange}
          />
          Compress Backups (ZIP)
        </label>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          Save Configuration
        </button>
      </div>
    </form>
  );
};

export default BackupManagement;
