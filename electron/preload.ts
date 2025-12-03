import { contextBridge, ipcRenderer } from 'electron';

// Type-safe IPC channels
type IpcChannel =
  | 'app:getVersion'
  | 'app:getUserDataPath'
  | 'app:toggleDevTools'
  | 'fs:exportYaml'
  | 'fs:saveProject'
  | 'fs:loadProject'
  | 'fs:readJsonResults'
  | 'promptfoo:run'
  | 'promptfoo:abort'
  | 'promptfoo:checkInstalled'
  | 'shell:openPath'
  | 'ai:analyzeResults'
  | 'ai:generateAssertions'
  | 'ai:generateDataset'
  | 'ai:generateDatasetColumn'
  | 'ai:generateReferenceAnswer'
  | 'provider:checkApiKey'
  | 'provider:validateApiKey'
  | 'provider:saveApiKeyToEnv'
  | 'provider:getApiKeyFromEnv'
  | 'history:saveResult'
  | 'history:getAll'
  | 'history:getById'
  | 'history:deleteById'
  | 'history:clearAll';

export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getUserDataPath: () => Promise<string>;
  toggleDevTools: () => Promise<void>;
  exportYaml: (content: string, defaultPath?: string) => Promise<string | null>;
  saveProject: (project: any, defaultPath?: string) => Promise<string | null>;
  loadProject: () => Promise<any | null>;
  readJsonResults: (filePath: string) => Promise<{ success: boolean; results?: any; error?: string }>;
  runPromptfoo: (
    yamlContent: string,
    runId: string,
    onLog?: (log: string, progress?: { current: number; total: number }) => void
  ) => Promise<{
    success: boolean;
    results?: any;
    error?: string;
    logs?: string[];
    htmlPath?: string;
    aborted?: boolean;
  }>;
  abortPromptfoo: (runId: string) => Promise<{ success: boolean; error?: string }>;
  checkPromptfooInstalled: () => Promise<boolean>;
  openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  analyzeResults: (summaryData: any, jsonOutputPath?: string, aiModel?: string, customPrompt?: string) => Promise<{ success: boolean; analysis?: any; isStructured?: boolean; error?: string }>;
  generateAssertions: (promptsData: any, providersData: any, datasetData: any, aiModel?: string, customPrompt?: string) => Promise<{ success: boolean; assertions?: any[]; analysis?: any; recommendations?: any; error?: string }>;
  generateDataset: (promptsData: any, aiModel?: string, rowCount?: number, customPrompt?: string, bqReferenceConfig?: { enabled: boolean; projectId: string; datasetId: string; tableId: string; columnHints?: string }) => Promise<{ success: boolean; dataset?: any; analysis?: any; metadata?: any; error?: string; message?: string; suggestion?: string; usedBqReference?: boolean; bqReferenceInfo?: { rowCount: number; headers: string[] } }>;
  generateDatasetColumn: (payload: { columnType: string; existingData: any; prompts: any; aiModel?: string; customPrompt?: string }) => Promise<{ success: boolean; columnName?: string; values?: string[]; error?: string }>;
  generateDatasetRow: (payload: { existingData: any; prompts: any; aiModel?: string; customPrompt?: string; bqReferenceConfig?: { enabled: boolean; projectId: string; datasetId: string; tableId: string; columnHints?: string } }) => Promise<{ success: boolean; row?: any; error?: string }>;
  generateReferenceAnswer: (promptsData: any, datasetData: any, aiModel?: string, customPrompt?: string) => Promise<{ success: boolean; referenceAnswer?: string; error?: string }>;
  analyzeComparison: (question: string, context: any) => Promise<{ success: boolean; analysis?: string; error?: string }>;
  checkApiKey: (envVarName: string) => Promise<{ success: boolean; hasApiKey: boolean; error?: string }>;
  validateApiKey: (providerId: string, apiKey: string) => Promise<{ success: boolean; isValid: boolean; error?: string; message?: string }>;
  saveApiKeyToEnv: (envVarName: string, apiKey: string) => Promise<{ success: boolean; envPath?: string; message?: string; error?: string }>;
  getApiKeyFromEnv: (envVarName: string) => Promise<{ success: boolean; hasApiKey: boolean; apiKey?: string; error?: string }>;
  // History management
  saveToHistory: (historyItem: any) => Promise<{ success: boolean; historyItem?: any; error?: string }>;
  getAllHistory: () => Promise<{ success: boolean; history?: any[]; error?: string }>;
  getHistoryById: (id: string) => Promise<{ success: boolean; historyItem?: any; error?: string }>;
  deleteHistoryById: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearAllHistory: () => Promise<{ success: boolean; error?: string }>;
  writeDebugLog: (filename: string, data: any) => Promise<{ success: boolean; path?: string; error?: string }>;

  // Project metadata operations
  getMetadataStore: () => Promise<any>;
  updateRecentProject: (metadata: any) => Promise<any>;
  toggleProjectFavorite: (projectId: string) => Promise<any>;
  removeFromRecentProjects: (projectId: string) => Promise<any>;
  autoSaveProject: (project: any, fileName: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  loadProjectByPath: (filePath: string) => Promise<any>;
  getAllProjects: () => Promise<any[]>;
  deleteProjectFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  clearRecentProjects: () => Promise<{ success: boolean; metadata?: any; error?: string }>;

  // Logging
  writeLog: (logLine: string) => Promise<{ success: boolean; error?: string }>;
  readLogs: (options?: { lines?: number }) => Promise<{ success: boolean; logs: string; totalLines: number; error?: string }>;
  clearLogs: () => Promise<{ success: boolean; error?: string }>;
  openLogFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
  getLogFilePath: () => Promise<{ success: boolean; path: string }>;
}

