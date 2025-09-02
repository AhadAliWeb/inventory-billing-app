const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('./auth');
const BackupManager = require('../backup/backupManager');
const GoogleDriveConfig = require('../backup/googleDriveConfig');
const fs = require('fs-extra');
const path = require('path');

// Initialize backup manager
const backupManager = new BackupManager();
const googleDrive = new GoogleDriveConfig();

// Initialize backup system
backupManager.initialize();

// Get backup status
router.get('/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = backupManager.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting backup status:', error);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

// Get backup configuration
router.get('/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, config: backupManager.backupConfig });
  } catch (error) {
    console.error('Error getting backup config:', error);
    res.status(500).json({ error: 'Failed to get backup configuration' });
  }
});

// Update backup configuration
router.put('/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { enabled, schedule, keepLocalCopies, keepCloudCopies, folderName, compressBackups } = req.body;
    
    const newConfig = {
      enabled: enabled !== undefined ? enabled : backupManager.backupConfig.enabled,
      schedule: schedule || backupManager.backupConfig.schedule,
      keepLocalCopies: keepLocalCopies || backupManager.backupConfig.keepLocalCopies,
      keepCloudCopies: keepCloudCopies || backupManager.backupConfig.keepCloudCopies,
      folderName: folderName || backupManager.backupConfig.folderName,
      compressBackups: compressBackups !== undefined ? compressBackups : backupManager.backupConfig.compressBackups
    };
    
    await backupManager.updateConfig(newConfig);
    
    res.json({ success: true, message: 'Backup configuration updated successfully' });
  } catch (error) {
    console.error('Error updating backup config:', error);
    res.status(500).json({ error: 'Failed to update backup configuration' });
  }
});

// Start Google Drive authentication
router.get('/google-drive/auth', requireAuth, requireAdmin, async (req, res) => {
  try {
    await googleDrive.initialize();
    const authUrl = googleDrive.generateAuthUrl();
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// Handle Google Drive OAuth callback
router.get('/google-drive/callback', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }
    
    const result = await googleDrive.handleCallback(code);
    
    if (result.success) {
      // Reinitialize backup manager with new Google Drive connection
      await backupManager.initialize();
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ error: 'Failed to complete Google Drive authentication' });
  }
});

// Test Google Drive connection
router.get('/google-drive/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await backupManager.testGoogleDriveConnection();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error testing Google Drive connection:', error);
    res.status(500).json({ error: 'Failed to test Google Drive connection' });
  }
});

// Create manual backup
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await backupManager.manualBackup();
    
    if (result.success) {
      res.json({ success: true, message: 'Backup created successfully', backup: result });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error creating manual backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// List all backups
router.get('/list', requireAuth, requireAdmin, async (req, res) => {
  try {
    const backups = await backupManager.listBackups();
    res.json({ success: true, backups });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Download backup file
router.get('/download/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'backup', 'backups', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// Delete backup file
router.delete('/delete/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'backup', 'backups', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    await fs.remove(filePath);
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// Get backup statistics
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const backups = await backupManager.listBackups();
    const status = backupManager.getStatus();
    
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const averageSize = backups.length > 0 ? totalSize / backups.length : 0;
    
    const stats = {
      totalBackups: backups.length,
      totalSize: totalSize,
      averageSize: averageSize,
      lastBackup: status.lastBackup,
      nextBackup: status.nextBackup,
      googleDriveConnected: status.googleDriveConnected,
      backupEnabled: status.enabled
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting backup stats:', error);
    res.status(500).json({ error: 'Failed to get backup statistics' });
  }
});

module.exports = router;
