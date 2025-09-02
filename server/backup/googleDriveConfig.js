const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');

class GoogleDriveConfig {
  constructor() {
    this.oauth2Client = null;
    this.drive = null;
    this.configPath = path.join(__dirname, 'googleDriveConfig.json');
    this.credentialsPath = path.join(__dirname, 'credentials.json');
    this.tokenPath = path.join(__dirname, 'token.json');
  }

  // Initialize Google Drive API
  async initialize() {
    try {
      // Check if credentials exist
      if (!await fs.pathExists(this.credentialsPath)) {
        throw new Error('Google Drive credentials not found. Please set up Google Cloud Project and download credentials.json');
      }

      const credentials = await fs.readJson(this.credentialsPath);
      
      // Use service account authentication for automated backups
      if (credentials.type === 'service_account') {
        const auth = new google.auth.GoogleAuth({
          keyFile: this.credentialsPath,
          scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.metadata.readonly'
          ]
        });
        
        this.oauth2Client = await auth.getClient();
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        return true;
      } else {
        // Fallback to OAuth2 for user authentication
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        
        this.oauth2Client = new google.auth.OAuth2(
          client_id,
          client_secret,
          redirect_uris[0] || 'http://localhost:3001/auth/google/callback'
        );

        // Check if we have a stored token
        if (await fs.pathExists(this.tokenPath)) {
          const token = await fs.readJson(this.tokenPath);
          this.oauth2Client.setCredentials(token);
        }

        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        return true;
      }
    } catch (error) {
      console.error('Error initializing Google Drive:', error.message);
      return false;
    }
  }

  // Generate authorization URL for user to authenticate
  generateAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('Google Drive not initialized');
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Handle OAuth callback and get tokens
  async handleCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Save token for future use
      await fs.writeJson(this.tokenPath, tokens);
      
      // Reinitialize drive with new tokens
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      return { success: true, message: 'Google Drive connected successfully!' };
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      return { success: false, message: 'Failed to connect to Google Drive' };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.oauth2Client && this.drive;
  }

  // Check if using service account (for automated backups)
  isServiceAccount() {
    try {
      if (this.oauth2Client && this.oauth2Client.credentials) {
        return this.oauth2Client.credentials.client_email !== undefined;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Get drive instance
  getDrive() {
    return this.drive;
  }

  // Get OAuth client
  getOAuthClient() {
    return this.oauth2Client;
  }

  // Create backup folder in Google Drive
  async createBackupFolder(folderName) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'] // Root folder
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      return folder.data.id;
    } catch (error) {
      console.error('Error creating backup folder:', error);
      throw error;
    }
  }

  // Find existing backup folder
  async findBackupFolder(folderName) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      return response.data.files.length > 0 ? response.data.files[0].id : null;
    } catch (error) {
      console.error('Error finding backup folder:', error);
      return null;
    }
  }

  // Upload file to Google Drive
  async uploadFile(filePath, fileName, folderId = null) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : ['root']
      };

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(filePath)
      };

      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, size, createdTime'
      });

      return {
        id: file.data.id,
        name: file.data.name,
        size: file.data.size,
        createdTime: file.data.createdTime
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // List backup files
  async listBackupFiles(folderId) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, size, createdTime, modifiedTime)',
        spaces: 'drive',
        orderBy: 'createdTime desc'
      });

      return response.data.files;
    } catch (error) {
      console.error('Error listing backup files:', error);
      return [];
    }
  }

  // Delete old backup files (keep only last N backups)
  async cleanupOldBackups(folderId, keepCount = 10) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      const files = await this.listBackupFiles(folderId);
      
      if (files.length > keepCount) {
        const filesToDelete = files.slice(keepCount);
        
        for (const file of filesToDelete) {
          await this.drive.files.delete({
            fileId: file.id
          });
          console.log(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
}

module.exports = GoogleDriveConfig;
