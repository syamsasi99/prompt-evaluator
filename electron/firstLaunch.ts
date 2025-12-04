/**
 * First Launch Dependency Checker
 * Checks and optionally installs required dependencies on first app launch
 */

import { app, dialog, shell, BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InstallerWindow, type InstallStep } from './installer';

const PLATFORM = process.platform;

// Helper function to get the first launch flag path
function getFirstLaunchFlagPath(): string {
  return path.join(app.getPath('userData'), '.first-launch-complete');
}

interface DependencyStatus {
  nodejs: { installed: boolean; version?: string };
  promptfoo: { installed: boolean; version?: string };
}

interface ProgressStep {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  message?: string;
}

/**
 * Progress Window Manager for dependency checks
 */
class ProgressWindow {
  private window: BrowserWindow | null = null;
  private steps: ProgressStep[] = [];

  constructor() {
    this.steps = [
      { name: 'Checking Node.js installation', status: 'pending' },
      { name: 'Verifying Node.js version', status: 'pending' },
      { name: 'Checking npm availability', status: 'pending' },
      { name: 'Checking promptfoo installation', status: 'pending' },
      { name: 'Verifying promptfoo version', status: 'pending' },
    ];
  }

  create() {
    this.window = new BrowserWindow({
      width: 500,
      height: 400,
      resizable: false,
      frame: true,
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: 'Checking Dependencies...',
      backgroundColor: '#1e1e1e',
      show: false,
    });

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getHTML())}`);
    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    return this.window;
  }

  updateStep(stepIndex: number, status: 'checking' | 'success' | 'error', message?: string) {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.steps[stepIndex].status = status;
      if (message) {
        this.steps[stepIndex].message = message;
      }
      this.refresh();
    }
  }

  setStepStatus(stepName: string, status: 'checking' | 'success' | 'error', message?: string) {
    const index = this.steps.findIndex((s) => s.name === stepName);
    if (index !== -1) {
      this.updateStep(index, status, message);
    }
  }

  refresh() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getHTML())}`);
    }
  }

  close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }

  private getHTML(): string {
    // Only count successful steps, not errors or pending
    const completedSteps = this.steps.filter((s) => s.status === 'success').length;
    const totalSteps = this.steps.length;
    // Calculate percentage based on successfully completed steps only
    // If any step has an error, cap the progress at that point
    const hasError = this.steps.some((s) => s.status === 'error');
    const progressPercent = hasError ?
      (completedSteps / totalSteps) * 100 :
      (completedSteps / totalSteps) * 100;

    const stepsHTML = this.steps
      .map((step) => {
        let icon = '⏳';
        let color = '#888';
        if (step.status === 'checking') {
          icon = '🔄';
          color = '#4a9eff';
        } else if (step.status === 'success') {
          icon = '✓';
          color = '#4caf50';
        } else if (step.status === 'error') {
          icon = '✗';
          color = '#f44336';
        }

        const message = step.message ? `<div style="font-size: 12px; color: #aaa; margin-left: 30px;">${step.message}</div>` : '';

        return `
          <div style="margin: 12px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
            <div style="display: flex; align-items: center; color: ${color};">
              <span style="font-size: 20px; margin-right: 10px;">${icon}</span>
              <span style="flex: 1;">${step.name}</span>
            </div>
            ${message}
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #1e1e1e;
            color: #e0e0e0;
            padding: 30px;
            overflow: hidden;
          }
          h1 {
            font-size: 20px;
            margin-bottom: 20px;
            color: #fff;
            text-align: center;
          }
          .progress-container {
            background: #2a2a2a;
            border-radius: 8px;
            height: 8px;
            margin-bottom: 30px;
            overflow: hidden;
          }
          .progress-bar {
            background: linear-gradient(90deg, #4a9eff 0%, #6fb1ff 100%);
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 8px;
          }
          .progress-text {
            text-align: center;
            font-size: 14px;
            color: #aaa;
            margin-bottom: 20px;
          }
          .steps {
            max-height: 250px;
            overflow-y: auto;
          }
          .steps::-webkit-scrollbar {
            width: 8px;
          }
          .steps::-webkit-scrollbar-track {
            background: #2a2a2a;
            border-radius: 4px;
          }
          .steps::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 4px;
          }
          .steps::-webkit-scrollbar-thumb:hover {
            background: #777;
          }
        </style>
      </head>
      <body>
        <h1>🔍 Checking Required Dependencies</h1>

        <div class="progress-container">
          <div class="progress-bar" style="width: ${progressPercent}%"></div>
        </div>

        <div class="progress-text">
          ${completedSteps} of ${totalSteps} checks completed (${Math.round(progressPercent)}%)
        </div>

        <div class="steps">
          ${stepsHTML}
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Check if this is the first launch
 */
export function isFirstLaunch(): boolean {
  return !fs.existsSync(getFirstLaunchFlagPath());
}

/**
 * Mark first launch as complete
 */
export function markFirstLaunchComplete(): void {
  fs.writeFileSync(getFirstLaunchFlagPath(), new Date().toISOString());
}

/**
 * Check if Node.js is installed
 */
async function checkNodeJs(progressWindow?: ProgressWindow): Promise<{ installed: boolean; version?: string }> {
  return new Promise((resolve) => {
    progressWindow?.setStepStatus('Checking Node.js installation', 'checking');

    const nodeCheck = spawn('node', ['--version']);
    let version = '';

    nodeCheck.stdout.on('data', (data) => {
      version += data.toString().trim();
    });

    nodeCheck.on('close', (code) => {
      if (code === 0 && version) {
        progressWindow?.setStepStatus('Checking Node.js installation', 'success', `Found ${version}`);
        progressWindow?.setStepStatus('Verifying Node.js version', 'checking');

        // Check if version is >= 16
        const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
        const isValid = majorVersion >= 16;

        if (isValid) {
          progressWindow?.setStepStatus('Verifying Node.js version', 'success', `Version ${version} is compatible (requires v16+)`);
        } else {
          progressWindow?.setStepStatus('Verifying Node.js version', 'error', `Version ${version} is too old (requires v16+)`);
        }

        resolve({ installed: isValid, version });
      } else {
        progressWindow?.setStepStatus('Checking Node.js installation', 'error', 'Node.js not found');
        progressWindow?.setStepStatus('Verifying Node.js version', 'error', 'Skipped - Node.js not installed');
        resolve({ installed: false });
      }
    });

    nodeCheck.on('error', () => {
      progressWindow?.setStepStatus('Checking Node.js installation', 'error', 'Node.js not found');
      progressWindow?.setStepStatus('Verifying Node.js version', 'error', 'Skipped - Node.js not installed');
      resolve({ installed: false });
    });
  });
}

/**
 * Check if promptfoo is installed
 */
async function checkPromptfoo(progressWindow?: ProgressWindow): Promise<{ installed: boolean; version?: string }> {
  return new Promise((resolve) => {
    progressWindow?.setStepStatus('Checking npm availability', 'checking');

    // First check npm
    const npmCheck = spawn(PLATFORM === 'win32' ? 'npm.cmd' : 'npm', ['--version']);
    let npmVersion = '';

    npmCheck.stdout.on('data', (data) => {
      npmVersion += data.toString().trim();
    });

    npmCheck.on('close', (npmCode) => {
      if (npmCode === 0 && npmVersion) {
        progressWindow?.setStepStatus('Checking npm availability', 'success', `Found npm ${npmVersion}`);
      } else {
        progressWindow?.setStepStatus('Checking npm availability', 'error', 'npm not found');
      }

      // Now check promptfoo
      progressWindow?.setStepStatus('Checking promptfoo installation', 'checking');

      const promptfooCheck = spawn(PLATFORM === 'win32' ? 'where' : 'which', ['promptfoo']);

      promptfooCheck.on('close', (code) => {
        if (code === 0) {
          progressWindow?.setStepStatus('Checking promptfoo installation', 'success', 'Found promptfoo');
          progressWindow?.setStepStatus('Verifying promptfoo version', 'checking');

          // Verify with --version
          const versionCheck = spawn('promptfoo', ['--version']);
          let version = '';

          versionCheck.stdout.on('data', (data) => {
            version += data.toString().trim();
          });

          versionCheck.on('close', (vCode) => {
            if (vCode === 0 && version) {
              progressWindow?.setStepStatus('Verifying promptfoo version', 'success', `Version ${version}`);
              resolve({ installed: true, version });
            } else {
              progressWindow?.setStepStatus('Verifying promptfoo version', 'error', 'Could not determine version');
              resolve({ installed: false });
            }
          });

          versionCheck.on('error', () => {
            progressWindow?.setStepStatus('Verifying promptfoo version', 'error', 'Version check failed');
            resolve({ installed: false });
          });
        } else {
          progressWindow?.setStepStatus('Checking promptfoo installation', 'error', 'promptfoo not found');
          progressWindow?.setStepStatus('Verifying promptfoo version', 'error', 'Skipped - promptfoo not installed');
          resolve({ installed: false });
        }
      });

      promptfooCheck.on('error', () => {
        progressWindow?.setStepStatus('Checking promptfoo installation', 'error', 'promptfoo not found');
        progressWindow?.setStepStatus('Verifying promptfoo version', 'error', 'Skipped - promptfoo not installed');
        resolve({ installed: false });
      });
    });

    npmCheck.on('error', () => {
      progressWindow?.setStepStatus('Checking npm availability', 'error', 'npm not found');
      progressWindow?.setStepStatus('Checking promptfoo installation', 'error', 'Skipped - npm not available');
      progressWindow?.setStepStatus('Verifying promptfoo version', 'error', 'Skipped - npm not available');
      resolve({ installed: false });
    });
  });
}

/**
 * Get dependency status
 */
export async function checkDependencies(progressWindow?: ProgressWindow): Promise<DependencyStatus> {
  // Run checks sequentially to maintain progress order
  const nodejs = await checkNodeJs(progressWindow);
  const promptfoo = await checkPromptfoo(progressWindow);
  return { nodejs, promptfoo };
}

/**
 * Install Node.js using Homebrew on macOS
 */
async function installNodeWithBrew(installer: InstallerWindow): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    installer.addLog('📦 Installing Node.js using Homebrew...', 'info');
    installer.addLog('Running: brew install node', 'info');

    const extendedPath = process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin';

    const brewInstall = spawn('brew', ['install', 'node'], {
      shell: true,
      env: { ...process.env, PATH: extendedPath },
    });

    let errorOutput = '';

    brewInstall.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) installer.addLog(text, 'info');
    });

    brewInstall.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        errorOutput += text + '\n';
        if (text.toLowerCase().includes('error')) {
          installer.addLog(text, 'error');
        } else {
          installer.addLog(text, 'info');
        }
      }
    });

    brewInstall.on('close', (code) => {
      if (code === 0) {
        installer.addLog('✅ Homebrew installation completed successfully!', 'success');
        resolve({ success: true });
      } else {
        installer.addLog(`❌ Homebrew installation failed with exit code ${code}`, 'error');
        resolve({ success: false, error: errorOutput || 'Installation failed' });
      }
    });

    brewInstall.on('error', (err) => {
      installer.addLog(`❌ Failed to run brew: ${err.message}`, 'error');
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Install Node.js using winget on Windows
 */
async function installNodeWithWinget(installer: InstallerWindow): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    installer.addLog('📦 Installing Node.js using winget...', 'info');
    installer.addLog('Running: winget install OpenJS.NodeJS', 'info');

    const wingetInstall = spawn('winget', ['install', 'OpenJS.NodeJS', '--silent'], {
      shell: true,
    });

    let errorOutput = '';

    wingetInstall.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) installer.addLog(text, 'info');
    });

    wingetInstall.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        errorOutput += text + '\n';
        installer.addLog(text, 'error');
      }
    });

    wingetInstall.on('close', (code) => {
      if (code === 0) {
        installer.addLog('✅ winget installation completed successfully!', 'success');
        resolve({ success: true });
      } else {
        installer.addLog(`❌ winget installation failed with exit code ${code}`, 'error');
        resolve({ success: false, error: errorOutput || 'Installation failed' });
      }
    });

    wingetInstall.on('error', (err) => {
      installer.addLog(`❌ Failed to run winget: ${err.message}`, 'error');
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Install Node.js using apt on Linux (Debian/Ubuntu)
 */
async function installNodeWithApt(installer: InstallerWindow): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    installer.addLog('📦 Installing Node.js using apt...', 'info');
    installer.addLog('Running: sudo apt-get update && sudo apt-get install -y nodejs npm', 'info');

    // Note: This requires sudo and may need user password
    const aptInstall = spawn('bash', ['-c', 'sudo apt-get update && sudo apt-get install -y nodejs npm'], {
      shell: true,
    });

    let errorOutput = '';

    aptInstall.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) installer.addLog(text, 'info');
    });

    aptInstall.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        errorOutput += text + '\n';
        if (text.toLowerCase().includes('error')) {
          installer.addLog(text, 'error');
        } else {
          installer.addLog(text, 'info');
        }
      }
    });

    aptInstall.on('close', (code) => {
      if (code === 0) {
        installer.addLog('✅ apt installation completed successfully!', 'success');
        resolve({ success: true });
      } else {
        installer.addLog(`❌ apt installation failed with exit code ${code}`, 'error');
        resolve({ success: false, error: errorOutput || 'Installation failed' });
      }
    });

    aptInstall.on('error', (err) => {
      installer.addLog(`❌ Failed to run apt: ${err.message}`, 'error');
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Install promptfoo using npm
 */
async function installPromptfoo(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const npmCmd = PLATFORM === 'win32' ? 'npm.cmd' : 'npm';
    const installer = spawn(npmCmd, ['install', '-g', 'promptfoo'], {
      shell: true,
    });

    let output = '';
    let errorOutput = '';

    installer.stdout.on('data', (data) => {
      output += data.toString();
    });

    installer.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    installer.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: errorOutput || 'Installation failed' });
      }
    });

    installer.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Handle first launch setup on macOS
 */
async function handleMacOSFirstLaunch(status: DependencyStatus): Promise<void> {
  if (!status.nodejs.installed) {
    const response = await dialog.showMessageBox({
      type: 'warning',
      title: 'Node.js Required',
      message: 'Node.js (v16+) is required but not installed.',
      detail:
        'Prompt Evaluator requires Node.js to run evaluations.\n\nWould you like to download Node.js now?',
      buttons: ['Download Node.js', 'Remind Me Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      await shell.openExternal('https://nodejs.org/en/download/');
      await dialog.showMessageBox({
        type: 'info',
        title: 'Installation Required',
        message: 'Please install Node.js and restart the application.',
        detail:
          'After installing Node.js, you can install promptfoo by running:\n\nnpm install -g promptfoo',
      });
      app.quit();
      return;
    }
  } else if (!status.promptfoo.installed) {
    const response = await dialog.showMessageBox({
      type: 'question',
      title: 'Install promptfoo',
      message: 'The promptfoo CLI tool is required.',
      detail:
        'Node.js is installed, but promptfoo is missing.\n\nWould you like to install it now?',
      buttons: ['Install promptfoo', 'Install Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      const progressDialog = dialog.showMessageBox({
        type: 'info',
        title: 'Installing promptfoo',
        message: 'Installing promptfoo...',
        detail: 'Please wait while promptfoo is being installed globally.',
        buttons: [],
      });

      const result = await installPromptfoo();

      if (result.success) {
        await dialog.showMessageBox({
          type: 'info',
          title: 'Installation Complete',
          message: 'promptfoo has been installed successfully!',
          detail: 'You can now use all features of Prompt Evaluator.',
        });
      } else {
        await dialog.showMessageBox({
          type: 'error',
          title: 'Installation Failed',
          message: 'Failed to install promptfoo automatically.',
          detail: `Error: ${result.error}\n\nPlease install manually using:\n\nnpm install -g promptfoo`,
        });
      }
    }
  } else {
    // All dependencies installed
    await dialog.showMessageBox({
      type: 'info',
      title: 'Setup Complete',
      message: 'All dependencies are installed!',
      detail: `Node.js: ${status.nodejs.version}\nPromptfoo: ${status.promptfoo.version}\n\nYou're ready to start building evaluations!`,
    });
  }
}

