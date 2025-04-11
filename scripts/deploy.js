#!/usr/bin/env node

/**
 * PKEP WhatsApp Webhook Deployment Script
 * 
 * This script helps deploy the PKEP WhatsApp webhook to Vercel
 * It validates the environment and files before deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Required files for deployment
const requiredFiles = [
  'vercel.json',
  'pages/api/webhook.js',
  'pages/api/health.js',
  'lib/supabase.js',
  'lib/whatsapp.js',
  'utils/webhookSecurity.js',
  'utils/monitoring.js',
  'utils/logger.js',
  'utils/handlers.js',
  'utils/errorHandling.js'
];

// Required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE',
  'WHATSAPP_API_VERSION',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'FACEBOOK_APP_SECRET',
  'WEBHOOK_VERIFY_TOKEN',
  'JWT_SECRET_KEY'
];

// Check if Vercel CLI is installed
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if all required files exist
function checkRequiredFiles() {
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  return missingFiles;
}

// Check for .env file and required variables
function checkEnvironmentVariables() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return { exists: false, missingVars: requiredEnvVars };
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const missingVars = [];
  
  for (const envVar of requiredEnvVars) {
    if (!envContent.includes(`${envVar}=`)) {
      missingVars.push(envVar);
    }
  }
  
  return { exists: true, missingVars };
}

// Deploy using Vercel CLI
function deployToVercel(environment) {
  console.log(`\n📤 Deploying to ${environment}...\n`);
  
  try {
    // Run the vercel command for the specified environment
    const command = environment === 'production' 
      ? 'vercel --prod' 
      : 'vercel';
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Deployment completed successfully!');
    console.log('\n⚠️ Make sure to configure the following:');
    console.log('1. Set up your webhook URL in the Meta Developer Portal');
    console.log('2. Verify the webhook is responding properly using the health check endpoint');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log('🚀 PKEP WhatsApp Webhook Deployment Tool');
  console.log('=======================================\n');
  
  // Check Vercel CLI
  if (!checkVercelCLI()) {
    console.error('❌ Vercel CLI not found. Please install it with: npm install -g vercel');
    process.exit(1);
  }
  
  // Check required files
  const missingFiles = checkRequiredFiles();
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(` - ${file}`));
    process.exit(1);
  }
  
  // Check environment variables
  const { exists, missingVars } = checkEnvironmentVariables();
  if (!exists) {
    console.warn('⚠️ No .env file found. You will need to set environment variables in the Vercel dashboard.');
  } else if (missingVars.length > 0) {
    console.warn('⚠️ Some required environment variables are missing in your .env file:');
    missingVars.forEach(v => console.warn(` - ${v}`));
    console.warn('You will need to set these in the Vercel dashboard.');
  }
  
  // Prompt for deployment environment
  rl.question('Deploy to production? (y/N): ', (answer) => {
    const deployToProd = answer.toLowerCase() === 'y';
    const environment = deployToProd ? 'production' : 'preview';
    
    // Confirm deployment
    rl.question(`\nReady to deploy to ${environment}? (y/N): `, (confirm) => {
      if (confirm.toLowerCase() === 'y') {
        deployToVercel(environment);
      } else {
        console.log('\n⏹️ Deployment cancelled.');
      }
      rl.close();
    });
  });
}

// Run the script
main().catch(error => {
  console.error('❌ An error occurred:', error);
  process.exit(1);
}); 