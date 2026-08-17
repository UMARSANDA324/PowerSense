#!/usr/bin/env node

/**
 * LITHA System Health Check
 * 
 * Comprehensive health check for the LITHA system.
 * Verifies: Environment variables, Database, API health, Build status
 */

import http from 'http';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try loading from parent directory (project root)
  const rootEnvPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }
}

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const BACKEND_PORT = process.env.PORT || 5002;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// Test results tracking
const results = {
  environment: { status: 'PENDING', checks: [] },
  database: { status: 'PENDING', message: '', details: {} },
  api: { status: 'PENDING', message: '', details: {} },
  build: { status: 'PENDING', message: '', details: {} },
  system: { status: 'PENDING', message: '', details: {} }
};

/**
 * Print formatted header
 */
function printHeader() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}LITHA HEALTH REPORT${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);
}

/**
 * Print formatted result
 */
function printResult(testName, status, message = '', details = {}) {
  const statusColor = status === 'PASS' ? colors.green : (status === 'WARN' ? colors.yellow : colors.red);
  const statusText = status === 'PASS' ? 'PASS' : (status === 'WARN' ? 'WARN' : 'FAIL');
  const dots = '.'.repeat(12 - testName.length);
  
  console.log(`${testName}${dots}${statusColor}${statusText}${colors.reset}`);
  if (message) {
    console.log(`  ${colors.cyan}${message}${colors.reset}`);
  }
  
  // Print details if available
  if (Object.keys(details).length > 0) {
    Object.entries(details).forEach(([key, value]) => {
      console.log(`  ${colors.yellow}${key}:${colors.reset} ${value}`);
    });
  }
}

/**
 * Check environment variables
 */
async function checkEnvironment() {
  const checks = [];
  const requiredEnvVars = [
    'JWT_SECRET'
  ];
  
  const optionalEnvVars = [
    'MONGO_URI',
    'MONGODB_URI',
    'PORT',
    'NODE_ENV'
  ];

  // Check required variables
  requiredEnvVars.forEach(envVar => {
    const present = process.env[envVar] !== undefined && process.env[envVar] !== '';
    checks.push({
      name: envVar,
      status: present ? 'PASS' : 'FAIL',
      message: present ? 'Set' : 'Missing (required)'
    });
  });

  // Check optional variables
  optionalEnvVars.forEach(envVar => {
    const present = process.env[envVar] !== undefined && process.env[envVar] !== '';
    checks.push({
      name: envVar,
      status: present ? 'PASS' : 'WARN',
      message: present ? `Set to: ${process.env[envVar].substring(0, 20)}...` : 'Not set (optional)'
    });
  });
  
  // Special check: at least one MongoDB URI should be set
  const hasMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!hasMongoUri) {
    checks.push({
      name: 'MongoDB Configuration',
      status: 'WARN',
      message: 'No MongoDB URI configured (MONGO_URI or MONGODB_URI)'
    });
  } else {
    checks.push({
      name: 'MongoDB Configuration',
      status: 'PASS',
      message: 'MongoDB URI configured'
    });
  }

  results.environment.checks = checks;
  const allRequiredPassed = requiredEnvVars.every(v => process.env[v] !== undefined);
  results.environment.status = allRequiredPassed ? 'PASS' : 'FAIL';
}

/**
 * Check database health
 */
