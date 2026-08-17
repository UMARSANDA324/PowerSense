#!/usr/bin/env node

/**
 * LITHA Developer Diagnostics
 * 
 * Comprehensive diagnostics for development environment.
 * Checks: Missing env variables, Dependency issues, Database connectivity, Configuration problems, Common startup issues
 */

import http from 'http';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Diagnostics results
const diagnostics = {
  environment: { issues: [], recommendations: [] },
  dependencies: { issues: [], recommendations: [] },
  database: { issues: [], recommendations: [] },
  configuration: { issues: [], recommendations: [] },
  startup: { issues: [], recommendations: [] }
};

/**
 * Print formatted header
 */
function printHeader() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}LITHA DOCTOR${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}Developer Diagnostics${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);
}

/**
 * Print diagnostic section
 */
function printSection(title, items) {
  if (items.length === 0) {
    console.log(`${colors.green}✓ ${title}: No issues found${colors.reset}\n`);
    return;
  }

  console.log(`${colors.yellow}⚠ ${title}:${colors.reset}`);
  items.forEach(item => {
    console.log(`  ${colors.red}•${colors.reset} ${item.issue}`);
    if (item.recommendation) {
      console.log(`  ${colors.green}  → ${item.recommendation}${colors.reset}`);
    }
  });
  console.log();
}

/**
 * Check environment variables
 */
async function checkEnvironment() {
  const requiredVars = [
    { name: 'MONGO_URI', description: 'MongoDB connection string' },
    { name: 'JWT_SECRET', description: 'JWT signing secret' }
  ];

  const recommendedVars = [
    { name: 'PORT', description: 'Backend server port (default: 5002)' },
    { name: 'NODE_ENV', description: 'Environment (development/production)' }
  ];

  requiredVars.forEach(v => {
    if (!process.env[v.name]) {
      diagnostics.environment.issues.push({
        issue: `Missing required environment variable: ${v.name}`,
        recommendation: `Add ${v.name} to your .env file (${v.description})`
      });
    }
  });

  recommendedVars.forEach(v => {
    if (!process.env[v.name]) {
      diagnostics.environment.recommendations.push({
        issue: `Optional environment variable not set: ${v.name}`,
        recommendation: `Consider setting ${v.name} (${v.description})`
      });
    }
  });
}

/**
 * Check dependencies
 */
async function checkDependencies() {
  const backendPath = path.join(__dirname, '../');
  const frontendPath = path.join(__dirname, '../../frontend');

  // Check backend dependencies
  const backendPackageJson = path.join(backendPath, 'package.json');
  const backendNodeModules = path.join(backendPath, 'node_modules');

  if (fs.existsSync(backendPackageJson)) {
    if (!fs.existsSync(backendNodeModules)) {
      diagnostics.dependencies.issues.push({
        issue: 'Backend dependencies not installed',
        recommendation: 'Run "npm install" in the backend directory'
      });
    }
  } else {
    diagnostics.dependencies.issues.push({
      issue: 'Backend package.json not found',
      recommendation: 'Ensure you are in the correct project directory'
    });
  }

  // Check frontend dependencies
  if (fs.existsSync(frontendPath)) {
    const frontendPackageJson = path.join(frontendPath, 'package.json');
    const frontendNodeModules = path.join(frontendPath, 'node_modules');

    if (fs.existsSync(frontendPackageJson)) {
      if (!fs.existsSync(frontendNodeModules)) {
        diagnostics.dependencies.issues.push({
          issue: 'Frontend dependencies not installed',
          recommendation: 'Run "npm install" in the frontend directory'
        });
      }
    }
  } else {
    diagnostics.dependencies.recommendations.push({
      issue: 'Frontend directory not found',
      recommendation: 'Frontend is optional for backend-only development'
    });
  }

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    diagnostics.dependencies.issues.push({
      issue: `Node.js version ${nodeVersion} is outdated`,
      recommendation: 'Upgrade to Node.js 16 or higher'
    });
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/litha';
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    // Check if we can perform operations
    const db = mongoose.connection.db;
    await db.admin().ping();

    await mongoose.connection.close();
  } catch (error) {
    diagnostics.database.issues.push({
      issue: `Database connection failed: ${error.message}`,
      recommendation: 'Ensure MongoDB is running and MONGO_URI is correct'
    });

    if (error.message.includes('ECONNREFUSED')) {
      diagnostics.database.recommendations.push({
        issue: 'MongoDB connection refused',
        recommendation: 'Start MongoDB service or check if MongoDB is installed'
      });
    }

    if (error.message.includes('Authentication failed')) {
      diagnostics.database.recommendations.push({
        issue: 'MongoDB authentication failed',
        recommendation: 'Check MongoDB username and password in MONGO_URI'
      });
    }
  }
}