// Expose protected methods that allow the renderer to use ipcRenderer
const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),
  toggleDevTools: () => ipcRenderer.invoke('app:toggleDevTools'),
  exportYaml: (content: string, defaultPath?: string) =>
    ipcRenderer.invoke('fs:exportYaml', { content, defaultPath }),
  saveProject: (project: any, defaultPath?: string) =>
    ipcRenderer.invoke('fs:saveProject', { project, defaultPath }),
  loadProject: () => ipcRenderer.invoke('fs:loadProject'),
  runPromptfoo: async (
    yamlContent: string,
    runId: string,
    onLog?: (log: string, progress?: { current: number; total: number }) => void
  ) => {
    // Set up log and progress listeners if callback provided
    if (onLog) {
      const logListener = (_event: any, log: string) => onLog(log);
      const progressListener = (_event: any, progressData: { current: number; total: number; runId: string }) => {
        if (progressData.runId === runId) {
          onLog('', { current: progressData.current, total: progressData.total });
        }
      };

      ipcRenderer.on('promptfoo:log', logListener);
      ipcRenderer.on('promptfoo:progress', progressListener);

      try {
        return await ipcRenderer.invoke('promptfoo:run', { yamlContent, runId });
      } finally {
        ipcRenderer.removeListener('promptfoo:log', logListener);
        ipcRenderer.removeListener('promptfoo:progress', progressListener);
      }
    }
    return ipcRenderer.invoke('promptfoo:run', { yamlContent, runId });
  },
  abortPromptfoo: (runId: string) => ipcRenderer.invoke('promptfoo:abort', runId),
  checkPromptfooInstalled: () => ipcRenderer.invoke('promptfoo:checkInstalled'),
  readJsonResults: (filePath: string) => ipcRenderer.invoke('fs:readJsonResults', filePath),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  analyzeResults: (summaryData: any, jsonOutputPath?: string, aiModel?: string, customPrompt?: string) => ipcRenderer.invoke('ai:analyzeResults', summaryData, jsonOutputPath, aiModel, customPrompt),
  generateAssertions: (promptsData: any, providersData: any, datasetData: any, aiModel?: string, customPrompt?: string) => ipcRenderer.invoke('ai:generateAssertions', promptsData, providersData, datasetData, aiModel, customPrompt),
  generateDataset: (promptsData: any, aiModel?: string, rowCount?: number, customPrompt?: string, bqReferenceConfig?: { enabled: boolean; projectId: string; datasetId: string; tableId: string }) => ipcRenderer.invoke('ai:generateDataset', promptsData, aiModel, rowCount, customPrompt, bqReferenceConfig),
  generateDatasetColumn: (payload: { columnType: string; existingData: any; prompts: any; aiModel?: string; customPrompt?: string }) => ipcRenderer.invoke('ai:generateDatasetColumn', payload),
  generateDatasetRow: (payload: { existingData: any; prompts: any; aiModel?: string; customPrompt?: string }) => ipcRenderer.invoke('ai:generateDatasetRow', payload),
  generateReferenceAnswer: (promptsData: any, datasetData: any, aiModel?: string, customPrompt?: string) => ipcRenderer.invoke('ai:generateReferenceAnswer', promptsData, datasetData, aiModel, customPrompt),
  analyzeComparison: (question: string, context: any) => ipcRenderer.invoke('ai:analyzeComparison', question, context),
  checkApiKey: (envVarName: string) => ipcRenderer.invoke('provider:checkApiKey', envVarName),
  validateApiKey: (providerId: string, apiKey: string) => ipcRenderer.invoke('provider:validateApiKey', providerId, apiKey),
  saveApiKeyToEnv: (envVarName: string, apiKey: string) => ipcRenderer.invoke('provider:saveApiKeyToEnv', envVarName, apiKey),
  getApiKeyFromEnv: (envVarName: string) => ipcRenderer.invoke('provider:getApiKeyFromEnv', envVarName),
  // History management
  saveToHistory: (historyItem: any) => ipcRenderer.invoke('history:saveResult', historyItem),
  getAllHistory: () => ipcRenderer.invoke('history:getAll'),
  getHistoryById: (id: string) => ipcRenderer.invoke('history:getById', id),
  deleteHistoryById: (id: string) => ipcRenderer.invoke('history:deleteById', id),
  clearAllHistory: () => ipcRenderer.invoke('history:clearAll'),
  writeDebugLog: (filename: string, data: any) => ipcRenderer.invoke('debug:writeLog', { filename, data }),

  // Project metadata operations
  getMetadataStore: () => ipcRenderer.invoke('project:getMetadataStore'),
  updateRecentProject: (metadata: any) => ipcRenderer.invoke('project:updateRecent', metadata),
  toggleProjectFavorite: (projectId: string) => ipcRenderer.invoke('project:toggleFavorite', projectId),
  removeFromRecentProjects: (projectId: string) => ipcRenderer.invoke('project:removeFromRecent', projectId),
  autoSaveProject: (project: any, fileName: string) => ipcRenderer.invoke('project:autoSave', { project, fileName }),
  loadProjectByPath: (filePath: string) => ipcRenderer.invoke('project:loadByPath', filePath),
  getAllProjects: () => ipcRenderer.invoke('project:getAllProjects'),
  deleteProjectFile: (filePath: string) => ipcRenderer.invoke('project:deleteFile', filePath),
  clearRecentProjects: () => ipcRenderer.invoke('project:clearRecentProjects'),

  // Logging
  writeLog: (logLine: string) => ipcRenderer.invoke('write-log', logLine),
  readLogs: (options?: { lines?: number }) => ipcRenderer.invoke('read-logs', options),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
};

contextBridge.exposeInMainWorld('api', electronAPI);

// Type declaration for window object
declare global {
  interface Window {
    api: ElectronAPI;
  }
}
