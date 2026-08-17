#!/usr/bin/env node

/**
 * LITHA Verification Script
 * 
 * Comprehensive verification that runs all checks in sequence:
 * Build → Lint → Smoke → Health
 * Returns a single enterprise summary
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
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

// Verification results
const results = {
  build: { status: 'PENDING', message: '' },
  lint: { status: 'PENDING', message: '' },
  smoke: { status: 'PENDING', message: '' },
  health: { status: 'PENDING', message: '' }
};

/**
 * Print formatted header
 */
function printHeader() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}LITHA VERIFICATION${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}Enterprise Summary${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);
}

/**
 * Print formatted result
 */
function printResult(testName, status, message = '') {
  const statusColor = status === 'PASS' ? colors.green : (status === 'WARN' || status === 'SKIP' ? colors.yellow : colors.red);
  const statusText = status === 'PASS' ? '✔' : (status === 'WARN' ? '⚠' : (status === 'SKIP' ? '○' : '✗'));
  const dots = '.'.repeat(12 - testName.length);
  
  console.log(`${testName}${dots}${statusColor}${statusText}${colors.reset}`);
  if (message) {
    console.log(`  ${colors.cyan}${message}${colors.reset}`);
  }
}

/**
 * Run a command and return result
 */
function runCommand(command, description, cwd = process.cwd()) {
  try {
    console.log(`${colors.blue}Running: ${description}${colors.reset}`);
    execSync(command, { cwd, stdio: 'pipe', timeout: 60000 });
    return { status: 'PASS', message: `${description} completed` };
  } catch (error) {
    return { 
      status: 'FAIL', 
      message: `${description} failed: ${error.message}` 
    };
  }
}

/**
 * Check build status
 */
async function checkBuild() {
  console.log(`${colors.blue}Checking build status...${colors.reset}\n`);

  const backendPath = path.join(__dirname, '../');
  const frontendPath = path.join(__dirname, '../../frontend');

  // Check backend build
  const backendPackageJson = path.join(backendPath, 'package.json');
  const backendNodeModules = path.join(backendPath, 'node_modules');

  if (!fs.existsSync(backendPackageJson)) {
    results.build = { status: 'FAIL', message: 'Backend package.json not found' };
    return;
  }

  if (!fs.existsSync(backendNodeModules)) {
    results.build = { status: 'FAIL', message: 'Backend dependencies not installed (run npm install)' };
    return;
  }

  // Check frontend build
  if (fs.existsSync(frontendPath)) {
    const frontendBuild = path.join(frontendPath, 'dist');
    const frontendNodeModules = path.join(frontendPath, 'node_modules');

    if (!fs.existsSync(frontendNodeModules)) {
      results.build = { status: 'WARN', message: 'Frontend dependencies not installed (run npm install in frontend/)' };
      return;
    }

    if (!fs.existsSync(frontendBuild)) {
      results.build = { status: 'WARN', message: 'Frontend build not found (run npm run build in frontend/)' };
      return;
    }
  }

  results.build = { status: 'PASS', message: 'Build status OK' };
}

/**
 * Run lint check
 */
async function checkLint() {
  console.log(`${colors.blue}Running lint check...${colors.reset}\n`);

  const backendPath = path.join(__dirname, '../');

  // Check if ESLint is configured
  const eslintrc = path.join(backendPath, '.eslintrc.js');
  const eslintrcJson = path.join(backendPath, '.eslintrc.json');
  const packageJson = path.join(backendPath, 'package.json');

  if (!fs.existsSync(eslintrc) && !fs.existsSync(eslintrcJson)) {
    results.lint = { status: 'SKIP', message: 'Linting not configured' };
    return;
  }

  // Check if lint script exists in package.json
  if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    if (!pkg.scripts || !pkg.scripts.lint) {
      results.lint = { status: 'SKIP', message: 'Lint script not defined in package.json' };
      return;
    }

    // Run lint
    try {
      execSync('npm run lint', { cwd: backendPath, stdio: 'pipe', timeout: 60000 });
      results.lint = { status: 'PASS', message: 'Linting passed' };
    } catch (error) {
      results.lint = { status: 'WARN', message: 'Linting found issues (non-blocking)' };
    }
  } else {
    results.lint = { status: 'SKIP', message: 'package.json not found' };
  }
}

