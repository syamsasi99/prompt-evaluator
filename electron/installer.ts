/**
 * Dedicated Installer Window
 * Shows setup progress and handles dependency installation
 * Only proceeds to main app after successful setup
 */

import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';

export type InstallStep =
  | 'checking-nodejs'
  | 'verifying-nodejs-version'
  | 'checking-npm'
  | 'checking-promptfoo'
  | 'verifying-promptfoo-version'
  | 'installing-promptfoo'
  | 'complete'
  | 'failed';

export type StepStatus = 'pending' | 'checking' | 'success' | 'error' | 'installing';

export interface InstallProgress {
  step: InstallStep;
  status: StepStatus;
  message?: string;
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  log?: string;
  logType?: 'info' | 'success' | 'error' | 'warning';
}

/**
 * Installer Window - Full-screen setup experience
 */
export class InstallerWindow {
  private window: BrowserWindow | null = null;
  private currentProgress: InstallProgress;
  private resolveCompletion: ((success: boolean) => void) | null = null;
  private resolveInstall: ((install: boolean) => void) | null = null;

  constructor() {
    this.currentProgress = {
      step: 'checking-nodejs',
      status: 'pending',
      currentStep: 0,
      totalSteps: 5,
      canProceed: false,
    };
  }

  /**
   * Create and show the installer window
   */
  create(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveCompletion = resolve;

      this.window = new BrowserWindow({
        width: 800,
        height: 600,
        resizable: false,
        frame: true,
        titleBarStyle: 'hiddenInset',
        title: 'Setting up Prompt Evaluator',
        backgroundColor: '#0f0f0f',
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'installer-preload.js'),
        },
      });

      // Register IPC handlers for installer actions
      this.registerHandlers();

      // Write HTML to temp file to avoid data URI issues
      const htmlPath = path.join(app.getPath('temp'), 'promptfoo-installer.html');
      fs.writeFileSync(htmlPath, this.getHTML(), 'utf-8');

      // Load the installer HTML from file
      this.window.loadFile(htmlPath);

      this.window.once('ready-to-show', () => {
        this.window?.show();
        this.window?.focus();
      });

      this.window.on('closed', () => {
        this.cleanup();
      });
    });
  }

  /**
   * Register IPC handlers for installer window
   */
  private registerHandlers() {
    // Handle user actions (install, skip, retry, etc.)
    ipcMain.handle('installer:action', async (_event, action: string, data?: any) => {
      switch (action) {
        case 'install-nodejs':
          return { action: 'install-nodejs' };
        case 'install-promptfoo':
          return { action: 'install-promptfoo', data };
        case 'skip':
          return { action: 'skip' };
        case 'install':
          // Resolve the install promise with true to indicate install was clicked
          if (this.resolveInstall) {
            this.resolveInstall(true);
            this.resolveInstall = null;
          }
          return { action: 'install' };
        case 'close':
          // Resolve install promise with false (cancel)
          if (this.resolveInstall) {
            this.resolveInstall(false);
            this.resolveInstall = null;
          }
          this.complete(false);
          return { action: 'close' };
        case 'continue':
          this.complete(true);
          return { action: 'continue' };
        default:
          return { action: 'unknown' };
      }
    });
  }

  /**
   * Update the installation progress
   */
  updateProgress(progress: Partial<InstallProgress>) {
    this.currentProgress = { ...this.currentProgress, ...progress };
    this.refresh();
  }

  /**
   * Update a specific step
   */
  updateStep(step: InstallStep, status: StepStatus, message?: string) {
    const stepNumber = this.getStepNumber(step);
    this.currentProgress = {
      ...this.currentProgress,
      step,
      status,
      message,
      currentStep: stepNumber,
    };
    this.refresh();
  }

  /**
   * Add a log message to console output
   */
  addLog(log: string, logType: 'info' | 'success' | 'error' | 'warning' = 'info') {
    this.currentProgress = {
      ...this.currentProgress,
      log,
      logType,
    };
    this.refresh();
  }

  /**
   * Mark installation as complete (success or failure)
   */
  setComplete(success: boolean, message?: string) {
    this.currentProgress = {
      ...this.currentProgress,
      step: success ? 'complete' : 'failed',
      status: success ? 'success' : 'error',
      message,
      canProceed: success,
      currentStep: success ? this.currentProgress.totalSteps : this.currentProgress.currentStep,
    };
    this.refresh();
  }

  /**
   * Complete installation and resolve promise
   */
  private complete(success: boolean) {
    if (this.resolveCompletion) {
      this.resolveCompletion(success);
      this.resolveCompletion = null;
    }
  }

  /**
   * Wait for user to click install or cancel
   * Returns true if install was clicked, false if cancelled
   */
  waitForInstall(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveInstall = resolve;
    });
  }

  /**
   * Show or hide the install button
   */
  showInstallButton(show: boolean) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('installer:show-install-button', show);
    }
  }

  /**
   * Prompt for sudo password
   * Returns the password or null if cancelled
   */
  async promptForPassword(): Promise<string | null> {
    if (!this.window || this.window.isDestroyed()) {
      console.error('Cannot prompt for password: window is destroyed');
      return null;
    }

    console.log('Prompting for password...');
    return new Promise((resolve) => {
      // Send request to renderer to show password prompt
      this.window?.webContents.send('installer:prompt-password');
      console.log('Sent installer:prompt-password event to renderer');

      // Listen for password response (one-time listener)
      const handler = (_event: any, password: string | null) => {
        console.log('Received password response:', password ? 'Password provided' : 'Password cancelled');
        ipcMain.removeListener('installer:password-response', handler);
        resolve(password);
      };
      ipcMain.on('installer:password-response', handler);

      // Add timeout in case no response comes back
      setTimeout(() => {
        console.warn('Password prompt timeout after 60 seconds');
        ipcMain.removeListener('installer:password-response', handler);
        resolve(null);
      }, 60000);
    });
  }

  /**
   * Close the installer window
   */
  close() {
    this.cleanup();
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }

  /**
   * Clean up IPC handlers
   */
  private cleanup() {
    ipcMain.removeHandler('installer:action');
  }

  /**
   * Refresh the window content
   */
  private refresh() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('installer:update', this.currentProgress);
    }
  }

  /**
   * Get step number from step name
   */
  private getStepNumber(step: InstallStep): number {
    const steps: InstallStep[] = [
      'checking-nodejs',
      'verifying-nodejs-version',
      'checking-npm',
      'checking-promptfoo',
      'verifying-promptfoo-version',
    ];
    return steps.indexOf(step) + 1;
  }

  /**
   * Generate the installer HTML
   */
  private getHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Setting up Prompt Evaluator</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
            color: #e0e0e0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            -webkit-app-region: drag;
          }

          .header {
            padding: 40px 60px 20px;
            text-align: center;
            -webkit-app-region: no-drag;
          }

          .logo {
            font-size: 48px;
            margin-bottom: 10px;
          }

          h1 {
            font-size: 28px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 8px;
          }

          .subtitle {
            font-size: 16px;
            color: #888;
            font-weight: 400;
          }

          .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            -webkit-app-region: no-drag;
          }

          .progress-section {
            background: rgba(255, 255, 255, 0.02);
            padding: 20px;
            margin-top: 20px;
            border-radius: 8px;
            border: 1px solid #2a2a2a;
          }

          .scrollable-content {
            flex: 1;
            overflow-y: auto;
            padding: 0 60px 20px;
          }

          .current-status {
            font-size: 15px;
            font-weight: 500;
            color: #4a9eff;
            margin-bottom: 16px;
            text-align: center;
            min-height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            background: rgba(74, 158, 255, 0.08);
            border-radius: 8px;
            border: 1px solid rgba(74, 158, 255, 0.2);
          }

          .current-status .spinner {
            font-size: 16px;
          }

          .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .progress-title {
            font-size: 14px;
            font-weight: 500;
            color: #aaa;
          }

          .progress-counter {
            font-size: 14px;
            color: #666;
          }

          .progress-bar-container {
            background: #2a2a2a;
            border-radius: 8px;
            height: 8px;
            overflow: hidden;
            margin-bottom: 8px;
          }

          .progress-bar {
            background: linear-gradient(90deg, #4a9eff 0%, #6fb1ff 100%);
            height: 100%;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 8px;
          }

          .progress-percentage {
            font-size: 13px;
            color: #666;
            text-align: right;
          }

          .steps {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .step {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
          }

          .step.active {
            background: rgba(74, 158, 255, 0.08);
            border-color: rgba(74, 158, 255, 0.3);
            box-shadow: 0 0 20px rgba(74, 158, 255, 0.15);
          }

          .step.success {
            background: rgba(76, 175, 80, 0.06);
            border-color: rgba(76, 175, 80, 0.2);
          }

          .step.error {
            background: rgba(244, 67, 54, 0.06);
            border-color: rgba(244, 67, 54, 0.2);
          }

          .step-header {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .step-icon {
            font-size: 24px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .step-info {
            flex: 1;
          }

          .step-name {
            font-size: 15px;
            font-weight: 500;
            color: #fff;
            margin-bottom: 4px;
          }

          .step-message {
            font-size: 13px;
            color: #888;
          }

          .step.active .step-message {
            color: #4a9eff;
          }

          .step.success .step-message {
            color: #4caf50;
          }

          .step.error .step-message {
            color: #f44336;
          }

          .spinner {
            display: inline-block;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .footer {
            padding: 20px 60px 40px;
            display: flex;
            justify-content: center;
            gap: 12px;
            -webkit-app-region: no-drag;
          }

          button {
            padding: 12px 32px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
          }

          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-primary {
            background: linear-gradient(135deg, #4a9eff 0%, #3d7fcf 100%);
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #5ba7ff 0%, #4a8ae0 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(74, 158, 255, 0.4);
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #aaa;
          }

          .btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
          }

          .message-box {
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
            display: none;
          }

          .message-box.show {
            display: block;
          }

          .message-box.error {
            background: rgba(244, 67, 54, 0.1);
            border-color: rgba(244, 67, 54, 0.3);
          }

          .message-box.success {
            background: rgba(76, 175, 80, 0.1);
            border-color: rgba(76, 175, 80, 0.3);
          }

          .message-icon {
            font-size: 20px;
            margin-right: 8px;
          }

          .message-text {
            font-size: 14px;
            line-height: 1.6;
          }

          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: #1a1a1a;
          }

          ::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: #444;
          }

          .console-section {
            margin-top: 24px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            overflow: hidden;
          }

          .console-header {
            background: #252525;
            padding: 10px 16px;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .console-title {
            font-size: 12px;
            font-weight: 600;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .console-output {
            padding: 12px 16px;
            height: 280px;
            overflow-y: auto;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.6;
            color: #aaa;
            background: #0f0f0f;
          }

          .console-output::-webkit-scrollbar {
            width: 8px;
          }

          .console-output::-webkit-scrollbar-track {
            background: #1a1a1a;
          }

          .console-output::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 4px;
          }

          .console-output::-webkit-scrollbar-thumb:hover {
            background: #555;
          }

          .log-line {
            margin-bottom: 4px;
            white-space: pre-wrap;
            word-break: break-all;
          }

          .log-line.info {
            color: #4a9eff;
          }

          .log-line.success {
            color: #4caf50;
          }

          .log-line.error {
            color: #f44336;
          }

          .log-line.warning {
            color: #ff9800;
          }

          /* Password Modal */
          .password-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            align-items: center;
            justify-content: center;
          }

          .password-modal.show {
            display: flex;
          }

          .password-dialog {
            background: #2a2a2a;
            border-radius: 12px;
            padding: 32px;
            min-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          }

          .password-dialog h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
            color: #fff;
          }

          .password-dialog p {
            margin: 0 0 24px 0;
            font-size: 14px;
            color: #aaa;
            line-height: 1.5;
          }

          .password-input-group {
            margin-bottom: 24px;
          }

          .password-input-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            color: #888;
            font-weight: 500;
          }

          .password-input-group input {
            width: 100%;
            padding: 12px 16px;
            font-size: 14px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 6px;
            color: #fff;
            font-family: 'SF Mono', Monaco, monospace;
            box-sizing: border-box;
          }

          .password-input-group input:focus {
            outline: none;
            border-color: #4a9eff;
          }

          .password-dialog-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .password-dialog-buttons button {
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 6px;
            border: none;
            cursor: pointer;
          }

          .password-dialog-buttons .btn-cancel {
            background: #444;
            color: #fff;
          }

          .password-dialog-buttons .btn-cancel:hover {
            background: #555;
          }

          .password-dialog-buttons .btn-submit {
            background: #4a9eff;
            color: #fff;
          }

          .password-dialog-buttons .btn-submit:hover {
            background: #3d8de6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🚀</div>
          <h1>Setting up Prompt Evaluator</h1>
          <p class="subtitle">Checking and installing required dependencies</p>
        </div>

        <div class="content">
          <div class="scrollable-content">
            <div class="current-status" id="current-status">
              <span class="spinner">⏳</span>
              <span id="status-text">Preparing to check dependencies...</span>
            </div>

            <div class="console-section">
              <div class="console-header">
                <span class="console-title">📋 Console Output</span>
              </div>
              <div class="console-output" id="console-output">
                <div class="log-line info">Initializing dependency checker...</div>
              </div>
            </div>

            <div class="message-box" id="message-box">
              <span class="message-icon">ℹ️</span>
              <span class="message-text" id="message-text"></span>
            </div>

            <div class="steps" id="steps">
              <!-- Steps will be dynamically populated -->
            </div>

            <div class="progress-section">
              <div class="progress-header">
                <span class="progress-title">Installation Progress</span>
                <span class="progress-counter"><span id="current-step">0</span> of <span id="total-steps">5</span></span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
              </div>
              <div class="progress-percentage" id="progress-percentage">0%</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <button class="btn-secondary" id="btn-cancel" onclick="handleCancel()">Cancel</button>
          <button class="btn-primary" id="btn-continue" onclick="handleContinue()" disabled>Continue</button>
        </div>

        <script type="text/javascript">
          console.log('Installer script starting...');
          console.log('window.installerAPI:', window.installerAPI);

          // Check if installerAPI is available
          if (!window.installerAPI) {
            console.error('installerAPI not found! Preload script may not have loaded.');
            var consoleEl = document.getElementById('console-output');
            if (consoleEl) {
              consoleEl.innerHTML =
                '<div class="log-line error">ERROR: Installer API not loaded. Preload script did not execute.</div>' +
                '<div class="log-line warning">This is likely a bug. Please check the console for errors.</div>';
            }
          } else {
            console.log('installerAPI loaded successfully!');
          }

          var installerAPI = window.installerAPI;

          var steps = [
            { id: 'checking-nodejs', name: 'Checking Node.js installation', icon: '🔍' },
            { id: 'verifying-nodejs-version', name: 'Verifying Node.js version', icon: '✓' },
            { id: 'checking-npm', name: 'Checking npm availability', icon: '📦' },
            { id: 'checking-promptfoo', name: 'Checking promptfoo installation', icon: '🔍' },
            { id: 'verifying-promptfoo-version', name: 'Verifying promptfoo version', icon: '✓' }
          ];

          var currentProgress = {
            step: 'checking-nodejs',
            status: 'pending',
            currentStep: 0,
            totalSteps: 5,
            canProceed: false
          };

          // Initialize steps
          function initSteps() {
            var stepsContainer = document.getElementById('steps');
            stepsContainer.innerHTML = steps.map(function(step) {
              return '<div class="step" id="step-' + step.id + '">' +
                '<div class="step-header">' +
                  '<div class="step-icon" id="icon-' + step.id + '">' + step.icon + '</div>' +
                  '<div class="step-info">' +
                    '<div class="step-name">' + step.name + '</div>' +
                    '<div class="step-message" id="message-' + step.id + '">Waiting...</div>' +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('');
          }

          // Sanitize log text to hide sensitive information
          function sanitizeLog(text) {
            if (!text) return '';

            // Hide API keys
            text = text.replace(/OPENAI_API_KEY[=:]\s*sk-[a-zA-Z0-9-_]+/gi, 'OPENAI_API_KEY=sk-***');
            text = text.replace(/ANTHROPIC_API_KEY[=:]\s*sk-ant-[a-zA-Z0-9-_]+/gi, 'ANTHROPIC_API_KEY=sk-ant-***');
            text = text.replace(/GEMINI_API_KEY[=:]\s*[a-zA-Z0-9-_]+/gi, 'GEMINI_API_KEY=***');
            text = text.replace(/GOOGLE_API_KEY[=:]\s*[a-zA-Z0-9-_]+/gi, 'GOOGLE_API_KEY=***');

            // Hide full file paths, keep just the filename
            text = text.replace(/\\/Users\\/[^\\/\\s]+\\/[^\\s]+/g, function(match) {
              var parts = match.split('/');
              return '.../' + parts[parts.length - 1];
            });
            text = text.replace(/C:\\\\\\\\Users\\\\\\\\[^\\\\\\\\]+\\\\\\\\[^\\s]+/g, function(match) {
              var parts = match.split('\\\\\\\\');
              return '...\\\\\\\\' + parts[parts.length - 1];
            });

            return text;
          }

          // Add log to console
          function addLog(message, type) {
            if (type === undefined) type = 'info';
            var consoleOutput = document.getElementById('console-output');
            var logLine = document.createElement('div');
            logLine.className = 'log-line ' + type;
            logLine.textContent = sanitizeLog(message);
            consoleOutput.appendChild(logLine);

            // Auto-scroll to bottom
            consoleOutput.scrollTop = consoleOutput.scrollHeight;

            // Limit to last 100 lines
            while (consoleOutput.children.length > 100) {
              consoleOutput.removeChild(consoleOutput.firstChild);
            }
          }

          // Update UI based on progress
          function updateUI(progress) {
            currentProgress = progress;

            // Clear console if we're resetting (status is pending and step is checking-nodejs)
            if (progress.step === 'checking-nodejs' && progress.status === 'pending' && progress.currentStep === 0) {
              var consoleOutput = document.getElementById('console-output');
              if (consoleOutput) {
                consoleOutput.innerHTML = '<div class="log-line info">Initializing dependency checker...</div>';
              }
              // Clear message box
              var messageBox = document.getElementById('message-box');
              if (messageBox) {
                messageBox.className = 'message-box';
              }
              // Reset all steps to pending
              steps.forEach(function(step) {
                var stepElement = document.getElementById('step-' + step.id);
                var iconElement = document.getElementById('icon-' + step.id);
                var messageElement = document.getElementById('message-' + step.id);
                if (stepElement) {
                  stepElement.classList.remove('active', 'success', 'error');
                  iconElement.textContent = step.icon;
                  if (messageElement) {
                    messageElement.textContent = 'Waiting...';
                  }
                }
              });
            }

            // Add log if present
            if (progress.log) {
              addLog(progress.log, progress.logType || 'info');
            }

            // Update current status text at the top
            var statusText = document.getElementById('status-text');
            var currentStatusSpinner = document.querySelector('.current-status .spinner');

            if (progress.step === 'complete' && progress.canProceed) {
              if (currentStatusSpinner) currentStatusSpinner.textContent = '✓';
              if (statusText) statusText.textContent = 'All dependencies verified successfully!';
            } else if (progress.step === 'failed') {
              if (currentStatusSpinner) currentStatusSpinner.textContent = '✗';
              if (statusText) statusText.textContent = progress.message || 'Dependency check failed';
            } else if (progress.status === 'checking' || progress.status === 'installing') {
              if (currentStatusSpinner) currentStatusSpinner.textContent = '⏳';
              var currentStep = steps.find(function(s) { return s.id === progress.step; });
              if (statusText && currentStep) {
                statusText.textContent = progress.message || currentStep.name + '...';
              }
            } else if (progress.status === 'success') {
              if (currentStatusSpinner) currentStatusSpinner.textContent = '✓';
              if (statusText) statusText.textContent = progress.message || 'Step completed';
            } else if (progress.status === 'error') {
              if (currentStatusSpinner) currentStatusSpinner.textContent = '✗';
              if (statusText) statusText.textContent = progress.message || 'Error occurred';
            }

            // Update progress bar
            var percentage = Math.round((progress.currentStep / progress.totalSteps) * 100);
            document.getElementById('progress-bar').style.width = percentage + '%';
            document.getElementById('progress-percentage').textContent = percentage + '%';
            document.getElementById('current-step').textContent = progress.currentStep;
            document.getElementById('total-steps').textContent = progress.totalSteps;

            // Update step status
            var stepId = progress.step;
            var stepElement = document.getElementById('step-' + stepId);
            var iconElement = document.getElementById('icon-' + stepId);
            var messageElement = document.getElementById('message-' + stepId);

            if (stepElement) {
              // Remove all status classes
              stepElement.classList.remove('active', 'success', 'error');

              // Add current status
              if (progress.status === 'checking' || progress.status === 'installing') {
                stepElement.classList.add('active');
                iconElement.innerHTML = '<span class="spinner">⏳</span>';
              } else if (progress.status === 'success') {
                stepElement.classList.add('success');
                iconElement.textContent = '✓';
              } else if (progress.status === 'error') {
                stepElement.classList.add('error');
                iconElement.textContent = '✗';
              }

              if (messageElement && progress.message) {
                messageElement.textContent = progress.message;
              }
            }

            // Update buttons
            var btnContinue = document.getElementById('btn-continue');
            var btnInstall = document.getElementById('btn-install');
            var btnCancel = document.getElementById('btn-cancel');

            if (progress.canProceed) {
              btnContinue.disabled = false;
              btnInstall.style.display = 'none';
              btnCancel.style.display = 'none';
            }

            // Show message box if needed
            var messageBox = document.getElementById('message-box');
            var messageText = document.getElementById('message-text');

            if (progress.step === 'complete' && progress.canProceed) {
              messageBox.className = 'message-box show success';
              messageText.textContent = 'All dependencies are installed! Click Continue to launch Prompt Evaluator.';
            } else if (progress.step === 'failed') {
              messageBox.className = 'message-box show error';
              messageText.textContent = progress.message || 'Installation failed. Please install dependencies manually and try again.';
            }
          }

          // Handle actions
          function handleCancel() {
            var confirmed = confirm(
              'Are you sure you want to exit?\\n\\n' +
              'The application requires Node.js and promptfoo to function properly. ' +
              'If you exit now, you will need to install these dependencies manually before using the app.'
            );

            if (confirmed && installerAPI) {
              installerAPI.sendAction('close');
            }
          }

          function handleContinue() {
            if (currentProgress.canProceed && installerAPI) {
              installerAPI.sendAction('continue');
            }
          }

          // Listen for updates
          if (installerAPI && installerAPI.onUpdate) {
            installerAPI.onUpdate(function(progress) {
              console.log('Received progress update:', progress);
              updateUI(progress);
            });
            console.log('Subscribed to installer updates');
          } else {
            console.error('Cannot subscribe to updates - installerAPI.onUpdate not available');
          }

          // Listen for password prompt events
          if (installerAPI && installerAPI.onPasswordPrompt) {
            installerAPI.onPasswordPrompt(function() {
              console.log('=== PASSWORD PROMPT REQUESTED ===');
              showPasswordModal();
            });
            console.log('Subscribed to password prompt events');
          } else {
            console.error('onPasswordPrompt not available on installerAPI');
          }

          // Initialize
          initSteps();
          console.log('Steps initialized');

          // Clear initial console message after a short delay if no updates received
          setTimeout(function() {
            var consoleOutput = document.getElementById('console-output');
            if (consoleOutput && consoleOutput.children.length === 1 &&
                consoleOutput.textContent.includes('Initializing')) {
              consoleOutput.innerHTML = '<div class="log-line info">Waiting for dependency checker to start...</div>';
            }
          }, 2000);
        <\/script>

        <!-- Password Modal -->
        <div class="password-modal" id="password-modal">
          <div class="password-dialog">
            <h3>Administrator Password Required</h3>
            <p>Homebrew needs administrator permissions to install promptfoo. Please enter your macOS password:</p>
            <div class="password-input-group">
              <label for="password-input">Password</label>
              <input type="password" id="password-input" autocomplete="off" />
            </div>
            <div class="password-dialog-buttons">
              <button class="btn-cancel" id="btn-password-cancel">Cancel</button>
              <button class="btn-submit" id="btn-password-submit">Install</button>
            </div>
          </div>
        </div>

        <script>
          // Password modal handlers
          var passwordModal = document.getElementById('password-modal');
          var passwordInput = document.getElementById('password-input');
          var btnPasswordSubmit = document.getElementById('btn-password-submit');
          var btnPasswordCancel = document.getElementById('btn-password-cancel');

          function showPasswordModal() {
            passwordModal.classList.add('show');
            passwordInput.value = '';
            passwordInput.focus();
          }

          function hidePasswordModal() {
            passwordModal.classList.remove('show');
          }

          btnPasswordCancel.addEventListener('click', function() {
            hidePasswordModal();
            if (installerAPI && installerAPI.sendPassword) {
              installerAPI.sendPassword(null);
            }
          });

          btnPasswordSubmit.addEventListener('click', function() {
            var password = passwordInput.value;
            hidePasswordModal();
            if (installerAPI && installerAPI.sendPassword) {
              installerAPI.sendPassword(password);
            }
          });

          passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              var password = passwordInput.value;
              hidePasswordModal();
              if (installerAPI && installerAPI.sendPassword) {
                installerAPI.sendPassword(password);
              }
            } else if (e.key === 'Escape') {
              hidePasswordModal();
              if (installerAPI && installerAPI.sendPassword) {
                installerAPI.sendPassword(null);
              }
            }
          });
        <\/script>
      </body>
      </html>
    `;
  }
}
