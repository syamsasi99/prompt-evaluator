import { app, BrowserWindow, shell } from 'electron';
import path from 'path';

// Now import local modules that may use electron
import { isDev, getRendererPath, VITE_DEV_SERVER_URL } from './env';
import { registerIpcHandlers } from './ipc';
import { handleFirstLaunch } from './firstLaunch';
import { initializeEnvManager, stopWatchingEnvFile } from './envManager';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // Enable sandbox for better security
      webSecurity: true,
    },
    title: 'Prompt Evaluator',
  });

  // Load the app
  if (isDev && VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links - open in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize environment manager (creates .env if needed, loads vars, starts watching)
  initializeEnvManager();

  registerIpcHandlers();

  // Handle first launch dependency check BEFORE opening main window
  // This ensures we don't show the main app if dependencies are missing
  console.log('isDev:', isDev);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('VITE_DEV_SERVER_URL:', process.env.VITE_DEV_SERVER_URL);

  // Always run first launch check (removed isDev condition for testing)
  console.log('Running first launch check...');
  const dependenciesReady = await handleFirstLaunch();

  if (!dependenciesReady) {
    // User cancelled or dependencies failed
    console.log('Dependencies check failed or cancelled. Exiting app.');
    app.quit();
    return;
  }

  console.log('Dependencies ready!');

  // Only create main window after dependencies are verified
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Stop watching .env file
  stopWatchingEnvFile();
});

// Security: prevent navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow dev server navigation
    if (isDev && VITE_DEV_SERVER_URL && navigationUrl.startsWith(VITE_DEV_SERVER_URL)) {
      return;
    }

    // Block all other navigation
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
