import React, { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

export function LogsViewer() {
  const [logs, setLogs] = useState<string>('');
  const [totalLines, setTotalLines] = useState<number>(0);
  const [logFilePath, setLogFilePath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  // Load logs on mount
  useEffect(() => {
    loadLogs();
    getLogFilePath();
  }, []);

  // Auto-refresh logs
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadLogs();
      }, 2000); // Refresh every 2 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      if (window.api?.readLogs) {
        const result = await window.api.readLogs({ lines: 1000 }); // Last 1000 lines
        if (result.success) {
          setLogs(result.logs || '');
          setTotalLines(result.totalLines || 0);
        }
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLogFilePath = async () => {
    try {
      if (window.api?.getLogFilePath) {
        const result = await window.api.getLogFilePath();
        if (result.success && result.path) {
          setLogFilePath(result.path);
        }
      }
    } catch (error) {
      console.error('Failed to get log file path:', error);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      try {
        if (window.api?.clearLogs) {
          await window.api.clearLogs();
          setLogs('');
          setTotalLines(0);
          logger.info('logs', 'Logs cleared by user');
        }
      } catch (error) {
        console.error('Failed to clear logs:', error);
      }
    }
  };

  const handleOpenLogFile = async () => {
    try {
      if (window.api?.openLogFile) {
        await window.api.openLogFile();
      }
    } catch (error) {
      console.error('Failed to open log file:', error);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(logFilePath);
    alert('Log file path copied to clipboard!');
  };

  // Filter logs based on search term and level
  const filteredLogs = React.useMemo(() => {
    const lines = logs.split('\n');
    let filtered = lines;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(line => line.includes(`[${selectedLevel.toUpperCase()}]`));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(line => line.toLowerCase().includes(term));
    }

    return filtered.join('\n');
  }, [logs, searchTerm, selectedLevel]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Application Logs</h3>
        <p className="text-sm text-gray-600">
          View and manage application logs. Logs are automatically saved to disk.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 space-y-3">
        {/* Search and Filter Row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="debug">DEBUG</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-2 items-center">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Logs
          </button>

          <button
            onClick={handleOpenLogFile}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open File
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Auto-refresh
            </label>
          </div>
        </div>

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">{totalLines.toLocaleString()}</span> total lines
            {searchTerm || selectedLevel !== 'all' ? (
              <span className="ml-2">
                ({filteredLogs.split('\n').filter(l => l.trim()).length.toLocaleString()} filtered)
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{logFilePath}</span>
            {logFilePath && (
              <button
                onClick={handleCopyPath}
                className="text-blue-600 hover:text-blue-800"
                title="Copy path"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-300 bg-gray-900">
        <pre className="h-full overflow-auto p-4 text-xs font-mono text-gray-100 leading-relaxed">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading logs...
              </div>
            </div>
          ) : filteredLogs.trim() ? (
            <code className="text-gray-100">{filteredLogs}</code>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {searchTerm || selectedLevel !== 'all' ? 'No logs match the current filters' : 'No logs available'}
            </div>
          )}
        </pre>
      </div>

      {/* Helper Text */}
      <div className="mt-3 text-xs text-gray-500">
        <p>
          💡 Tip: Logs are automatically saved to <code className="bg-gray-100 px-1 py-0.5 rounded">~/Library/Application Support/prompt-evaluator/application.log</code>
        </p>
      </div>
    </div>
  );
}
