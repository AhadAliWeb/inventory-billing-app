# Google Drive Backup Setup Guide

This guide will help you set up automatic Google Drive backups for your inventory billing application.

## Prerequisites

1. Google Cloud Platform account
2. Google Drive account
3. Admin access to the inventory application

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name your project (e.g., "Inventory-Backup-System")

### 2. Enable Google Drive API

1. In your Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

### 3. Create Service Account Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Name your service account (e.g., "inventory-backup-service")
4. Click **Create and Continue**
5. Grant the service account the **Editor** role
6. Click **Continue** and then **Done**

### 4. Generate and Download Credentials

1. In the **Credentials** page, find your service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key > Create New Key**
5. Choose **JSON** format
6. Download the file and rename it to `credentials.json`
7. Place this file in the `server/backup/` directory

### 5. Share Google Drive Folder (Optional)

If you want to organize backups in a specific folder:

1. Create a folder in your Google Drive
2. Right-click the folder and select **Share**
3. Add the service account email (found in credentials.json)
4. Give it **Editor** permissions

### 6. Configure Backup Settings

1. Log in to your inventory application as an admin
2. Go to **Administration > Backup Management**
3. Click **Configure Google Drive**
4. Follow the authentication flow
5. Set your backup schedule and preferences

## Configuration Options

### Backup Schedule Options
- **Daily**: `0 2 * * *` (2:00 AM every day)
- **Weekly**: `0 2 * * 0` (2:00 AM every Sunday)
- **Monthly**: `0 2 1 * *` (2:00 AM on the 1st of each month)

### Backup Settings
- **Keep Local Copies**: Number of local backup files to retain (default: 5)
- **Keep Cloud Copies**: Number of Google Drive backup files to retain (default: 10)
- **Compress Backups**: Enable ZIP compression to save space (recommended: true)
- **Folder Name**: Name of the Google Drive folder for backups (default: "Inventory_Backups")

## File Structure

After setup, your backup directory should look like this:

```
server/backup/
├── README.md
├── backupManager.js
├── googleDriveConfig.js
├── credentials.json          # Your Google Cloud credentials (keep secure!)
├── token.json               # Auto-generated after authentication
├── backupConfig.json        # Auto-generated backup configuration
└── backups/                 # Local backup files
    ├── inventory_backup_2024-01-01T02-00-00.zip
    └── ...
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `credentials.json` to version control**
2. Keep your service account credentials secure
3. Regularly review and rotate access keys
4. Use environment variables for sensitive configuration in production

## Troubleshooting

### Common Issues

1. **"Google Drive not connected"**
   - Check if `credentials.json` exists in the backup directory
   - Verify the service account has proper permissions
   - Complete the authentication flow in the admin panel

2. **"Permission denied" errors**
   - Ensure the service account has access to Google Drive
   - Check if the backup folder is shared with the service account

3. **"Backup failed" errors**
   - Check disk space for local backups
   - Verify internet connection for Google Drive uploads
   - Review application logs for detailed error messages

### Manual Backup Test

To test backup functionality:

1. Go to **Administration > Backup Management**
2. Click **Create Manual Backup**
3. Check the backup status and logs

## Support

If you encounter issues:

1. Check the application logs
2. Verify your Google Cloud Console setup
3. Ensure all credentials are properly configured
4. Test the Google Drive connection in the admin panel

## Environment Variables (Production)

For production deployments, consider using environment variables:

```bash
GOOGLE_DRIVE_CREDENTIALS_PATH=/path/to/credentials.json
BACKUP_FOLDER_NAME=Production_Inventory_Backups
BACKUP_SCHEDULE="0 3 * * *"
BACKUP_KEEP_LOCAL=3
BACKUP_KEEP_CLOUD=20
```