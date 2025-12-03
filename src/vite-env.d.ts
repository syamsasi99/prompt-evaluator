/// <reference types="vite/client" />

interface Window {
  api: {
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
    runPromptfooWithSecurity: (
      mainYamlContent: string,
      securityYamlContent: string,
      runId: string,
      onLog?: (log: string, progress?: { current: number; total: number }) => void
    ) => Promise<{
      success: boolean;
      results?: any;
      securityResults?: any;
      error?: string;
      logs?: string[];
      htmlPath?: string;
      securityHtmlPath?: string;
      aborted?: boolean;
    }>;
    abortPromptfoo: (runId: string) => Promise<{ success: boolean; error?: string }>;
    checkPromptfooInstalled: () => Promise<boolean>;
    openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    analyzeResults: (summaryData: any, jsonOutputPath?: string, aiModel?: string) => Promise<{ success: boolean; analysis?: any; isStructured?: boolean; error?: string }>;
    generateAssertions: (promptsData: any, providersData: any, datasetData: any, aiModel?: string) => Promise<{ success: boolean; assertions?: any[]; analysis?: any; recommendations?: any; error?: string }>;
    generateDataset: (promptsData: any, aiModel?: string, rowCount?: number) => Promise<{ success: boolean; dataset?: any; analysis?: any; metadata?: any; error?: string; message?: string; suggestion?: string }>;
    generateDatasetColumn: (payload: { columnType: string; existingData: any; prompts: any; aiModel?: string }) => Promise<{ success: boolean; columnName?: string; values?: string[]; error?: string }>;
    generateDatasetRow: (payload: { existingData: any; prompts: any; aiModel?: string }) => Promise<{ success: boolean; row?: any; error?: string }>;
    generateReferenceAnswer: (promptsData: any, datasetData: any, aiModel?: string) => Promise<{ success: boolean; referenceAnswer?: string; error?: string }>;
    checkApiKey: (envVarName: string) => Promise<{ success: boolean; hasApiKey: boolean; error?: string }>;
    saveToHistory: (historyItem: any) => Promise<{ success: boolean; historyItem?: any; error?: string }>;
    getAllHistory: () => Promise<{ success: boolean; history?: any[]; error?: string }>;
    getHistoryById: (id: string) => Promise<{ success: boolean; historyItem?: any; error?: string }>;
    deleteHistoryById: (id: string) => Promise<{ success: boolean; error?: string }>;
    clearAllHistory: () => Promise<{ success: boolean; error?: string }>;
    testBigQueryConnection: (config: any) => Promise<{ success: boolean; error?: string }>;
    exportToBigQuery: (payload: { config: any; results: any; projectName: string; evaluationId: string }) => Promise<{ success: boolean; insertedRows: number; error?: string }>;
    queryHistoryFromBigQuery: (payload: { config: { projectId: string; datasetId: string; tableId: string }; options?: { projectName?: string; limit?: number; offset?: number; dateFrom?: string; dateTo?: string } }) => Promise<{ success: boolean; history?: any[]; totalCount?: number; error?: string }>;
    queryEvaluationDetailsFromBigQuery: (payload: { config: { projectId: string; datasetId: string; tableId: string }; evaluationId: string }) => Promise<{ success: boolean; results?: any; error?: string }>;
    exportBigQueryToLocal: (payload: { config: { projectId: string; datasetId: string; tableId: string }; options?: { projectName?: string; limit?: number } }) => Promise<{ success: boolean; exported?: number; total?: number; error?: string }>;
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
    analyzeComparison: (userMessage: string, comparisonData: any) => Promise<{ success: boolean; analysis?: string; error?: string }>;
  };
}
