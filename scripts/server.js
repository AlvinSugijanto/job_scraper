const { spawn, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const isWindows = os.platform() === 'win32';
const serverDir = path.join(__dirname, '..', 'server');

// Determine Python executable inside virtual environment
const getVenvPython = () => {
  return isWindows
    ? path.join(serverDir, 'venv', 'Scripts', 'python.exe')
    : path.join(serverDir, 'venv', 'bin', 'python');
};

// Determine global Python command to create virtual environment (prefer python3 on Linux/macOS)
const getGlobalPythonCommand = () => {
  if (isWindows) {
    return 'python';
  }
  try {
    const result = spawnSync('python3', ['--version']);
    if (result.status === 0) {
      return 'python3';
    }
  } catch (e) {
    // Ignore error and fallback to python
  }
  return 'python';
};

const args = process.argv.slice(2);
const command = args[0] || 'run';

if (command === 'setup') {
  const pythonCmd = getGlobalPythonCommand();
  console.log(`[Setup] Creating virtual environment using: ${pythonCmd}...`);
  
  const venvProcess = spawn(pythonCmd, ['-m', 'venv', 'venv'], {
    cwd: serverDir,
    stdio: 'inherit',
    shell: false
  });

  venvProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`[Setup] Error: Failed to create venv (exit code ${code}). Make sure Python is installed and added to your PATH.`);
      process.exit(code);
    }

    console.log('[Setup] Activating venv and installing pip dependencies...');
    const pythonExe = getVenvPython();

    const pipProcess = spawn(pythonExe, ['-m', 'pip', 'install', '-r', 'requirements.txt'], {
      cwd: serverDir,
      stdio: 'inherit',
      shell: false
    });

    pipProcess.on('close', (pipCode) => {
      if (pipCode !== 0) {
        console.error(`[Setup] Error: Failed to install dependencies (exit code ${pipCode}).`);
      } else {
        console.log('\n========================================');
        console.log('Server Setup Completed Successfully!');
        console.log('========================================\n');
      }
      process.exit(pipCode);
    });
  });
} else if (command === 'run') {
  const pythonExe = getVenvPython();
  
  if (!fs.existsSync(pythonExe)) {
    console.error(`[Error] Virtual environment not found at: ${pythonExe}`);
    console.error('[Error] Please run "npm run setup" first to initialize the project environment.');
    process.exit(1);
  }

  console.log(`[Server] Starting Python server using: ${pythonExe}...`);
  const serverProcess = spawn(pythonExe, ['main.py'], {
    cwd: serverDir,
    stdio: 'inherit',
    shell: false
  });

  serverProcess.on('close', (code) => {
    process.exit(code);
  });
} else {
  console.error(`[Error] Unknown command: ${command}. Use "setup" or "run".`);
  process.exit(1);
}
