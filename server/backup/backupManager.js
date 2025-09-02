const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const cron = require('node-cron');
const GoogleDriveConfig = require('./googleDriveConfig');

class BackupManager {
  constructor() {
    this.googleDrive = new GoogleDriveConfig();
    this.backupDir = path.join(__dirname, 'backups');
    this.dbPath = path.join(__dirname, '..', 'inventory.db');
    this.isInitialized = false;
    this.backupSchedule = null;
    this.backupConfig = {
      enabled: false,
      schedule: '0 2 * * *', // Default: Daily at 2 AM
      keepLocalCopies: 5,
      keepCloudCopies: 10,
      folderName: 'Inventory_Backups',
      compressBackups: true
    };
  }

  // Initialize backup manager
  async initialize() {
    try {
      await fs.ensureDir(this.backupDir);
      await this.loadConfig();
      
      // Always try to initialize Google Drive for manual backups
      const googleDriveInit = await this.googleDrive.initialize();
      
      if (this.backupConfig.enabled) {
        if (googleDriveInit) {
          this.isInitialized = true;
          this.startScheduledBackups();
          console.log('✅ Backup Manager initialized successfully with Google Drive');
        } else {
          console.log('⚠️  Backup Manager initialized but Google Drive not available');
          this.isInitialized = true;
        }
      } else {
        if (googleDriveInit) {
          console.log('ℹ️  Backup Manager initialized (disabled) - Google Drive available for manual backups');
        } else {
          console.log('ℹ️  Backup Manager initialized (disabled)');
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing Backup Manager:', error);
      return false;
    }
  }

  // Load backup configuration
  async loadConfig() {
    const configPath = path.join(__dirname, 'backupConfig.json');
    
    try {
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        this.backupConfig = { ...this.backupConfig, ...config };
      } else {
        await this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading backup config:', error);
    }
  }

  // Save backup configuration
  async saveConfig() {
    const configPath = path.join(__dirname, 'backupConfig.json');
    
    try {
      await fs.writeJson(configPath, this.backupConfig, { spaces: 2 });
    } catch (error) {
      console.error('Error saving backup config:', error);
    }
  }

  // Update backup configuration
  async updateConfig(newConfig) {
    this.backupConfig = { ...this.backupConfig, ...newConfig };
    await this.saveConfig();
    
    if (this.backupSchedule) {
      this.backupSchedule.stop();
    }
    
    if (this.backupConfig.enabled) {
      this.startScheduledBackups();
    }
  }

  // Start scheduled backups
  startScheduledBackups() {
    if (this.backupSchedule) {
      this.backupSchedule.stop();
    }

    if (this.backupConfig.enabled && this.backupConfig.schedule) {
      this.backupSchedule = cron.schedule(this.backupConfig.schedule, () => {
        console.log('🕐 Scheduled backup starting...');
        this.createBackup();
      }, {
        scheduled: true,
        timezone: "Asia/Dubai"
      });
      
      console.log(`⏰ Scheduled backups enabled: ${this.backupConfig.schedule}`);
    }
  }

  // Create a complete backup
  async createBackup() {
    try {
      console.log('🔄 Starting backup process...');
      
      if (!await fs.pathExists(this.dbPath)) {
        throw new Error('Database file not found');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `inventory_backup_${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);
      
      await fs.ensureDir(backupPath);
      
      const dbBackupPath = path.join(backupPath, 'inventory.db');
      await fs.copy(this.dbPath, dbBackupPath);
      
      const metadata = {
        backupDate: new Date().toISOString(),
        databaseSize: (await fs.stat(this.dbPath)).size,
        version: '1.0.0',
        description: 'Automated daily backup'
      };
      
      await fs.writeJson(path.join(backupPath, 'metadata.json'), metadata, { spaces: 2 });
      
      let finalBackupPath = backupPath;
      let finalBackupName = backupName;
      
      if (this.backupConfig.compressBackups) {
        const zipPath = path.join(this.backupDir, `${backupName}.zip`);
        await this.compressDirectory(backupPath, zipPath);
        await fs.remove(backupPath);
        finalBackupPath = zipPath;
        finalBackupName = `${backupName}.zip`;
      }
      
      console.log(`✅ Local backup created: ${finalBackupName}`);
      
      if (this.backupConfig.enabled && this.googleDrive.isAuthenticated()) {
        try {
          await this.uploadToGoogleDrive(finalBackupPath, finalBackupName);
        } catch (error) {
          console.error('⚠️  Google Drive upload failed, but local backup was successful:', error.message);
        }
      }
      
      await this.cleanupLocalBackups();
      
      console.log('🎉 Backup process completed successfully!');
      return { success: true, backupPath: finalBackupPath, backupName: finalBackupName };
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Compress directory to ZIP
  async compressDirectory(sourcePath, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));
      
      archive.pipe(output);
      archive.directory(sourcePath, false);
      archive.finalize();
    });
  }

  // Upload backup to Google Drive
  async uploadToGoogleDrive(filePath, fileName) {
    try {
      console.log('☁️  Uploading backup to Google Drive...');
      
      let folderId = await this.googleDrive.findBackupFolder(this.backupConfig.folderName);
      
      if (!folderId) {
        folderId = await this.googleDrive.createBackupFolder(this.backupConfig.folderName);
        console.log(`📁 Created backup folder: ${this.backupConfig.folderName}`);
      }
      
      const uploadedFile = await this.googleDrive.uploadFile(filePath, fileName, folderId);
      
      console.log(`✅ Backup uploaded to Google Drive: ${uploadedFile.name}`);
      
      await this.googleDrive.cleanupOldBackups(folderId, this.backupConfig.keepCloudCopies);
      
      return uploadedFile;
      
    } catch (error) {
      console.error('❌ Google Drive upload failed:', error);
      throw error;
    }
  }

  // Cleanup old local backups
  async cleanupLocalBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.endsWith('.zip') || file.includes('inventory_backup_')
      );
      
      if (backupFiles.length > this.backupConfig.keepLocalCopies) {
        const sortedFiles = await Promise.all(
          backupFiles.map(async (file) => {
            const filePath = path.join(this.backupDir, file);
            const stats = await fs.stat(filePath);
            return { name: file, path: filePath, created: stats.birthtime };
          })
        );
        
        sortedFiles.sort((a, b) => a.created - b.created);
        
        const filesToDelete = sortedFiles.slice(0, backupFiles.length - this.backupConfig.keepLocalCopies);
        
        for (const file of filesToDelete) {
          await fs.remove(file.path);
          console.log(`🗑️  Deleted old local backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up local backups:', error);
    }
  }

  // Manual backup trigger
  async manualBackup() {
    console.log('🔄 Manual backup requested...');
    return await this.createBackup();
  }

  // Get backup status
  getStatus() {
    return {
      initialized: this.isInitialized,
      enabled: this.backupConfig.enabled,
      schedule: this.backupConfig.schedule,
      googleDriveConnected: this.googleDrive.isAuthenticated(),
      lastBackup: this.getLastBackupInfo(),
      nextBackup: this.getNextBackupTime()
    };
  }

  // Get last backup information
  async getLastBackupInfo() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.endsWith('.zip') || file.includes('inventory_backup_')
      );
      
      if (backupFiles.length === 0) {
        return null;
      }
      
      const latestBackup = backupFiles.sort().reverse()[0];
      const backupPath = path.join(this.backupDir, latestBackup);
      const stats = await fs.stat(backupPath);
      
      return {
        name: latestBackup,
        size: stats.size,
        created: stats.birthtime,
        path: backupPath
      };
    } catch (error) {
      console.error('Error getting last backup info:', error);
      return null;
    }
  }

  // Get next backup time
  getNextBackupTime() {
    if (!this.backupSchedule || !this.backupConfig.enabled) {
      return null;
    }
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    return tomorrow;
  }

  // List all backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.endsWith('.zip') || file.includes('inventory_backup_')
      );
      
      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            path: filePath
          };
        })
      );
      
      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  // Test Google Drive connection
  async testGoogleDriveConnection() {
    try {
      if (!this.googleDrive.isAuthenticated()) {
        return { success: false, message: 'Google Drive not connected' };
      }
      
      const files = await this.googleDrive.getDrive().files.list({
        pageSize: 1,
        fields: 'files(id, name)'
      });
      
      return { success: true, message: 'Google Drive connection successful' };
    } catch (error) {
      return { success: false, message: `Connection test failed: ${error.message}` };
    }
  }
}

module.exports = BackupManager;
