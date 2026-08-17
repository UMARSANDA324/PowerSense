/**
 * Migration Script: Add companyId to Coordinates and FeederCoverage
 * 
 * This script migrates existing data in Coordinates and FeederCoverage collections
 * to include companyId for tenant isolation. All existing data will be assigned to
 * the first/default company in the database.
 * 
 * CRITICAL: Run this script after updating the schema definitions.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../models/Company.js';
import Coordinates from '../models/Location/Coordinates.js';
import FeederCoverage from '../models/Location/FeederCoverage.js';

dotenv.config();

const migrateTenantOwnership = async () => {
  try {
    console.log('🔄 Starting tenant ownership migration...');
    
    // Connect to MongoDB
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGO_URI or MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    
    // Find the default company (first company in database)
    const defaultCompany = await Company.findOne();
    if (!defaultCompany) {
      throw new Error('No company found in database. Cannot migrate without a default company.');
    }
    
    console.log(`📋 Default company found: ${defaultCompany.name} (ID: ${defaultCompany._id})`);
    
    // Migrate Coordinates
    console.log('\n📍 Migrating Coordinates...');
    const coordinatesWithoutCompany = await Coordinates.find({ companyId: { $exists: false } });
    console.log(`   Found ${coordinatesWithoutCompany.length} coordinates without companyId`);
    
    if (coordinatesWithoutCompany.length > 0) {
      const coordinatesResult = await Coordinates.updateMany(
        { companyId: { $exists: false } },
        { companyId: defaultCompany._id }
      );
      console.log(`   ✅ Updated ${coordinatesResult.modifiedCount} coordinates`);
    } else {
      console.log('   ℹ️  No coordinates to migrate');
    }
    
    // Migrate FeederCoverage
    console.log('\n⚡ Migrating FeederCoverage...');
    const feederCoverageWithoutCompany = await FeederCoverage.find({ companyId: { $exists: false } });
    console.log(`   Found ${feederCoverageWithoutCompany.length} feeder coverage records without companyId`);
    
    if (feederCoverageWithoutCompany.length > 0) {
      const feederCoverageResult = await FeederCoverage.updateMany(
        { companyId: { $exists: false } },
        { companyId: defaultCompany._id }
      );
      console.log(`   ✅ Updated ${feederCoverageResult.modifiedCount} feeder coverage records`);
    } else {
      console.log('   ℹ️  No feeder coverage records to migrate');
    }
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const coordinatesRemaining = await Coordinates.countDocuments({ companyId: { $exists: false } });
    const feederCoverageRemaining = await FeederCoverage.countDocuments({ companyId: { $exists: false } });
    
    if (coordinatesRemaining === 0 && feederCoverageRemaining === 0) {
      console.log('✅ Migration successful! All records now have companyId.');
    } else {
      console.log(`⚠️  Migration incomplete: ${coordinatesRemaining} coordinates and ${feederCoverageRemaining} feeder coverage records still missing companyId`);
    }
    
    console.log('\n🎉 Tenant ownership migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run migration
migrateTenantOwnership();
