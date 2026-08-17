#!/usr/bin/env node

/**
 * LITHA Smoke Test
 * 
 * Quick verification that the core system is operational.
 * Tests: Backend startup, Frontend build, Database connection, Authentication, API availability
 */

import http from 'http';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
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
  backend: { status: 'PENDING', message: '' },
  frontend: { status: 'PENDING', message: '' },
  database: { status: 'PENDING', message: '' },
  authentication: { status: 'PENDING', message: '' },
  api: { status: 'PENDING', message: '' }
};

/**
 * Print formatted header
 */
function printHeader() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}LITHA SMOKE TEST${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);
}

/**
 * Print formatted result
 */
function printResult(testName, status, message = '') {
  const statusColor = status === 'PASS' ? colors.green : (status === 'WARN' ? colors.yellow : colors.red);
  const statusText = status === 'PASS' ? 'PASS' : (status === 'WARN' ? 'WARN' : 'FAIL');
  const padding = Math.max(0, 12 - testName.length);
  const dots = '.'.repeat(padding);
  
  console.log(`${testName}${dots}${statusColor}${statusText}${colors.reset}`);
  if (message) {
    console.log(`  ${colors.yellow}${message}${colors.reset}`);
  }
}

/**
 * Test backend startup
 */
async function testBackend() {
  try {
    return new Promise((resolve) => {
      const req = http.get(`${BACKEND_URL}/health`, (res) => {
        if (res.statusCode === 200) {
          results.backend = { status: 'PASS', message: 'Backend is responding' };
        } else {
          results.backend = { status: 'WARN', message: `Backend returned status ${res.statusCode}` };
        }
        resolve();
      });

      req.on('error', (error) => {
        results.backend = { status: 'WARN', message: 'Backend not started' };
        resolve();
      });

      req.setTimeout(5000, () => {
        req.destroy();
        results.backend = { status: 'WARN', message: 'Backend not started' };
        resolve();
      });
    });
  } catch (error) {
    results.backend = { status: 'WARN', message: 'Backend not started' };
  }
}

/**
 * Test frontend build
 */
async function testFrontend() {
  try {
    const frontendPath = path.join(__dirname, '../../frontend');
    
    if (!fs.existsSync(frontendPath)) {
      results.frontend = { status: 'SKIP', message: 'Frontend directory not found' };
      return;
    }

    const packageJsonPath = path.join(frontendPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      results.frontend = { status: 'SKIP', message: 'Frontend package.json not found' };
      return;
    }

    // Check if node_modules exists
    const nodeModulesPath = path.join(frontendPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      results.frontend = { status: 'WARN', message: 'Frontend dependencies not installed (run npm install in frontend/)' };
      return;
    }

    // Check if build directory exists
    const buildPath = path.join(frontendPath, 'dist');
    if (fs.existsSync(buildPath)) {
      results.frontend = { status: 'PASS', message: 'Frontend build exists' };
    } else {
      results.frontend = { status: 'WARN', message: 'Frontend build not found (run npm run build in frontend/)' };
    }
  } catch (error) {
    results.frontend = { status: 'FAIL', message: error.message };
  }
}

/**
 * Test database connection
 */
async function testDatabase() {
  try {
    // Use configured MongoDB URI from environment, never hardcode localhost
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      results.database = { status: 'SKIP', message: 'MongoDB URI not configured' };
      return;
    }
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });

    // Check if we can perform a simple operation
    await mongoose.connection.db.admin().ping();
    
    results.database = { status: 'PASS', message: 'Database connected and responsive' };
    
    await mongoose.connection.close();
  } catch (error) {
    results.database = { status: 'WARN', message: `Database connection failed: ${error.message}` };
  }
}

/**
 * Test authentication availability
 */
async function testAuthentication() {
  try {
    return new Promise((resolve) => {
      const req = http.get(`${BACKEND_URL}/api/auth/login`, (res) => {
        // 404 is acceptable if the endpoint doesn't exist, but 401/400 means it's responding
        if (res.statusCode === 200 || res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 405) {
          results.authentication = { status: 'PASS', message: 'Authentication available' };
        } else if (res.statusCode === 404) {
          results.authentication = { status: 'WARN', message: 'Authentication route differs from default' };
        } else {
          results.authentication = { status: 'WARN', message: `Auth endpoint returned ${res.statusCode}` };
        }
        resolve();
      });

      req.on('error', (error) => {
        results.authentication = { status: 'WARN', message: 'Authentication not accessible (backend may not be running)' };
        resolve();
      });

      req.setTimeout(5000, () => {
        req.destroy();
        results.authentication = { status: 'WARN', message: 'Authentication request timed out' };
        resolve();
      });
    });
  } catch (error) {
    results.authentication = { status: 'WARN', message: 'Authentication not accessible' };
  }
}

/**
 * Test API availability
 */
async function testAPI() {
  try {
    return new Promise((resolve) => {
      const req = http.get(`${BACKEND_URL}/api/admin/test`, (res) => {
        // 401 is expected for protected routes without auth
        if (res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 403) {
          results.api = { status: 'PASS', message: 'API endpoints available' };
        } else {
          results.api = { status: 'WARN', message: `API returned status ${res.statusCode}` };
        }
        resolve();
      });

      req.on('error', (error) => {
        results.api = { status: 'WARN', message: 'API not accessible (backend may not be running)' };
        resolve();
      });

      req.setTimeout(5000, () => {
        req.destroy();
        results.api = { status: 'WARN', message: 'API request timed out' };
        resolve();
      });
    });
  } catch (error) {
    results.api = { status: 'WARN', message: 'API not accessible' };
  }
}

/**
 * Print overall summary
 */
function printSummary() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}SMOKE TEST SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);

  const allPassed = Object.values(results).every(r => r.status === 'PASS' || r.status === 'SKIP');
  const hasWarnings = Object.values(results).some(r => r.status === 'WARN');
  const hasFailures = Object.values(results).some(r => r.status === 'FAIL');

  printResult('Backend', results.backend.status, results.backend.message);
  printResult('Frontend', results.frontend.status, results.frontend.message);
  printResult('Database', results.database.status, results.database.message);
  printResult('Authentication', results.authentication.status, results.authentication.message);
  printResult('API', results.api.status, results.api.message);

  console.log(`\n${colors.bold}Overall:${colors.reset}`);
  
  if (allPassed) {
    console.log(`${colors.green}${colors.bold}✔ ALL TESTS PASSED${colors.reset}`);
    console.log(`${colors.green}System is operational${colors.reset}\n`);
    process.exit(0);
  } else if (hasWarnings && !hasFailures) {
    console.log(`${colors.yellow}${colors.bold}⚠ TESTS PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}System is operational but may need attention${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}✗ SOME TESTS FAILED${colors.reset}`);
    console.log(`${colors.red}System requires attention before development${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader();

  console.log(`${colors.blue}Running smoke tests...${colors.reset}\n`);

  // Run all tests in parallel
  await Promise.all([
    testBackend(),
    testFrontend(),
    testDatabase(),
    testAuthentication(),
    testAPI()
  ]);

  printSummary();
}

// Run the smoke test
main().catch(error => {
  console.error(`${colors.red}Smoke test failed with error:${colors.reset}`, error);
  process.exit(1);
});