/**
 * Handle first launch setup on Windows
 */
async function handleWindowsFirstLaunch(status: DependencyStatus): Promise<void> {
  if (!status.nodejs.installed) {
    const response = await dialog.showMessageBox({
      type: 'warning',
      title: 'Node.js Required',
      message: 'Node.js (v16+) is required but not installed.',
      detail:
        'Prompt Evaluator requires Node.js to run evaluations.\n\nWould you like to download Node.js now?',
      buttons: ['Download Node.js', 'Remind Me Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      await shell.openExternal('https://nodejs.org/en/download/');
      await dialog.showMessageBox({
        type: 'info',
        title: 'Installation Required',
        message: 'Please install Node.js and restart the application.',
        detail:
          'After installing Node.js, you can install promptfoo by running:\n\nnpm install -g promptfoo',
      });
      app.quit();
      return;
    }
  } else if (!status.promptfoo.installed) {
    const response = await dialog.showMessageBox({
      type: 'question',
      title: 'Install promptfoo',
      message: 'The promptfoo CLI tool is required.',
      detail:
        'Node.js is installed, but promptfoo is missing.\n\nWould you like to install it now?',
      buttons: ['Install promptfoo', 'Install Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      const result = await installPromptfoo();

      if (result.success) {
        await dialog.showMessageBox({
          type: 'info',
          title: 'Installation Complete',
          message: 'promptfoo has been installed successfully!',
          detail: 'You can now use all features of Prompt Evaluator.',
        });
      } else {
        await dialog.showMessageBox({
          type: 'error',
          title: 'Installation Failed',
          message: 'Failed to install promptfoo automatically.',
          detail: `Error: ${result.error}\n\nPlease install manually by opening Command Prompt and running:\n\nnpm install -g promptfoo`,
        });
      }
    }
  } else {
    // All dependencies installed
    await dialog.showMessageBox({
      type: 'info',
      title: 'Setup Complete',
      message: 'All dependencies are installed!',
      detail: `Node.js: ${status.nodejs.version}\nPromptfoo: ${status.promptfoo.version}\n\nYou're ready to start building evaluations!`,
    });
  }
}

/**
 * Handle first launch setup on Linux
 */
async function handleLinuxFirstLaunch(status: DependencyStatus): Promise<void> {
  if (!status.nodejs.installed) {
    const response = await dialog.showMessageBox({
      type: 'warning',
      title: 'Node.js Required',
      message: 'Node.js (v16+) is required but not installed.',
      detail:
        'Prompt Evaluator requires Node.js to run evaluations.\n\nPlease install Node.js using your package manager or download from nodejs.org',
      buttons: ['Open nodejs.org', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      await shell.openExternal('https://nodejs.org/en/download/');
    }
  } else if (!status.promptfoo.installed) {
    const response = await dialog.showMessageBox({
      type: 'question',
      title: 'Install promptfoo',
      message: 'The promptfoo CLI tool is required.',
      detail:
        'Node.js is installed, but promptfoo is missing.\n\nWould you like to install it now?',
      buttons: ['Install promptfoo', 'Install Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      const result = await installPromptfoo();

      if (result.success) {
        await dialog.showMessageBox({
          type: 'info',
          title: 'Installation Complete',
          message: 'promptfoo has been installed successfully!',
          detail: 'You can now use all features of Prompt Evaluator.',
        });
      } else {
        await dialog.showMessageBox({
          type: 'error',
          title: 'Installation Failed',
          message: 'Failed to install promptfoo automatically.',
          detail: `Error: ${result.error}\n\nPlease install manually using:\n\nsudo npm install -g promptfoo`,
        });
      }
    }
  } else {
    // All dependencies installed
    await dialog.showMessageBox({
      type: 'info',
      title: 'Setup Complete',
      message: 'All dependencies are installed!',
      detail: `Node.js: ${status.nodejs.version}\nPromptfoo: ${status.promptfoo.version}\n\nYou're ready to start building evaluations!`,
    });
  }
}

/**
 * Main first launch handler with dedicated installer window
 * Call this from main.ts BEFORE opening main window
 * Returns true if dependencies are ready, false if user cancelled
 */
export async function handleFirstLaunch(): Promise<boolean> {
  if (!isFirstLaunch()) {
    return true; // Not first launch, dependencies should be ready
  }

  console.log('First launch detected, showing installer...');

  // Create installer window
  const installer = new InstallerWindow();
  const installPromise = installer.create();

  // Give the window time to show
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Run dependency checks and get the result
  const needsRestart = await runDependencyChecks(installer);

  // Wait for user to click Continue (or close)
  const success = await installPromise;

  // Keep window open briefly to show final state
  await new Promise((resolve) => setTimeout(resolve, 500));

  installer.close();

  // Only mark first launch as complete if we don't need a restart
  // If we need a restart (e.g., Node.js was just installed), keep the flag
  // so setup runs again after restart
  if (!needsRestart) {
    markFirstLaunchComplete();
  }

  return success;
}

/**
 * Check if Homebrew is installed (macOS only)
 */
async function checkHomebrew(): Promise<boolean> {
  if (PLATFORM !== 'darwin') {
    return false;
  }

  return new Promise((resolve) => {
    // Ensure PATH includes common brew locations
    const extendedPath = process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin';

    const brewCheck = spawn('which', ['brew'], {
      shell: true,
      env: { ...process.env, PATH: extendedPath },
    });
    brewCheck.on('close', (code) => {
      resolve(code === 0);
    });
    brewCheck.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Install promptfoo 0.119.0 using Homebrew with sudo
 */
async function installPromptfooWithBrewSudo(installer: InstallerWindow, password: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    installer.addLog('📦 Installing promptfoo 0.119.0 using Homebrew (with sudo)...', 'info');
    installer.addLog('Running: sudo brew install promptfoo --formula', 'info');
    installer.updateStep('installing-promptfoo', 'installing', 'Installing via Homebrew (sudo)...');

    // Ensure PATH includes common brew locations
    const extendedPath = process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin';

    // Use sudo with the provided password
    const brewInstall = spawn('sudo', ['-S', 'brew', 'install', 'promptfoo', '--formula'], {
      shell: true,
      env: { ...process.env, PATH: extendedPath },
    });

    let errorOutput = '';

    // Send password to sudo
    if (brewInstall.stdin) {
      brewInstall.stdin.write(password + '\n');
      brewInstall.stdin.end();
    }

    brewInstall.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text && !text.includes('Password:')) {
        installer.addLog(text, 'info');
      }
    });

    brewInstall.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text && !text.includes('Password:')) {
        errorOutput += text + '\n';
        // Homebrew outputs progress to stderr, show as info unless it's an actual error
        if (text.toLowerCase().includes('error') || text.toLowerCase().includes('sorry')) {
          installer.addLog(text, 'error');
        } else {
          installer.addLog(text, 'info');
        }
      }
    });

    brewInstall.on('close', (code) => {
      if (code === 0) {
        installer.addLog('✅ Homebrew installation completed successfully!', 'success');
        resolve({ success: true });
      } else {
        if (errorOutput.toLowerCase().includes('sorry')) {
          installer.addLog('❌ Incorrect password or permission denied', 'error');
          resolve({ success: false, error: 'Incorrect password' });
        } else {
          installer.addLog(`❌ Homebrew installation failed with exit code ${code}`, 'error');
          resolve({ success: false, error: errorOutput || 'Installation failed' });
        }
      }
    });

    brewInstall.on('error', (err) => {
      installer.addLog(`❌ Failed to run sudo brew: ${err.message}`, 'error');
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Install promptfoo 0.119.0 using Homebrew
 */
async function installPromptfooWithBrew(installer: InstallerWindow): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    installer.addLog('📦 Installing promptfoo 0.119.0 using Homebrew...', 'info');
    installer.addLog('Running: brew install promptfoo', 'info');
    installer.updateStep('installing-promptfoo', 'installing', 'Installing via Homebrew...');

    // Ensure PATH includes common brew locations
    const extendedPath = process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin';

    const brewInstall = spawn('brew', ['install', 'promptfoo'], {
      shell: true,
      env: { ...process.env, PATH: extendedPath },
    });

    let errorOutput = '';

    brewInstall.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) installer.addLog(text, 'info');
    });

    brewInstall.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        errorOutput += text + '\n';
        // Homebrew outputs progress to stderr, show as info unless it's an actual error
        if (text.toLowerCase().includes('error')) {
          installer.addLog(text, 'error');
        } else {
          installer.addLog(text, 'info');
        }
      }
    });

    brewInstall.on('close', (code) => {
      if (code === 0) {
        installer.addLog('✅ Homebrew installation completed successfully!', 'success');
        resolve({ success: true });
      } else {
        installer.addLog(`❌ Homebrew installation failed with exit code ${code}`, 'error');
        // Log the actual error for debugging
        if (errorOutput) {
          installer.addLog(`Error details: ${errorOutput}`, 'error');
        }
        resolve({ success: false, error: errorOutput || 'Installation failed' });
      }
    });

    brewInstall.on('error', (err) => {
      installer.addLog(`❌ Failed to run brew: ${err.message}`, 'error');
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Install promptfoo 0.119.0 using npm
 */
async function installPromptfooWithNpm(installer: InstallerWindow): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const version = '0.119.0';
    installer.addLog(`📦 Installing promptfoo@${version} using npm...`, 'info');
    installer.addLog(`Running: npm install -g promptfoo@${version}`, 'info');
    installer.updateStep('installing-promptfoo', 'installing', 'Installing via npm...');

    // Ensure PATH includes common npm/node locations
    const extendedPath = process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin';

    const npmCmd = PLATFORM === 'win32' ? 'npm.cmd' : 'npm';
    const npmInstall = spawn(npmCmd, ['install', '-g', `promptfoo@${version}`], {
      shell: true,
      env: { ...process.env, PATH: extendedPath },
    });

    let errorOutput = '';

    npmInstall.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) installer.addLog(text, 'info');
    });

    npmInstall.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        errorOutput += text + '\n';
        // npm outputs warnings to stderr, only show actual errors
        if (text.includes('ERR!')) {
          installer.addLog(text, 'error');
        } else if (text.includes('WARN')) {
          installer.addLog(text, 'warning');
        } else {
          installer.addLog(text, 'info');
        }
      }
    });

    npmInstall.on('close', (code) => {
      if (code === 0) {
        installer.addLog('✅ npm installation completed successfully!', 'success');
        resolve({ success: true });
      } else {
        installer.addLog(`❌ npm installation failed with exit code ${code}`, 'error');
        resolve({ success: false, error: errorOutput || 'Installation failed' });
      }
    });

    npmInstall.on('error', (err) => {
      installer.addLog(`❌ Failed to run npm: ${err.message}`, 'error');
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Run all dependency checks
 * Returns true if a restart is needed, false otherwise
 */
async function runDependencyChecks(installer: InstallerWindow): Promise<boolean> {
  installer.addLog('Starting dependency verification...', 'info');
  installer.addLog(`Platform: ${PLATFORM}`, 'info');

  // Step 1: Check Node.js
  installer.updateStep('checking-nodejs', 'checking');
  const nodejs = await checkNodeJsForInstaller(installer);

  if (!nodejs.installed) {
    installer.addLog('', 'error');
    installer.addLog('❌ Node.js not found or version is too old', 'error');
    installer.updateStep('checking-nodejs', 'error', 'Not found or too old');
    installer.updateStep('verifying-nodejs-version', 'error', 'Skipped');

    installer.addLog('', 'info');
    installer.addLog('📦 Node.js v16 or higher is required to run Prompt Evaluator', 'warning');
    installer.addLog('', 'info');
    installer.addLog('Attempting automatic installation...', 'info');
    installer.addLog('', 'info');

    // Try automatic installation based on platform
    let installResult: { success: boolean; error?: string } | null = null;

    if (PLATFORM === 'darwin') {
      // macOS: Try Homebrew
      installer.addLog('Checking for Homebrew...', 'info');
      const hasHomebrew = await checkHomebrew();

      if (hasHomebrew) {
        installer.addLog('✓ Homebrew found, installing Node.js...', 'success');
        installResult = await installNodeWithBrew(installer);
      } else {
        installer.addLog('⚠️ Homebrew not found', 'warning');
        installer.addLog('', 'info');
        installer.addLog('To enable automatic installation, please install Homebrew:', 'info');
        installer.addLog('  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', 'info');
        installer.addLog('', 'info');
      }
    } else if (PLATFORM === 'win32') {
      // Windows: Try winget (available on Windows 10 1709+ and Windows 11)
      installer.addLog('Attempting installation using winget...', 'info');
      installResult = await installNodeWithWinget(installer);
    } else {
      // Linux: Try apt (works for Debian/Ubuntu)
      installer.addLog('Attempting installation using apt...', 'info');
      installResult = await installNodeWithApt(installer);
    }

    // Check if installation succeeded
    if (installResult?.success) {
      installer.addLog('', 'success');
      installer.addLog('✅ Node.js has been installed successfully!', 'success');
      installer.addLog('', 'info');
      installer.addLog('⚠️ Please close and restart Prompt Evaluator to complete the setup', 'warning');
      installer.addLog('', 'info');

      installer.updateStep('checking-nodejs', 'success', 'Installed successfully');
      installer.updateStep('verifying-nodejs-version', 'success', 'Ready after restart');
      installer.updateStep('checking-npm', 'error', 'Pending restart');
      installer.updateStep('checking-promptfoo', 'error', 'Pending restart');
      installer.updateStep('verifying-promptfoo-version', 'error', 'Pending restart');

      installer.updateProgress({ currentStep: 2 });
      installer.setComplete(false, 'Node.js installed! Please restart the application to continue setup.');
      return true; // Restart needed
    }

    // If automatic installation failed, show manual instructions
    installer.addLog('', 'warning');
    installer.addLog('Automatic installation failed. Please install manually:', 'warning');
    installer.addLog('', 'info');

    installer.updateStep('checking-npm', 'error', 'Skipped');
    installer.updateStep('checking-promptfoo', 'error', 'Skipped');
    installer.updateStep('verifying-promptfoo-version', 'error', 'Skipped');

    if (PLATFORM === 'darwin') {
      installer.addLog('🍎 For macOS:', 'info');
      installer.addLog('', 'info');
      installer.addLog('Option 1 - Using Homebrew (recommended):', 'info');
      installer.addLog('  1. Install Homebrew if you don\'t have it:', 'info');
      installer.addLog('     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', 'info');
      installer.addLog('  2. Then install Node.js:', 'info');
      installer.addLog('     brew install node', 'info');
      installer.addLog('', 'info');
      installer.addLog('Option 2 - Direct download:', 'info');
      installer.addLog('  Visit https://nodejs.org and download the LTS version', 'info');
    } else if (PLATFORM === 'win32') {
      installer.addLog('🪟 For Windows:', 'info');
      installer.addLog('', 'info');
      installer.addLog('Option 1 - Using winget (Windows 10 1709+ / Windows 11):', 'info');
      installer.addLog('  winget install OpenJS.NodeJS', 'info');
      installer.addLog('', 'info');
      installer.addLog('Option 2 - Direct download:', 'info');
      installer.addLog('  Visit https://nodejs.org and download the LTS version', 'info');
    } else {
      installer.addLog('🐧 For Linux:', 'info');
      installer.addLog('', 'info');
      installer.addLog('For Debian/Ubuntu:', 'info');
      installer.addLog('  sudo apt-get update', 'info');
      installer.addLog('  sudo apt-get install -y nodejs npm', 'info');
      installer.addLog('', 'info');
      installer.addLog('For other distributions, visit:', 'info');
      installer.addLog('  https://nodejs.org/en/download/package-manager/', 'info');
    }

    installer.addLog('', 'warning');
    installer.addLog('⚠️ After installing Node.js, please close and reopen Prompt Evaluator', 'warning');
    installer.addLog('', 'info');

    // Set current step to 0 since we failed at the first check
    installer.updateProgress({ currentStep: 0 });
    installer.setComplete(false, 'Please install Node.js, then reopen Prompt Evaluator');

    return false; // No restart needed, user must install manually
  }

  installer.addLog(`✅ Node.js ${nodejs.version} detected`, 'success');

  // Step 2: Check npm
  installer.addLog('🔍 Checking npm (Node Package Manager)...', 'info');
  installer.updateStep('checking-npm', 'checking');
  await new Promise((resolve) => setTimeout(resolve, 300));
  installer.updateStep('checking-npm', 'success', 'Available');
  installer.addLog('✅ npm is available', 'success');

  // Step 3: Check promptfoo
  installer.addLog('Searching for promptfoo installation...', 'info');
  installer.updateStep('checking-promptfoo', 'checking');
  const promptfoo = await checkPromptfooForInstaller(installer);

  if (!promptfoo.installed) {
    installer.addLog('⚠️ promptfoo not found in system PATH', 'warning');
    installer.updateStep('checking-promptfoo', 'error', 'Not installed');
    installer.updateStep('verifying-promptfoo-version', 'error', 'Skipped');

    // Show installation instructions and attempt automatic installation
    installer.addLog('', 'info');
    installer.addLog('📦 promptfoo 0.119.0 is required to run evaluations', 'info');
    installer.addLog('', 'info');
    installer.addLog('Attempting automatic installation...', 'info');
    installer.addLog('', 'info');

    // Try automatic installation
    installer.updateStep('installing-promptfoo', 'installing', 'Installing promptfoo...');
    const installResult = await installPromptfooWithNpm(installer);

    if (installResult.success) {
      installer.addLog('', 'success');
      installer.addLog('✅ promptfoo has been installed successfully!', 'success');
      installer.addLog('', 'info');

      // Verify the installation
      installer.addLog('Verifying installation...', 'info');
      const verifyResult = await checkPromptfooForInstaller(installer);

      if (verifyResult.installed) {
        installer.addLog(`✅ Verified: promptfoo ${verifyResult.version} is ready`, 'success');
        installer.updateStep('checking-promptfoo', 'success', 'Installed successfully');
        installer.updateStep('verifying-promptfoo-version', 'success', `Version ${verifyResult.version}`);

        // Add helpful info about .env file location
        installer.addLog('', 'info');
        installer.addLog('💡 Optional: Configure API Keys', 'info');
        installer.addLog('To use AI providers, create a .env file with your API keys:', 'info');

        const userDataPath = app.getPath('userData');

        // Create .env.example file if it doesn't exist
        const envExamplePath = path.join(userDataPath, '.env.example');
        if (!fs.existsSync(envExamplePath)) {
          const exampleContent = `# API Keys for AI Providers
# Copy this file to .env and add your actual API keys

# OpenAI API Key (for GPT models)
# Get yours at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic API Key (for Claude models)
# Get yours at: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Google Gemini API Key
# Get yours at: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-key-here
`;
          fs.writeFileSync(envExamplePath, exampleContent, 'utf-8');
        }

        if (PLATFORM === 'darwin') {
          installer.addLog(`  Location: ${userDataPath}/.env`, 'info');
          installer.addLog(`  Example template: ${userDataPath}/.env.example`, 'info');
          installer.addLog(`  Or run: open "${userDataPath}"`, 'info');
        } else if (PLATFORM === 'win32') {
          installer.addLog(`  Location: ${userDataPath}\\.env`, 'info');
          installer.addLog(`  Example template: ${userDataPath}\\.env.example`, 'info');
          installer.addLog(`  Or run: explorer "${userDataPath}"`, 'info');
        } else {
          installer.addLog(`  Location: ${userDataPath}/.env`, 'info');
          installer.addLog(`  Example template: ${userDataPath}/.env.example`, 'info');
        }

        installer.addLog('', 'info');
        installer.addLog('Copy .env.example to .env and add your API keys', 'info');

        installer.setComplete(true, 'All dependencies are ready! Click Continue to start.');
        return false; // No restart needed, everything is ready
      } else {
        installer.addLog('⚠️ Installation completed but verification failed', 'warning');
        installer.addLog('You may need to restart your terminal or computer', 'warning');
      }
    }

    // If automatic installation failed, show manual instructions
    installer.addLog('', 'warning');
    installer.addLog('Automatic installation failed. Please install manually:', 'warning');
    installer.addLog('', 'info');

    // Platform-specific instructions
    if (PLATFORM === 'darwin') {
      // macOS instructions
      installer.addLog('🍎 For macOS, use Homebrew (recommended):', 'info');
      installer.addLog('', 'info');
      installer.addLog('1. If you don\'t have Homebrew, install it first:', 'info');
      installer.addLog('   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', 'info');
      installer.addLog('', 'info');
      installer.addLog('2. Then install promptfoo:', 'info');
      installer.addLog('   brew install promptfoo', 'info');
      installer.addLog('', 'info');
      installer.addLog('Alternative using npm:', 'info');
      installer.addLog('   npm install -g promptfoo@0.119.0', 'info');
    } else if (PLATFORM === 'win32') {
      // Windows instructions
      installer.addLog('🪟 For Windows, use npm:', 'info');
      installer.addLog('', 'info');
      installer.addLog('Open Command Prompt or PowerShell and run:', 'info');
      installer.addLog('   npm install -g promptfoo@0.119.0', 'info');
    } else {
      // Linux/Other instructions
      installer.addLog('🐧 For Linux, use npm:', 'info');
      installer.addLog('', 'info');
      installer.addLog('Open Terminal and run:', 'info');
      installer.addLog('   npm install -g promptfoo@0.119.0', 'info');
      installer.addLog('', 'info');
      installer.addLog('If you get permission errors, use:', 'info');
      installer.addLog('   sudo npm install -g promptfoo@0.119.0', 'info');
    }

    installer.addLog('', 'warning');
    installer.addLog('⚠️ After installing promptfoo, please close and reopen Prompt Evaluator', 'warning');
    installer.addLog('', 'info');

    // Set current step to 3 (we got past Node.js and npm checks)
    installer.updateProgress({ currentStep: 3 });
    installer.setComplete(false, 'Please install promptfoo using Terminal, then reopen Prompt Evaluator');
    return false; // No restart needed, user must install manually
  } else {
    installer.addLog(`✓ promptfoo ${promptfoo.version} found`, 'success');
    installer.updateStep('checking-promptfoo', 'success', 'Found promptfoo');
    installer.updateStep('verifying-promptfoo-version', 'success', `Version ${promptfoo.version}`);
    installer.updateStep('installing-promptfoo', 'success', 'Not needed');
    installer.addLog('All dependencies verified and ready!', 'success');

    // Add helpful info about .env file location
    installer.addLog('', 'info');
    installer.addLog('💡 Optional: Configure API Keys', 'info');
    installer.addLog('To use AI providers, create a .env file with your API keys:', 'info');

    const userDataPath = app.getPath('userData');

    // Create .env.example file if it doesn't exist
    const fs = require('fs');
    const envExamplePath = path.join(userDataPath, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      const exampleContent = `# API Keys for AI Providers
# Copy this file to .env and add your actual API keys

# OpenAI API Key (for GPT models)
# Get yours at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic API Key (for Claude models)
# Get yours at: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Google Gemini API Key
# Get yours at: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-key-here
`;
      fs.writeFileSync(envExamplePath, exampleContent, 'utf-8');
    }

    if (PLATFORM === 'darwin') {
      installer.addLog(`  Location: ${userDataPath}/.env`, 'info');
      installer.addLog(`  Example template: ${userDataPath}/.env.example`, 'info');
      installer.addLog(`  Or run: open "${userDataPath}"`, 'info');
    } else if (PLATFORM === 'win32') {
      installer.addLog(`  Location: ${userDataPath}\\.env`, 'info');
      installer.addLog(`  Example template: ${userDataPath}\\.env.example`, 'info');
      installer.addLog(`  Or run: explorer "${userDataPath}"`, 'info');
    } else {
      installer.addLog(`  Location: ${userDataPath}/.env`, 'info');
      installer.addLog(`  Example template: ${userDataPath}/.env.example`, 'info');
    }

    installer.addLog('', 'info');
    installer.addLog('Copy .env.example to .env and add your API keys', 'info');

    installer.setComplete(true, 'All dependencies are ready! Click Continue to start.');
    return false; // No restart needed, everything is ready
  }
}

/**
 * Check Node.js for installer (simplified version)
 */
async function checkNodeJsForInstaller(installer: InstallerWindow): Promise<{ installed: boolean; version?: string }> {
  return new Promise((resolve) => {
    installer.addLog('Running: node --version', 'info');

    // Use shell to properly load PATH from user environment
    const nodeCheck = spawn('node', ['--version'], {
      shell: true,
      env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' }
    });
    let version = '';

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      installer.addLog('ERROR: node command timed out after 5 seconds', 'error');
      installer.updateStep('checking-nodejs', 'error', 'Command timed out');
      installer.updateStep('verifying-nodejs-version', 'error', 'Skipped');
      nodeCheck.kill();
      resolve({ installed: false });
    }, 5000);

    nodeCheck.stdout.on('data', (data) => {
      version += data.toString().trim();
    });

    nodeCheck.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && version) {
        installer.addLog(`Command output: ${version}`, 'info');
        installer.updateStep('checking-nodejs', 'success', `Found ${version}`);
        installer.addLog('Verifying Node.js version compatibility...', 'info');
        installer.updateStep('verifying-nodejs-version', 'checking');

        const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
        const isValid = majorVersion >= 16;

        if (isValid) {
          installer.addLog(`Version check passed: ${version} >= v16`, 'success');
          installer.updateStep('verifying-nodejs-version', 'success', `Version ${version} is compatible`);
          resolve({ installed: true, version });
        } else {
          installer.addLog(`Version check failed: ${version} < v16`, 'error');
          installer.updateStep('verifying-nodejs-version', 'error', `Version ${version} is too old (requires v16+)`);
          resolve({ installed: false, version });
        }
      } else {
        installer.addLog('ERROR: node command not found in PATH', 'error');
        installer.updateStep('checking-nodejs', 'error', 'Node.js not found');
        installer.updateStep('verifying-nodejs-version', 'error', 'Skipped');
        resolve({ installed: false });
      }
    });

    nodeCheck.on('error', (err) => {
      clearTimeout(timeout);
      installer.addLog(`ERROR: Failed to spawn node process - ${err.message}`, 'error');
      installer.updateStep('checking-nodejs', 'error', 'Node.js not found');
      installer.updateStep('verifying-nodejs-version', 'error', 'Skipped');
      resolve({ installed: false });
    });
  });
}