/**
 * Check configuration
 */
async function checkConfiguration() {
  const backendPath = path.join(__dirname, '../');

  // Check for .env file
  const envFile = path.join(backendPath, '.env');
  if (!fs.existsSync(envFile)) {
    diagnostics.configuration.issues.push({
      issue: '.env file not found',
      recommendation: 'Create a .env file with required environment variables'
    });
  }

  // Check for .env.example
  const envExample = path.join(backendPath, '.env.example');
  if (!fs.existsSync(envExample)) {
    diagnostics.configuration.recommendations.push({
      issue: '.env.example file not found',
      recommendation: 'Create .env.example to document required environment variables'
    });
  }

  // Check if backend is already running
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`${BACKEND_URL}/api/auth/test`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          diagnostics.startup.recommendations.push({
            issue: 'Backend is already running',
            recommendation: 'Stop the backend server before starting a new instance'
          });
        }
        resolve();
      });
      req.on('error', resolve);
      req.setTimeout(1000, () => {
        req.destroy();
        resolve();
      });
    });
  } catch (error) {
    // Backend not running - this is normal
  }
}

/**
 * Check common startup issues
 */
async function checkStartupIssues() {
  // Check port availability
  try {
    await new Promise((resolve, reject) => {
      const server = http.createServer();
      server.listen(BACKEND_PORT, () => {
        server.close();
        resolve();
      });
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          diagnostics.startup.issues.push({
            issue: `Port ${BACKEND_PORT} is already in use`,
            recommendation: `Stop the process using port ${BACKEND_PORT} or change PORT in .env`
          });
        }
        resolve();
      });
    });
  } catch (error) {
    // Port check failed
  }

  // Check disk space
  const stats = fs.statSync(path.join(__dirname, '../'));
  if (stats) {
    // This is a basic check - in production you'd want more sophisticated checks
    diagnostics.startup.recommendations.push({
      issue: 'Ensure adequate disk space',
      recommendation: 'Monitor disk space for database growth and logs'
    });
  }

  // Check system resources
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

  if (memoryUsage > 90) {
    diagnostics.startup.issues.push({
      issue: `High memory usage: ${memoryUsage.toFixed(1)}%`,
      recommendation: 'Free up memory or close unnecessary applications'
    });
  }
}

/**
 * Print recommendations summary
 */
function printRecommendations() {
  const allIssues = [
    ...diagnostics.environment.issues,
    ...diagnostics.dependencies.issues,
    ...diagnostics.database.issues,
    ...diagnostics.configuration.issues,
    ...diagnostics.startup.issues
  ];

  const allRecommendations = [
    ...diagnostics.environment.recommendations,
    ...diagnostics.dependencies.recommendations,
    ...diagnostics.database.recommendations,
    ...diagnostics.configuration.recommendations,
    ...diagnostics.startup.recommendations
  ];

  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}DIAGNOSTICS SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);

  printSection('Environment Issues', diagnostics.environment.issues);
  printSection('Dependency Issues', diagnostics.dependencies.issues);
  printSection('Database Issues', diagnostics.database.issues);
  printSection('Configuration Issues', diagnostics.configuration.issues);
  printSection('Startup Issues', diagnostics.startup.issues);

  if (allRecommendations.length > 0) {
    console.log(`${colors.blue}${colors.bold}Recommendations:${colors.reset}`);
    allRecommendations.forEach(rec => {
      console.log(`  ${colors.cyan}•${colors.reset} ${rec.recommendation}`);
    });
    console.log();
  }

  console.log(`${colors.bold}Overall:${colors.reset}`);
  
  if (allIssues.length === 0) {
    console.log(`${colors.green}${colors.bold}✔ NO ISSUES FOUND${colors.reset}`);
    console.log(`${colors.green}Your development environment is healthy${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}${colors.bold}⚠ ${allIssues.length} ISSUE(S) FOUND${colors.reset}`);
    console.log(`${colors.yellow}Address the issues above for optimal development${colors.reset}\n`);
    process.exit(0);
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader();

  console.log(`${colors.blue}Running diagnostics...${colors.reset}\n`);

  // Run all diagnostic checks
  await Promise.all([
    checkEnvironment(),
    checkDependencies(),
    checkDatabase(),
    checkConfiguration(),
    checkStartupIssues()
  ]);

  printRecommendations();
}

// Run the diagnostics
main().catch(error => {
  console.error(`${colors.red}Diagnostics failed with error:${colors.reset}`, error);
  process.exit(1);
});
