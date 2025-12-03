import path from 'path';
import type { App } from 'electron';

export const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL !== undefined;

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

export const getRendererPath = (): string => {
  if (isDev && VITE_DEV_SERVER_URL) {
    return VITE_DEV_SERVER_URL;
  }
  return path.join(__dirname, '../dist/index.html');
};

export const getTempDir = (app: App): string => {
  return path.join(app.getPath('temp'), 'promptfoo-yaml-builder');
};

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';
