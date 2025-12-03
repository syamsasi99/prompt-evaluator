/**
 * Preload script for installer window
 * Exposes safe IPC methods to the installer UI
 */

import { contextBridge, ipcRenderer } from 'electron';

// Define the API type
export interface InstallerAPI {
  onUpdate: (callback: (progress: any) => void) => void;
  onShowInstallButton: (callback: (show: boolean) => void) => void;
  onPasswordPrompt: (callback: () => void) => void;
  sendPassword: (password: string | null) => void;
  sendAction: (action: string, data?: any) => Promise<any>;
}

// Expose installer API to window
const api: InstallerAPI = {
  onUpdate: (callback: (progress: any) => void) => {
    ipcRenderer.on('installer:update', (_event, progress) => callback(progress));
  },
  onShowInstallButton: (callback: (show: boolean) => void) => {
    ipcRenderer.on('installer:show-install-button', (_event, show) => callback(show));
  },
  onPasswordPrompt: (callback: () => void) => {
    ipcRenderer.on('installer:prompt-password', () => callback());
  },
  sendPassword: (password: string | null) => {
    ipcRenderer.send('installer:password-response', password);
  },
  sendAction: (action: string, data?: any) => {
    return ipcRenderer.invoke('installer:action', action, data);
  },
};

contextBridge.exposeInMainWorld('installerAPI', api);

// Declare global window type
declare global {
  interface Window {
    installerAPI: InstallerAPI;
  }
}