/**
 * Run smoke test
 */
async function runSmokeTest() {
  console.log(`${colors.blue}Running smoke test...${colors.reset}\n`);

  const smokeScript = path.join(__dirname, 'smoke.js');
  
  if (!fs.existsSync(smokeScript)) {
    results.smoke = { status: 'FAIL', message: 'Smoke test script not found' };
    return;
  }

  try {
    execSync(`node "${smokeScript}"`, { cwd: path.dirname(smokeScript), stdio: 'pipe', timeout: 30000 });
    results.smoke = { status: 'PASS', message: 'Smoke test passed' };
  } catch (error) {
    results.smoke = { status: 'FAIL', message: 'Smoke test failed' };
  }
}

/**
 * Run health check
 */
async function runHealthCheck() {
  console.log(`${colors.blue}Running health check...${colors.reset}\n`);

  const healthScript = path.join(__dirname, 'health.js');
  
  if (!fs.existsSync(healthScript)) {
    results.health = { status: 'FAIL', message: 'Health check script not found' };
    return;
  }

  try {
    execSync(`node "${healthScript}"`, { cwd: path.dirname(healthScript), stdio: 'pipe', timeout: 30000 });
    results.health = { status: 'PASS', message: 'Health check passed' };
  } catch (error) {
    results.health = { status: 'FAIL', message: 'Health check failed' };
  }
}

/**
 * Print overall summary
 */
function printSummary() {
  console.log(`\n${colors.bold}${colors.cyan}========================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}VERIFICATION SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================${colors.reset}\n`);

  printResult('Build', results.build.status, results.build.message);
  printResult('Lint', results.lint.status, results.lint.message);
  printResult('Smoke', results.smoke.status, results.smoke.message);
  printResult('Health', results.health.status, results.health.message);

  console.log(`\n${colors.bold}Overall:${colors.reset}`);
  
  const allPassed = Object.values(results).every(r => r.status === 'PASS' || r.status === 'SKIP');
  const hasWarnings = Object.values(results).some(r => r.status === 'WARN');
  const hasFailures = Object.values(results).some(r => r.status === 'FAIL');

  if (allPassed) {
    console.log(`${colors.green}${colors.bold}🟢 READY FOR NEXT EIP${colors.reset}`);
    console.log(`${colors.green}All verifications passed${colors.reset}\n`);
    process.exit(0);
  } else if (hasWarnings && !hasFailures) {
    console.log(`${colors.yellow}${colors.bold}🟡 READY FOR NEXT EIP (WITH WARNINGS)${colors.reset}`);
    console.log(`${colors.yellow}Review warnings above${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}🔴 NOT READY FOR NEXT EIP${colors.reset}`);
    console.log(`${colors.red}Address failures before proceeding${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader();

  console.log(`${colors.bold}Running verification sequence:${colors.reset}`);
  console.log(`${colors.cyan}1. Build${colors.reset}`);
  console.log(`${colors.cyan}2. Lint${colors.reset}`);
  console.log(`${colors.cyan}3. Smoke${colors.reset}`);
  console.log(`${colors.cyan}4. Health${colors.reset}\n`);

  // Run checks in sequence
  await checkBuild();
  console.log();

  await checkLint();
  console.log();

  await runSmokeTest();
  console.log();

  await runHealthCheck();
  console.log();

  printSummary();
}

// Run the verification
main().catch(error => {
  console.error(`${colors.red}Verification failed with error:${colors.reset}`, error);
  process.exit(1);
});
