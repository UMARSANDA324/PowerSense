const { spawn } = require('child_process');

console.log('Starting frontend and backend development servers...');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: 'backend',
  shell: true,
  stdio: 'inherit'
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: 'frontend',
  shell: true,
  stdio: 'inherit'
});

// Handle termination signals to clean up child processes
const killProcesses = () => {
  console.log('\nStopping development servers...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit();
};

process.on('SIGINT', killProcesses);
process.on('SIGTERM', killProcesses);
process.on('exit', killProcesses);
