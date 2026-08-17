/**
 * Safe Migration Script for Tenant Isolation
 * 
 * This script safely migrates existing data to associate with the default company.
 * It is designed to be non-destructive and idempotent (can be run multiple times safely).
 * 
 * IMPORTANT: This script only adds companyId to documents that don't have it.
 * It never removes existing data or modifies existing companyId values.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Company from '../models/Company.js';
import User from '../models/UserModel.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';
import PowerStatus from '../models/PowerStatus.js';
import Feeder from '../models/Location/Feeder.js';
import State from '../models/Location/State.js';
import LGA from '../models/Location/LGA.js';
import Ward from '../models/Location/Ward.js';
import InjectionSubstation from '../models/Location/InjectionSubstation.js';
import Outage from '../models/Outage.js';
import PowerLog from '../models/PowerLog.js';
import Prediction from '../models/Prediction.js';
import Reminder from '../models/Reminder.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Connect to database
 */
async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/litha';
  
  try {
    await mongoose.connect(mongoUri);
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ MongoDB connection failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Get or create default company
 */
async function getOrCreateDefaultCompany() {
  try {
    // Try to find existing default company
    let defaultCompany = await Company.findOne({ isDefault: true });
    
    if (defaultCompany) {
      console.log(`${colors.green}✓ Found existing default company: ${defaultCompany.name}${colors.reset}`);
      return defaultCompany;
    }
    
    // Try to find first active company
    defaultCompany = await Company.findOne({ status: 'active' }).sort({ createdAt: 1 });
    
    if (defaultCompany) {
      console.log(`${colors.green}✓ Found first active company: ${defaultCompany.name}${colors.reset}`);
      // Mark it as default
      await Company.findByIdAndUpdate(defaultCompany._id, { isDefault: true });
      return defaultCompany;
    }
    
    // Create default company if none exists
    console.log(`${colors.yellow}⚠ No company found, creating default company${colors.reset}`);
    defaultCompany = await Company.create({
      name: 'Default Company',
      shortName: 'Default',
      code: 'DEFAULT',
      officialEmail: 'default@litha.com',
      officialPhone: '+2340000000000',
      headquarters: {
        address: 'Default Address',
        city: 'Default City',
        state: 'Default State'
      },
      status: 'active',
      isDefault: true
    });
    
    console.log(`${colors.green}✓ Created default company: ${defaultCompany.name}${colors.reset}`);
    return defaultCompany;
  } catch (error) {
    console.error(`${colors.red}✗ Error getting/creating default company:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Migrate a collection to use default company
 */
async function migrateCollection(model, modelName, companyId) {
  try {
    const result = await model.updateMany(
      { companyId: { $exists: false } },
      { companyId: companyId }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`${colors.green}✓ ${modelName}: ${result.modifiedCount} documents migrated${colors.reset}`);
    } else {
      console.log(`${colors.cyan}○ ${modelName}: No documents to migrate (already has companyId)${colors.reset}`);
    }
    
    return result.modifiedCount;
  } catch (error) {
    console.error(`${colors.red}✗ ${modelName}: Migration failed - ${error.message}${colors.reset}`);
    return 0;
  }
}

async function migrateUsers(companyId) {
  const result = await User.updateMany(
    { companyId: { $exists: false }, role: { $ne: 'platform-owner' } },
    { companyId }
  );
  console.log(`${colors.green}✓ Users: ${result.modifiedCount} non-platform users migrated${colors.reset}`);
  return result.modifiedCount;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}TENANT MIGRATION${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);
  
  try {
    // Connect to database
    await connectDB();
    
    // Get or create default company
    const defaultCompany = await getOrCreateDefaultCompany();
    const companyId = defaultCompany._id;
    
    console.log(`\n${colors.blue}Starting migration to company: ${defaultCompany.name} (${companyId})${colors.reset}\n`);
    
    let totalMigrated = 0;
    
    // Migrate all collections
    const migrations = [
      { model: Report, name: 'Reports' },
      { model: Notification, name: 'Notifications' },
      { model: PowerStatus, name: 'PowerStatus' },
      { model: Feeder, name: 'Feeders' },
      { model: State, name: 'States' },
      { model: LGA, name: 'LGAs' },
      { model: Ward, name: 'Wards' },
      { model: InjectionSubstation, name: 'InjectionSubstations' },
      { model: Outage, name: 'Outages' },
      { model: PowerLog, name: 'PowerLogs' },
      { model: Prediction, name: 'Predictions' },
      { model: Reminder, name: 'Reminders' }
    ];

    totalMigrated += await migrateUsers(companyId);
    
    for (const { model, name } of migrations) {
      const count = await migrateCollection(model, name, companyId);
      totalMigrated += count;
    }
    
    console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}MIGRATION COMPLETE${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);
    console.log(`${colors.green}✓ Total documents migrated: ${totalMigrated}${colors.reset}`);
    console.log(`${colors.green}✓ All existing data now associated with default company${colors.reset}\n`);
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error(`\n${colors.red}✗ Migration failed:${colors.reset}`, error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrate();
