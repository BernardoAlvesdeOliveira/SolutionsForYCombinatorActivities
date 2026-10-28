const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const databasePath = path.join(backendDir, 'clients.db');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const processes = [
  {
    name: 'backend',
    cwd: backendDir,
    env: {
      ...process.env,
      DB_PATH: databasePath,
    },
    args: ['start'],
  },
  {
    name: 'frontend',
    cwd: frontendDir,
    env: {
      ...process.env,
      BROWSER: 'none',
    },
    args: ['start'],
  },
];

let shuttingDown = false;


const children = processes.map(({ name, cwd, env, args }) => {
  const child = spawn(npmCommand, args, {
    cwd,
    env,
    stdio: 'inherit',
  });

  child.on('error', error => {
    console.error(`[${name}] failed to start: ${error.message}`);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && signal === null) {
      console.error(`[${name}] stopped with code ${code}`);
      shutdown('SIGTERM');
    }
  });

  return child;
});

const shutdown = signal => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  children.forEach(child => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