/**
 * Check promptfoo for installer (simplified version)
 */
async function checkPromptfooForInstaller(installer: InstallerWindow): Promise<{ installed: boolean; version?: string }> {
  return new Promise((resolve) => {
    const checkCmd = PLATFORM === 'win32' ? 'where' : 'which';
    installer.addLog(`Running: ${checkCmd} promptfoo`, 'info');
    const promptfooCheck = spawn(checkCmd, ['promptfoo'], {
      shell: true,
      env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' }
    });

    promptfooCheck.on('close', (code) => {
      if (code === 0) {
        installer.addLog('promptfoo found in PATH', 'info');
        installer.updateStep('checking-promptfoo', 'success', 'Found promptfoo');
        installer.addLog('Getting promptfoo version...', 'info');
        installer.updateStep('verifying-promptfoo-version', 'checking');

        const versionCheck = spawn('promptfoo', ['--version'], {
          shell: true,
          env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' }
        });
        let version = '';

        versionCheck.stdout.on('data', (data) => {
          version += data.toString().trim();
        });

        versionCheck.on('close', (vCode) => {
          if (vCode === 0 && version) {
            // Extract just the version number (e.g., "0.118.3" from output with warnings)
            const versionMatch = version.match(/\d+\.\d+\.\d+/);
            const cleanVersion = versionMatch ? versionMatch[0] : version;
            installer.addLog(`promptfoo version: ${cleanVersion}`, 'success');
            installer.updateStep('verifying-promptfoo-version', 'success', `Version ${cleanVersion}`);
            resolve({ installed: true, version: cleanVersion });
          } else {
            installer.addLog('ERROR: Could not determine promptfoo version', 'error');
            installer.updateStep('verifying-promptfoo-version', 'error', 'Could not determine version');
            resolve({ installed: false });
          }
        });

        versionCheck.on('error', (err) => {
          installer.addLog(`ERROR: Failed to check version - ${err.message}`, 'error');
          installer.updateStep('verifying-promptfoo-version', 'error', 'Version check failed');
          resolve({ installed: false });
        });
      } else {
        // Don't log here - main flow will handle logging
        resolve({ installed: false });
      }
    });

    promptfooCheck.on('error', (err) => {
      // Don't log here - main flow will handle logging
      resolve({ installed: false });
    });
  });
}

/**
 * Force dependency check (can be called from menu or settings)
 */
export async function forceDependencyCheck(): Promise<DependencyStatus> {
  // Create progress window
  const progressWindow = new ProgressWindow();
  progressWindow.create();

  // Give the window time to show
  await new Promise((resolve) => setTimeout(resolve, 500));

  const status = await checkDependencies(progressWindow);

  // Keep progress window open for a moment so user can see final status
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Close progress window
  progressWindow.close();

  if (status.nodejs.installed && status.promptfoo.installed) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Dependencies OK',
      message: 'All required dependencies are installed!',
      detail: `Node.js: ${status.nodejs.version}\nPromptfoo: ${status.promptfoo.version}`,
    });
  } else if (!status.nodejs.installed) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Missing Dependency',
      message: 'Node.js is not installed',
      detail: 'Please install Node.js v16 or higher from https://nodejs.org',
    });
  } else if (!status.promptfoo.installed) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Missing Dependency',
      message: 'promptfoo is not installed',
      detail: 'Please run: npm install -g promptfoo',
    });
  }

  return status;
}
