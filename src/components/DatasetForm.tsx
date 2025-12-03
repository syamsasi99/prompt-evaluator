import React, { useState } from 'react';
import type { Dataset, DatasetRow, Prompt, ProjectOptions } from '../lib/types';
import { parseCSV, parseTable, readFileContent } from '../lib/dataset';
import { useToast } from '../contexts/ToastContext';
import { LoadingOverlay } from './LoadingOverlay';
import { logger } from '../lib/logger';

interface DatasetFormProps {
  dataset?: Dataset;
  onChange: (dataset: Dataset | undefined) => void;
  prompts?: Prompt[];
  options?: ProjectOptions;
  onUnsavedDataChange?: (hasUnsavedData: boolean) => void;
  validationError?: string | null;
}

const MAX_ROWS = 200;

export function DatasetForm({ dataset, onChange, prompts, options, onUnsavedDataChange, validationError }: DatasetFormProps) {
  const toast = useToast();
  const [pasteContent, setPasteContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingColumn, setGeneratingColumn] = useState(false);

  // Notify parent component when paste content changes
  React.useEffect(() => {
    if (onUnsavedDataChange) {
      onUnsavedDataChange(pasteContent.trim().length > 0);
    }
  }, [pasteContent, onUnsavedDataChange]);

  const handlePaste = () => {
    setError(null);
    const result = parseTable(pasteContent);

    if (!result.success) {
      logger.warn('dataset', 'Failed to parse pasted dataset', { error: result.error });
      setError(result.error || 'Failed to parse table');
      return;
    }

    // Check row limit
    if (result.data && result.data.length > MAX_ROWS) {
      logger.warn('dataset', `Dataset import failed: exceeds ${MAX_ROWS} rows limit`, {
        rows: result.data.length
      });
      setError(`Dataset exceeds maximum of ${MAX_ROWS} rows. Found ${result.data.length} rows.`);
      return;
    }

    logger.info('dataset', 'Dataset imported from paste', {
      rows: result.data?.length || 0,
      columns: result.headers?.length || 0
    });

    onChange({
      name: 'Pasted Dataset',
      rows: result.data || [],
      headers: result.headers, // Preserve headers
    });
    setPasteContent('');
    toast.success('Dataset imported successfully!');
  };

  // Autosave when user leaves the textarea
  const handleBlur = () => {
    if (pasteContent.trim().length > 0) {
      handlePaste();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileContent(file);
      let result;
      let csvPath: string | undefined;

      if (file.name.endsWith('.csv')) {
        result = parseCSV(content);
        // For CSV files, store the original file path if available
        // @ts-ignore - path is available on File objects in Electron
        const originalPath = file.path || file.name;
        csvPath = originalPath;
      } else {
        setError('Unsupported file type. Please use CSV files only.');
        return;
      }

      if (!result.success) {
        logger.warn('dataset', 'Failed to parse CSV file', {
          filename: file.name,
          error: result.error
        });
        setError(result.error || 'Failed to parse file');
        return;
      }

      // Check row limit
      if (result.data && result.data.length > MAX_ROWS) {
        logger.warn('dataset', `CSV import failed: exceeds ${MAX_ROWS} rows limit`, {
          filename: file.name,
          rows: result.data.length
        });
        setError(`Dataset exceeds maximum of ${MAX_ROWS} rows. Found ${result.data.length} rows.`);
        return;
      }

      logger.info('dataset', 'Dataset imported from CSV file', {
        filename: file.name,
        rows: result.data?.length || 0,
        columns: result.headers?.length || 0,
        csvPath
      });

      onChange({
        name: file.name,
        rows: result.data || [],
        headers: result.headers, // Preserve headers
        csvPath: csvPath, // Store CSV path for YAML generation
      });

      // Clear error on success
      setError(null);
    } catch (err: any) {
      logger.error('dataset', 'Failed to read file', {
        filename: file.name,
        error: err.message
      });
      setError(err.message || 'Failed to read file');
    }

    // Reset file input
    event.target.value = '';
  };

  const removeDataset = () => {
    const rowCount = dataset?.rows.length || 0;
    const columnCount = dataset?.headers?.length || 0;

    logger.info('dataset', 'All dataset data cleared', {
      clearedRows: rowCount,
      clearedColumns: columnCount
    });

    onChange(undefined);
    setError(null);
  };

  const updateRow = (index: number, key: string, value: any) => {
    if (!dataset) return;

    logger.debug('dataset', 'Dataset row updated', {
      rowIndex: index,
      column: key,
      totalRows: dataset.rows.length
    });

    const newRows = [...dataset.rows];
    newRows[index] = { ...newRows[index], [key]: value };
    onChange({ ...dataset, rows: newRows });
  };

  const addRow = () => {
    if (!dataset) return;

    // Check row limit
    if (dataset.rows.length >= MAX_ROWS) {
      logger.warn('dataset', `Failed to add row: Maximum ${MAX_ROWS} rows limit reached`);
      setError(`Maximum of ${MAX_ROWS} rows allowed`);
      return;
    }

    // Use preserved headers if available, otherwise get from first row
    const headers = dataset.headers || (dataset.rows.length > 0 ? Object.keys(dataset.rows[0]) : []);
    const newRow: DatasetRow = {};
    headers.forEach((key) => (newRow[key] = ''));

    logger.info('dataset', 'Dataset row added', {
      totalRows: dataset.rows.length + 1,
      columns: headers.length
    });

    onChange({ ...dataset, rows: [...dataset.rows, newRow] });
  };

  const removeRow = (index: number) => {
    if (!dataset) return;

    const newRows = dataset.rows.filter((_, i) => i !== index);

    logger.info('dataset', 'Dataset row removed', {
      rowIndex: index,
      totalRows: newRows.length
    });

    // If no rows left, clear the entire dataset
    if (newRows.length === 0) {
      logger.info('dataset', 'Last row removed - clearing dataset');
      onChange(undefined);
    } else {
      onChange({ ...dataset, rows: newRows });
    }
  };

  const removeColumn = (columnName: string) => {
    if (!dataset) return;

    // Remove column from headers
    const newHeaders = (dataset.headers || []).filter(h => h !== columnName);

    // Remove column from all rows
    const newRows = dataset.rows.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });

    logger.info('dataset', 'Dataset column removed', {
      column: columnName,
      totalColumns: newHeaders.length
    });

    // Check if all columns are removed (all rows would have empty objects)
    const hasNoColumns = newRows.length > 0 && Object.keys(newRows[0]).length === 0;

    // If no columns left, clear the entire dataset
    if (newHeaders.length === 0 || hasNoColumns) {
      logger.info('dataset', 'Last column removed - clearing dataset');
      onChange(undefined);
      toast.success(`Column "${columnName}" deleted. Dataset cleared.`);
    } else {
      onChange({
        ...dataset,
        headers: newHeaders.length > 0 ? newHeaders : undefined,
        rows: newRows,
      });
      toast.success(`Column "${columnName}" deleted successfully`);
    }
  };

  const handleGenerateRow = async () => {
    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
      toast.error('Dataset is empty. Add at least one row first to use as template.');
      return;
    }

    if (dataset.rows.length >= MAX_ROWS) {
      toast.error(`Maximum of ${MAX_ROWS} rows allowed.`);
      return;
    }

    if (!window.api?.generateDatasetRow) {
      toast.error('This feature requires running the app in Electron mode.');
      return;
    }

    setGeneratingColumn(true);

    try {
      const currentHeaders = dataset.headers || Object.keys(dataset.rows[0]);
      const aiModel = options?.aiModel || 'google:gemini-2.0-flash-exp';
      const customPrompt = options?.aiPromptRowGeneration;

      toast.info('Generating new row with AI...');

      // Prepare BigQuery reference config if enabled
      const bqReferenceConfig = options?.bigQueryReferenceEnabled ? {
        enabled: true,
        projectId: options.bigQueryReferenceProjectId || '',
        datasetId: options.bigQueryReferenceDatasetId || '',
        tableId: options.bigQueryReferenceTableId || '',
        columnHints: options.bigQueryReferenceColumnHints || '',
      } : undefined;

      const result = await window.api.generateDatasetRow({
        existingData: {
          headers: currentHeaders,
          rows: dataset.rows,
        },
        prompts: prompts?.map(p => ({ label: p.label, text: p.text })) || [],
        aiModel,
        customPrompt,
        bqReferenceConfig,
      });

      if (!result.success || result.error) {
        toast.error(`Failed to generate row: ${result.error}`);
        return;
      }

      if (result.row) {
        const newRows = [...dataset.rows, result.row];

        logger.info('dataset', 'AI-generated row added', {
          totalRows: newRows.length,
          aiModel,
          usedBqReference: !!bqReferenceConfig
        });

        onChange({
          ...dataset,
          rows: newRows,
        });

        toast.success('Added new AI-generated row successfully!');
      } else {
        logger.warn('dataset', 'AI row generation returned no data');
        toast.warning('No data was generated. Please try again.');
      }
    } catch (error: any) {
      logger.error('dataset', 'Failed to generate AI row', { error: error.message });
      console.error('Error generating row:', error);
      toast.error(`Failed to generate row: ${error.message}`);
    } finally {
      setGeneratingColumn(false);
    }
  };

  const handleGenerateExpectedOutput = async () => {
    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
      toast.error('Dataset is empty. Add some rows first.');
      return;
    }

    if (!window.api?.generateDatasetColumn) {
      toast.error('This feature requires running the app in Electron mode.');
      return;
    }

    const currentHeaders = dataset.headers || Object.keys(dataset.rows[0]);

    // Check if expected_output column already exists
    if (currentHeaders.some(h => h.toLowerCase().startsWith('expected'))) {
      toast.warning('Dataset already has an "expected_output" or similar column.');
      return;
    }

    setGeneratingColumn(true);

    try {
      const aiModel = options?.aiModel || 'google:gemini-2.0-flash-exp';
      const customPrompt = options?.aiPromptColumnGeneration;

      toast.info('Generating expected_output column with AI...');

      const result = await window.api.generateDatasetColumn({
        columnType: 'expected_output',
        existingData: {
          headers: currentHeaders,
          rows: dataset.rows,
        },
        prompts: prompts?.map(p => ({ label: p.label, text: p.text })) || [],
        aiModel,
        customPrompt,
      });

      if (!result.success || result.error) {
        toast.error(`Failed to generate expected_output: ${result.error}`);
        return;
      }

      if (result.columnName && result.values && result.values.length > 0) {
        // Add new column to headers
        const newHeaders = [...currentHeaders, result.columnName];

        // Add values to each row
        const newRows = dataset.rows.map((row, index) => ({
          ...row,
          [result.columnName!]: result.values![index] || '',
        }));

        logger.info('dataset', 'Expected output column generated', {
          columnName: result.columnName,
          rows: dataset.rows.length,
          aiModel
        });

        onChange({
          ...dataset,
          headers: newHeaders,
          rows: newRows,
        });

        toast.success(`Added "${result.columnName}" column successfully!`);
      } else {
        logger.warn('dataset', 'Expected output generation returned no data');
        toast.warning('No data was generated. Please try again.');
      }
    } catch (error: any) {
      logger.error('dataset', 'Failed to generate expected output', { error: error.message });
      console.error('Error generating expected_output:', error);
      toast.error(`Failed to generate column: ${error.message}`);
    } finally {
      setGeneratingColumn(false);
    }
  };


  // Use preserved headers if available, otherwise get from first row
  const handleAIGenerate = async () => {
    if (!prompts || prompts.length === 0) {
      toast.warning('Please add prompts first to generate a dataset.');
      return;
    }

    const hasValidPrompts = prompts.some(p => p.text.trim().length > 0);
    if (!hasValidPrompts) {
      toast.warning('Please add prompt text to generate a dataset.');
      return;
    }

    if (!window.api?.generateDataset) {
      toast.error('This feature requires running the app in Electron mode.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Create a promise that will race against the timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('AI generation timed out after 2 minutes'));
        }, 120000); // 2 minutes
      });

      const promptsData = prompts.map(p => ({
        label: p.label,
        text: p.text,
      }));

      // Race the API call against the timeout
      const aiModel = options?.aiModel || 'google:gemini-2.5-pro';
      const rowCount = options?.datasetRowCount ?? 1; // Use nullish coalescing to allow 0 and default to 1
      const customPrompt = options?.aiPromptDatasetGeneration;

      // Prepare BigQuery reference config if enabled
      const bqReferenceConfig = options?.bigQueryReferenceEnabled ? {
        enabled: true,
        projectId: options.bigQueryReferenceProjectId || '',
        datasetId: options.bigQueryReferenceDatasetId || '',
        tableId: options.bigQueryReferenceTableId || '',
        columnHints: options.bigQueryReferenceColumnHints || '',
      } : undefined;

      // Show info if BQ reference is enabled
      if (bqReferenceConfig && bqReferenceConfig.enabled) {
        toast.info('Using BigQuery reference table to generate contextually relevant test data...');
      }

      const generationPromise = window.api.generateDataset(promptsData, aiModel, rowCount, customPrompt, bqReferenceConfig);
      const result = await Promise.race([generationPromise, timeoutPromise]) as any;

      if (!result.success || result.error) {
        const errorMsg = result.message || result.error || 'Failed to generate dataset';
        setError(errorMsg);
        toast.error(errorMsg);

        if (result.suggestion) {
          toast.info(result.suggestion);
        }
        setIsGenerating(false);
        return;
      }

      if (result.dataset) {
        logger.info('dataset', 'AI-generated full dataset', {
          rows: result.dataset.rows.length,
          columns: result.dataset.headers?.length || 0,
          aiModel,
          usedBqReference: !!result.usedBqReference,
          bqReferenceRows: result.bqReferenceInfo?.rowCount
        });

        onChange(result.dataset);

        // Show info about BQ reference usage
        if (result.usedBqReference && result.bqReferenceInfo) {
          toast.success(
            `Generated dataset using patterns from ${result.bqReferenceInfo.rowCount} BigQuery reference rows!`
          );
        }

        if (result.analysis) {
          const analysis = result.analysis;
          toast.success(
            `Generated ${result.dataset.rows.length} test cases! ` +
            `Variables: ${analysis.variables.join(', ')}`
          );

          if (analysis.expected_variables && analysis.expected_variables.length > 0) {
            toast.info(
              `Includes expected values for: ${analysis.expected_variables.join(', ')}`
            );
          }
        } else {
          toast.success(`Dataset generated with ${result.dataset.rows.length} test cases!`);
        }
      } else {
        logger.warn('dataset', 'AI dataset generation returned no data');
        toast.warning('No dataset was generated. Please check your prompts and try again.');
      }
    } catch (error: any) {
      logger.error('dataset', 'Failed to generate AI dataset', { error: error.message });
      console.error('Error generating dataset:', error);
      const errorMsg = error.message || 'Failed to generate dataset';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const headers = dataset ? (dataset.headers || (dataset.rows.length > 0 ? Object.keys(dataset.rows[0]) : [])) : [];

  return (
    <>
      {/* Loading Overlay */}
      {isGenerating && (
        <LoadingOverlay
          message="Generating Dataset with AI"
          onTimeout={() => {
            setIsGenerating(false);
            toast.error('AI generation timed out after 2 minutes. Please try again.');
          }}
        />
      )}

      <div className="space-y-4">
      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-700 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                Required Column Missing
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                {validationError}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Please add an <span className="font-mono bg-red-100 dark:bg-red-900/50 px-1 py-0.5 rounded">expected_output</span> column to your dataset with the expected/reference answers for each test case. You can add it manually or use the "Add Column" feature below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dataset</h2>
        {(!dataset || dataset.rows.length === 0) && prompts && prompts.length > 0 && (
          <button
            onClick={handleAIGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            title="AI-powered dataset generation from prompt variables"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate with AI
              </>
            )}
          </button>
        )}
      </div>

      {(!dataset || dataset.rows.length === 0) && (
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800">
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Paste Table Data</h3>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              onBlur={handleBlur}
              placeholder="Paste tab or comma-separated data here...&#10;Examples:&#10;  With headers: name,age&#10;                John,30&#10;  Without headers: 1,2,3&#10;                   4,5,6"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md font-mono text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              rows={6}
            />
            <div className="text-xs text-muted-foreground dark:text-gray-400 space-y-1">
              <p>Supports data with or without headers. Auto-generates column names (col1, col2, etc.) if no headers detected.</p>
              <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Data auto-saves when you click away or switch tabs
              </p>
            </div>
            <button
              onClick={handlePaste}
              disabled={!pasteContent.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-sm"
            >
              Parse & Load
            </button>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800">
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Upload File</h3>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            <div className="text-xs text-muted-foreground dark:text-gray-400 space-y-1">
              <p>Supported formats: CSV</p>
              <p className="text-blue-600 dark:text-blue-400">CSV files will be referenced by path in the YAML (not inlined)</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      )}

      {dataset && dataset.rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="text-muted-foreground dark:text-gray-400">
                {dataset.rows.length} / {MAX_ROWS} row{dataset.rows.length !== 1 ? 's' : ''} loaded
                from {dataset.name}
                {dataset.rows.length >= MAX_ROWS && (
                  <span className="text-orange-600 dark:text-orange-400 ml-2">(Maximum reached)</span>
                )}
              </div>
              {dataset.csvPath && (
                <div className="text-xs mt-1 space-y-0.5">
                  <div className="text-blue-600 dark:text-blue-400">CSV Path: {dataset.csvPath}</div>
                  <div className="text-gray-600 dark:text-gray-400">(Read-only - editing disabled)</div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addRow}
                disabled={dataset.rows.length >= MAX_ROWS || !!dataset.csvPath}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-white"
                title={
                  dataset.csvPath
                    ? 'Cannot add rows to CSV-imported data'
                    : dataset.rows.length >= MAX_ROWS
                    ? `Maximum ${MAX_ROWS} rows allowed`
                    : 'Add a new empty row'
                }
              >
                + Add Row
              </button>
              <button
                onClick={handleGenerateRow}
                disabled={!!dataset.csvPath || dataset.rows.length === 0 || dataset.rows.length >= MAX_ROWS || generatingColumn}
                className="px-3 py-1.5 border border-green-600 dark:border-green-700 text-green-600 dark:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-white disabled:border-gray-400 dark:disabled:border-gray-600 flex items-center gap-1"
                title={
                  dataset.csvPath
                    ? 'Cannot add rows to CSV-imported data'
                    : dataset.rows.length === 0
                    ? 'Add at least one row first to use as template'
                    : dataset.rows.length >= MAX_ROWS
                    ? `Maximum ${MAX_ROWS} rows allowed`
                    : 'Generate a new row with AI-generated data for all columns'
                }
              >
                {generatingColumn ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Add Row
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateExpectedOutput}
                disabled={!!dataset.csvPath || dataset.rows.length === 0 || generatingColumn}
                className="px-3 py-1.5 border border-purple-600 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-white disabled:border-gray-400 dark:disabled:border-gray-600 flex items-center gap-1"
                title={
                  dataset.csvPath
                    ? 'Cannot modify CSV-imported data'
                    : dataset.rows.length === 0
                    ? 'Add data rows first'
                    : 'Generate expected_output column with AI for Factuality assertions'
                }
              >
                {generatingColumn ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Expected Output
                  </>
                )}
              </button>
              <label className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 cursor-pointer bg-white dark:bg-gray-800">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                Replace with CSV
              </label>
              <button
                onClick={removeDataset}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Remove All Data
              </button>
            </div>
          </div>

          {headers.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 group">
                        <div className="flex items-center justify-between gap-2">
                          <span>{header}</span>
                          {!dataset.csvPath && (
                            <button
                              onClick={() => removeColumn(header)}
                              className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-1 transition-colors"
                              title={`Delete column "${header}"`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-600 w-16">
                      {!dataset.csvPath && <span className="text-xs text-gray-500 dark:text-gray-400">Row</span>}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      {headers.map((header) => (
                        <td key={header} className="px-3 py-2">
                          <input
                            type="text"
                            value={row[header] ?? ''}
                            onChange={(e) =>
                              updateRow(rowIndex, header, e.target.value)
                            }
                            readOnly={!!dataset.csvPath}
                            className={`w-full px-2 py-1 border rounded text-sm dark:text-gray-100 ${
                              dataset.csvPath ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed border-gray-200 dark:border-gray-600' : 'border-gray-200 dark:border-gray-600 dark:bg-gray-700'
                            }`}
                            title={dataset.csvPath ? 'CSV data is read-only' : ''}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {!dataset.csvPath && (
                          <button
                            onClick={() => removeRow(rowIndex)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground dark:text-gray-400 mt-2 space-y-1">
        <p><strong>How it works:</strong> Dataset rows map to test cases. Each column becomes a variable that can be used in your prompts.</p>
        <p><strong>Variables:</strong> Column headers must match the variables used in your prompts (e.g., column "question" maps to {'{{question}}'}).</p>
        <p><strong>CSV Import:</strong> You can import data from a CSV file or manually add rows using the table below.</p>
        {dataset?.csvPath && (
          <p className="text-blue-600 dark:text-blue-400">
            <strong>Note:</strong> CSV file path will be used in the YAML config. Ensure the CSV file is accessible when running promptfoo.
          </p>
        )}
      </div>

      {/* Loading Overlay for Column Generation */}
      {generatingColumn && (
        <LoadingOverlay
          message="Generating Column with AI"
          onTimeout={() => {
            setGeneratingColumn(false);
            toast.error('AI generation timed out after 2 minutes. Please try again.');
          }}
        />
      )}
    </div>
    </>
  );
}
