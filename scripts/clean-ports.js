/**
 * Script to clean up ports 3000 and 3001 before starting the servers
 */
const { execSync } = require('child_process');
const os = require('os');

console.log('Cleaning up ports 3000 and 3001...');

try {
  if (os.platform() === 'win32') {
    // Windows
    execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3000\') do taskkill /F /PID %a');
    execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3001\') do taskkill /F /PID %a');
  } else {
    // macOS/Linux
    execSync('pkill -f "node server.js" || true');
    execSync('pkill -f "webpack" || true');
    execSync('lsof -ti:3000 | xargs kill -9 || true');
    execSync('lsof -ti:3001 | xargs kill -9 || true');
  }
  console.log('Ports cleaned successfully');
} catch (error) {
  console.log('No processes were using the ports or error cleaning ports:', error.message);
} 