async function checkDatabase() {
  try {
    // Use configured MongoDB URI from environment, never hardcode localhost
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      results.database = {
        status: 'WARN',
        message: 'MongoDB URI not configured in environment',
        details: {}
      };
      return;
    }
    
    const startTime = Date.now();
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    const connectionTime = Date.now() - startTime;

    // Get database stats
    const db = mongoose.connection.db;
    const admin = db.admin();
    const serverInfo = await admin.serverInfo();
    const stats = await db.stats();

    results.database = {
      status: 'PASS',
      message: 'Database connected and responsive',
      details: {
        'Connection Time': `${connectionTime}ms`,
        'MongoDB Version': serverInfo.version,
        'Collections': stats.collections,
        'Data Size': `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        'Index Size': `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`
      }
    };

    await mongoose.connection.close();
  } catch (error) {
    results.database = {
      status: 'FAIL',
      message: `Database connection failed: ${error.message}`,
      details: {
        'Note': 'Ensure MongoDB Atlas NON-SRV URI is configured in .env'
      }
    };
  }
}

/**
 * Check API health
 */
async function checkAPI() {
  try {
    const endpoints = [
      { path: '/api/auth/test', name: 'Auth Test' },
      { path: '/api/admin/test', name: 'Admin Test' },
      { path: '/api/feeders', name: 'Feeders' }
    ];

    const endpointResults = [];
    let allPassed = true;

    for (const endpoint of endpoints) {
      try {
        const response = await new Promise((resolve, reject) => {
          const req = http.get(`${BACKEND_URL}${endpoint.path}`, (res) => {
            resolve({ statusCode: res.statusCode });
          });
          req.on('error', reject);
          req.setTimeout(3000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });

        const status = response.statusCode === 200 || response.statusCode === 401 || response.statusCode === 403 ? 'PASS' : 'FAIL';
        if (status === 'FAIL') allPassed = false;
        endpointResults.push({ name: endpoint.name, status, code: response.statusCode });
      } catch (error) {
        allPassed = false;
        endpointResults.push({ name: endpoint.name, status: 'FAIL', code: 'Error' });
      }
    }

    results.api = {
      status: allPassed ? 'PASS' : 'WARN',
      message: allPassed ? 'All API endpoints responsive' : 'Some API endpoints failed or backend not running',
      details: {
        'Endpoints Checked': endpointResults.length,
        'Endpoints Passed': endpointResults.filter(r => r.status === 'PASS').length
      }
    };
  } catch (error) {
    results.api = {
      status: 'WARN',
      message: `API health check failed: ${error.message}`,
      details: {}
    };
  }
}

/**
 * Check build status
 */
async function checkBuild() {
  try {
    const backendPath = path.join(__dirname, '../');
    const frontendPath = path.join(__dirname, '../../frontend');

    const checks = [];

    // Check backend
    const backendPackageJson = path.join(backendPath, 'package.json');
    if (fs.existsSync(backendPackageJson)) {
      checks.push({ name: 'Backend Package', status: 'PASS' });
    } else {
      checks.push({ name: 'Backend Package', status: 'FAIL' });
    }

    // Check frontend
    if (fs.existsSync(frontendPath)) {
      const frontendPackageJson = path.join(frontendPath, 'package.json');
      const frontendNodeModules = path.join(frontendPath, 'node_modules');
      const frontendBuild = path.join(frontendPath, 'dist');

      if (fs.existsSync(frontendPackageJson)) {
        checks.push({ name: 'Frontend Package', status: 'PASS' });
      } else {
        checks.push({ name: 'Frontend Package', status: 'FAIL' });
      }

      if (fs.existsSync(frontendNodeModules)) {
        checks.push({ name: 'Frontend Dependencies', status: 'PASS' });
      } else {
        checks.push({ name: 'Frontend Dependencies', status: 'WARN', message: 'Run npm install in frontend/' });
      }

      if (fs.existsSync(frontendBuild)) {
        checks.push({ name: 'Frontend Build', status: 'PASS' });
      } else {
        checks.push({ name: 'Frontend Build', status: 'WARN', message: 'Run npm run build in frontend/' });
      }
    } else {
      checks.push({ name: 'Frontend Directory', status: 'SKIP', message: 'Not found' });
    }

    const allPassed = checks.every(c => c.status === 'PASS' || c.status === 'SKIP');
    const hasWarnings = checks.some(c => c.status === 'WARN');

    results.build = {
      status: allPassed ? 'PASS' : (hasWarnings ? 'WARN' : 'FAIL'),
      message: allPassed ? 'All builds present' : (hasWarnings ? 'Some builds missing' : 'Build check failed'),
      details: {
        'Checks Performed': checks.length,
        'Checks Passed': checks.filter(c => c.status === 'PASS').length,
        'Warnings': checks.filter(c => c.status === 'WARN').length
      }
    };
  } catch (error) {
    results.build = {
      status: 'FAIL',
      message: `Build check failed: ${error.message}`,
      details: {}
    };
  }
}

/**
 * Check system resources
 */
async function checkSystem() {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = ((usedMemory / totalMemory) * 100).toFixed(2);

    const cpus = os.cpus();
    const cpuCount = cpus.length;

    results.system = {
      status: 'PASS',
      message: 'System resources adequate',
      details: {
        'Platform': os.platform(),
        'Architecture': os.arch(),
        'CPU Cores': cpuCount,
        'Total Memory': `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        'Used Memory': `${memoryUsage}%`,
        'Node Version': process.version
      }
    };
  } catch (error) {
    results.system = {
      status: 'WARN',
      message: `System check failed: ${error.message}`,
      details: {}
    };
  }
}

/**
 * Print overall summary
 */
function printSummary() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}HEALTH CHECK SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);

  printResult('Environment', results.environment.status, '', {});
  results.environment.checks.forEach(check => {
    const statusColor = check.status === 'PASS' ? colors.green : (check.status === 'WARN' ? colors.yellow : colors.red);
    console.log(`  ${statusColor}${check.name}: ${check.status}${colors.reset} - ${check.message}`);
  });

  console.log();
  printResult('Database', results.database.status, results.database.message, results.database.details);

  console.log();
  printResult('API', results.api.status, results.api.message, results.api.details);

  console.log();
  printResult('Build', results.build.status, results.build.message, results.build.details);

  console.log();
  printResult('System', results.system.status, results.system.message, results.system.details);

  console.log(`\n${colors.bold}Overall:${colors.reset}`);
  
  const allPassed = Object.values(results).every(r => r.status === 'PASS');
  const hasWarnings = Object.values(results).some(r => r.status === 'WARN');

  if (allPassed) {
    console.log(`${colors.green}${colors.bold}✔ SYSTEM HEALTHY${colors.reset}`);
    console.log(`${colors.green}All components operational${colors.reset}\n`);
    process.exit(0);
  } else if (hasWarnings) {
    console.log(`${colors.yellow}${colors.bold}⚠ SYSTEM HEALTHY WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Review warnings above${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}✗ SYSTEM UNHEALTHY${colors.reset}`);
    console.log(`${colors.red}Address failures before development${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader();

  console.log(`${colors.blue}Running health checks...${colors.reset}\n`);

  // Run all checks
  await Promise.all([
    checkEnvironment(),
    checkDatabase(),
    checkAPI(),
    checkBuild(),
    checkSystem()
  ]);

  printSummary();
}

// Run the health check
main().catch(error => {
  console.error(`${colors.red}Health check failed with error:${colors.reset}`, error);
  process.exit(1);
});
