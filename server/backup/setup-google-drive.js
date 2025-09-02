#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Google Drive Backup Setup Helper');
console.log('=====================================\n');

const credentialsPath = path.join(__dirname, 'credentials.json');
const templatePath = path.join(__dirname, 'credentials.json.template');

async function checkSetup() {
  console.log('📋 Checking current setup...\n');
  
  // Check if credentials exist
  if (await fs.pathExists(credentialsPath)) {
    console.log('✅ credentials.json found');
    try {
      const credentials = await fs.readJson(credentialsPath);
      if (credentials.type === 'service_account') {
        console.log('✅ Service account credentials detected');
        console.log(`   Project: ${credentials.project_id}`);
        console.log(`   Service Account: ${credentials.client_email}`);
      } else {
        console.log('⚠️  OAuth2 credentials detected (will work for manual backups)');
      }
    } catch (error) {
      console.log('❌ Error reading credentials file');
    }
  } else {
    console.log('❌ credentials.json not found');
    console.log('   You need to set up Google Cloud credentials');
  }
  
  // Check backup configuration
  const configPath = path.join(__dirname, 'backupConfig.json');
  if (await fs.pathExists(configPath)) {
    console.log('✅ backupConfig.json found');
    try {
      const config = await fs.readJson(configPath);
      console.log(`   Automated backups: ${config.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`   Schedule: ${config.schedule}`);
      console.log(`   Keep local copies: ${config.keepLocalCopies}`);
      console.log(`   Keep cloud copies: ${config.keepCloudCopies}`);
    } catch (error) {
      console.log('❌ Error reading backup config');
    }
  } else {
    console.log('❌ backupConfig.json not found');
  }
  
  // Check backup directory
  const backupDir = path.join(__dirname, 'backups');
  if (await fs.pathExists(backupDir)) {
    console.log('✅ Backup directory exists');
    const files = await fs.readdir(backupDir);
    console.log(`   Found ${files.length} backup files`);
  } else {
    console.log('⚠️  Backup directory does not exist (will be created automatically)');
  }
}

async function showSetupInstructions() {
  console.log('\n🔧 Setup Instructions:');
  console.log('======================\n');
  
  console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
  console.log('2. Create a new project or select existing one');
  console.log('3. Enable Google Drive API:');
  console.log('   - Go to APIs & Services > Library');
  console.log('   - Search for "Google Drive API"');
  console.log('   - Click Enable');
  console.log('');
  console.log('4. Create Service Account:');
  console.log('   - Go to APIs & Services > Credentials');
  console.log('   - Click Create Credentials > Service Account');
  console.log('   - Name: "inventory-backup-service"');
  console.log('   - Role: Editor');
  console.log('   - Click Create and Continue');
  console.log('');
  console.log('5. Generate and Download Credentials:');
  console.log('   - Click on your service account');
  console.log('   - Go to Keys tab');
  console.log('   - Click Add Key > Create New Key');
  console.log('   - Choose JSON format');
  console.log('   - Download and rename to credentials.json');
  console.log('   - Place in server/backup/ directory');
  console.log('');
  console.log('6. Test the setup:');
  console.log('   - Restart your server');
  console.log('   - Check server logs for Google Drive connection status');
  console.log('   - Access Backup Management in the admin panel');
}

async function createSampleCredentials() {
  console.log('\n📝 Creating sample credentials file...');
  
  if (await fs.pathExists(credentialsPath)) {
    console.log('⚠️  credentials.json already exists, skipping...');
    return;
  }
  
  try {
    await fs.copy(templatePath, credentialsPath);
    console.log('✅ Sample credentials.json created');
    console.log('   Please edit this file with your actual Google Cloud credentials');
  } catch (error) {
    console.log('❌ Error creating sample credentials file');
    console.log('   Please copy credentials.json.template to credentials.json manually');
  }
}

async function main() {
  try {
    await checkSetup();
    await showSetupInstructions();
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\n🤔 Would you like to create a sample credentials.json file? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await createSampleCredentials();
      }
      
      console.log('\n🎯 Next Steps:');
      console.log('1. Set up Google Cloud credentials');
      console.log('2. Restart your server');
      console.log('3. Test backup functionality');
      console.log('\n📚 For detailed help, see: GOOGLE_DRIVE_SETUP.md');
      
      rl.close();
    });
    
  } catch (error) {
    console.error('❌ Setup check failed:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkSetup, showSetupInstructions, createSampleCredentials };
