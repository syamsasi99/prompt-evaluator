import React, { useState } from 'react';
import type { PromptfooResults, ProjectOptions } from '../lib/types';
import { useToast } from '../contexts/ToastContext';
import { StructuredAnalysis } from './StructuredAnalysis';
import { logger } from '../lib/logger';
import { PieChart } from './charts';

// Helper function to format cost with appropriate precision
const formatCost = (cost: number): string => {
  if (cost === 0) return '$0.000000';
  // Always show 6 decimal places for precision
  return `$${cost.toFixed(6)}`;
};

interface RunResultsProps {
  results: PromptfooResults | null;
  securityResults?: PromptfooResults | null;
  aiAnalysis?: any; // Persisted AI analysis from parent
  onAiAnalysisChange?: (analysis: any) => void; // Update AI analysis in parent
  onApplySuggestions?: (suggestedPrompts: string[]) => void; // Apply AI prompt suggestions
  onClose: () => void;
  onRefresh?: (results: PromptfooResults) => void;
  projectOptions?: ProjectOptions;
  isHistoryView?: boolean; // Hide refresh/close buttons in history view
}

export function RunResults({ results, securityResults, aiAnalysis: propAiAnalysis, onAiAnalysisChange, onApplySuggestions, onClose, onRefresh, projectOptions, isHistoryView = false }: RunResultsProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'results' | 'security' | 'tokens' | 'raw' | 'ai-comparison'>('results');
  const [selectedOutput, setSelectedOutput] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  // Use prop AI analysis if provided, otherwise local state (for history view)
  const [localAiAnalysis, setLocalAiAnalysis] = useState<any>(null);
  const aiAnalysis = propAiAnalysis !== undefined ? propAiAnalysis : localAiAnalysis;
  const setAiAnalysis = onAiAnalysisChange || setLocalAiAnalysis;
  const [isStructuredAnalysis, setIsStructuredAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filters and pagination
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  console.log('RunResults - projectOptions:', projectOptions);
  console.log('RunResults - jsonOutputPath:', projectOptions?.jsonOutputPath);

  // Log when results page is loaded
  React.useEffect(() => {
    if (results) {
      logger.info('results', 'Results page loaded', {
        totalTests: results.results?.table?.body?.length || 0,
        hasSecurityResults: !!securityResults,
        isHistoryView
      });
    }
  }, [results]);

  // Helper function to change tab with logging
  const handleTabChange = (tab: 'results' | 'security' | 'tokens' | 'raw' | 'ai-comparison') => {
    logger.info('results', `${tab === 'results' ? 'Test results' : tab === 'tokens' ? 'Token usage' : tab === 'ai-comparison' ? 'AI comparison' : tab === 'raw' ? 'Raw JSON' : 'Security'} tab opened`);
    setActiveTab(tab);
  };

  // Helper function for clear results with logging
  const handleClearResults = () => {
    logger.info('results', 'Clicked on clear results');
    onClose();
  };

  // Helper function for filter change with logging
  const handleFilterChange = (filter: 'all' | 'passed' | 'failed') => {
    logger.info('results', `Selected filter: ${filter}`);
    setFilterStatus(filter);
  };

  // Helper function for search with logging
  const handleSearchChange = (query: string) => {
    if (query) {
      logger.debug('results', 'Searched in test result tab', { query });
    }
    setSearchQuery(query);
  };

  // Helper function for expanding test with logging
  const handleToggleTest = (testId: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      logger.info('results', 'Expanded a test case result');
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  // Check if there are PROMPT suggestions (not test data suggestions) available in AI analysis
  const hasPromptSuggestions = React.useMemo(() => {
    if (!aiAnalysis) return false;

    if (typeof aiAnalysis === 'string') {
      // For string analysis, check if it's about prompts not test data
      const lowerAnalysis = aiAnalysis.toLowerCase();
      const isDataIssue = lowerAnalysis.includes('test data') ||
                          lowerAnalysis.includes('test case') ||
                          lowerAnalysis.includes('expected value') ||
                          lowerAnalysis.includes('correct the dataset') ||
                          lowerAnalysis.includes('fix the test data');
      return !isDataIssue;
    }

    if (aiAnalysis?.prompt_improvements && Array.isArray(aiAnalysis.prompt_improvements)) {
      // Filter out data-related improvements
      const promptImprovements = aiAnalysis.prompt_improvements.filter((improvement: any) => {
        const suggestionText = (improvement.suggestion || '').toLowerCase();
        const problemText = (improvement.problem || '').toLowerCase();

        // Check if this is about test data issues
        const isDataIssue = suggestionText.includes('test data') ||
                           suggestionText.includes('test case') ||
                           suggestionText.includes('expected value') ||
                           suggestionText.includes('update the \'expected\'') ||
                           suggestionText.includes('fix the test') ||
                           problemText.includes('test\'s \'expected\' answer') ||
                           problemText.includes('flawed test case');

        return !isDataIssue;
      });
      return promptImprovements.length > 0;
    }

    if (aiAnalysis?.promptSuggestions && Array.isArray(aiAnalysis.promptSuggestions)) {
      return aiAnalysis.promptSuggestions.length > 0;
    }

    if (aiAnalysis?.suggestions && Array.isArray(aiAnalysis.suggestions)) {
      return aiAnalysis.suggestions.length > 0;
    }

    return false;
  }, [aiAnalysis]);

  // Helper function to detect if analysis has structured format
  const isStructuredFormat = (analysis: any): boolean => {
    if (!analysis || typeof analysis !== 'object') return false;

    // Check for key structured analysis fields
    const hasStructuredFields =
      (analysis.summary && typeof analysis.summary === 'object') ||
      (analysis.failed_tests_by_model && Array.isArray(analysis.failed_tests_by_model)) ||
      (analysis.cross_model_rca && typeof analysis.cross_model_rca === 'object') ||
      (analysis.model_comparison && typeof analysis.model_comparison === 'object') ||
      (analysis.prompt_improvements && Array.isArray(analysis.prompt_improvements));

    return hasStructuredFields;
  };

  // Load AI analysis from results if available
  React.useEffect(() => {
    if (results && (results as any).aiAnalysis) {
      const savedAnalysis = (results as any).aiAnalysis;
      setAiAnalysis(savedAnalysis.analysis);

      // Auto-detect if this is structured analysis
      const isStructured = savedAnalysis.isStructured !== undefined
        ? savedAnalysis.isStructured
        : isStructuredFormat(savedAnalysis.analysis);

      setIsStructuredAnalysis(isStructured);
      console.log('Loaded saved AI analysis from results, isStructured:', isStructured);
    }
  }, [results]);

  // Auto-detect structured format when aiAnalysis changes
  React.useEffect(() => {
    if (aiAnalysis && !isStructuredAnalysis) {
      const isStructured = isStructuredFormat(aiAnalysis);
      if (isStructured) {
        setIsStructuredAnalysis(true);
        console.log('Auto-detected structured analysis format');
      }
    }
  }, [aiAnalysis]);

  // Format timestamp to Singapore time
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-SG', {
        timeZone: 'Asia/Singapore',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timestamp;
    }
  };

  const handleRefresh = async () => {
    if (!window.api?.readJsonResults || !projectOptions?.jsonOutputPath) {
      setRefreshError('Cannot refresh: JSON output path not configured');
      return;
    }

    logger.info('results', 'Clicked on refresh results');
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const result = await window.api.readJsonResults(projectOptions.jsonOutputPath);

      if (result.success && result.results) {
        logger.info('results', 'Results refreshed successfully', {
          totalTests: result.results.results?.table?.body?.length || 0
        });
        if (onRefresh) {
          onRefresh(result.results);
        }
        setRefreshError(null);
      } else {
        logger.error('results', 'Failed to refresh results', { error: result.error });
        setRefreshError(result.error || 'Failed to load results');
      }
    } catch (error: any) {
      logger.error('results', 'Error refreshing results', { error: error.message });
      setRefreshError(error.message || 'Failed to refresh results');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAIComparison = async () => {
    if (!results || !window.api?.analyzeResults) {
      toast.error('AI comparison is not available in this mode');
      return;
    }

    logger.info('results', 'Clicked on Start AI analysis');
    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      // Prepare complete data for AI analysis
      const table = results.results?.table || results.table;
      const stats = results.results?.stats || results.stats;
      const resultsArray = results.results?.results || results.results;
      const promptsArray = results.results?.prompts || [];

      // Include complete promptfoo results structure
      const summaryData = {
        version: 3,
        timestamp: results.timestamp || results.results?.timestamp || new Date().toISOString(),
        results: {
          table: table,
          stats: stats,
          results: resultsArray ? resultsArray.slice(0, 50) : [], // Limit to first 50 for analysis
          prompts: promptsArray.map((p: any) => ({
            id: p.provider || p.id,
            provider: p.provider || p.id,
            label: p.label,
            metrics: p.metrics,
          })),
        },
        config: results.config || {},
      };

      console.log('Sending AI analysis data:', JSON.stringify(summaryData, null, 2));

      // Pass JSON output path so the analysis can be saved
      const jsonPath = projectOptions?.jsonOutputPath;
      const aiModel = projectOptions?.aiModel || 'google:gemini-2.5-pro';
      const customPrompt = projectOptions?.aiPromptAnalysis;
      const analysis = await window.api.analyzeResults(summaryData, jsonPath, aiModel, customPrompt);

      if (analysis.success) {
        logger.info('results', 'AI analysis completed successfully', {
          isStructured: analysis.isStructured
        });
        setAiAnalysis(analysis.analysis);

        // Use provided flag or auto-detect
        const isStructured = analysis.isStructured !== undefined
          ? analysis.isStructured
          : isStructuredFormat(analysis.analysis);

        setIsStructuredAnalysis(isStructured);
        toast.success('AI analysis completed successfully!');
      } else {
        logger.error('results', 'AI analysis failed', { error: analysis.error });
        toast.error(analysis.error || 'Failed to analyze results');
        setRefreshError(analysis.error || 'Failed to analyze results');
      }
    } catch (error: any) {
      logger.error('results', 'Error in AI analysis', { error: error.message });
      console.error('Error analyzing results:', error);
      toast.error(`Failed to analyze results: ${error.message}`);
      setRefreshError(error.message || 'Failed to analyze results');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!results) {
    return null;
  }

  // Determine which results to display based on active tab
  const displayResults = activeTab === 'security' && securityResults ? securityResults : results;

  // Try multiple possible data structures
  const table = displayResults.results?.table || displayResults.table;
  const stats = displayResults.results?.stats || displayResults.stats;

  // Check for alternative structure (flat results array from new format)
  const resultsArray = displayResults.results?.results || displayResults.results;
  const promptsArray = displayResults.results?.prompts || [];

  const prompts = table?.head?.prompts || promptsArray;

  // Get timestamp from various possible locations
  const timestamp = displayResults.timestamp || displayResults.results?.timestamp || displayResults.createdAt || displayResults.results?.createdAt;

  // For new format: transform results array into table-like structure
  const hasNewFormat = !table && Array.isArray(resultsArray) && resultsArray.length > 0;

  // Group results by test case (same vars = same test, different providers)
  const groupResultsByTestCase = () => {
    if (!hasNewFormat || !Array.isArray(resultsArray)) return [];

    const grouped = new Map<string, any[]>();

    resultsArray.forEach((result: any) => {
      // Create a key from test vars to identify same test case
      const varsKey = JSON.stringify(result.vars || {});

      if (!grouped.has(varsKey)) {
        grouped.set(varsKey, []);
      }
      grouped.get(varsKey)!.push(result);
    });

    // Convert to array of test case groups
    return Array.from(grouped.entries()).map(([varsKey, results]) => ({
      vars: results[0].vars,
      testIdx: results[0].testIdx,
      description: results[0].description, // Add description field for security tests
      providers: results,
    }));
  };

  const testCaseGroups = groupResultsByTestCase();
  const hasMultipleProvidersPerTest = testCaseGroups.some(group => group.providers.length > 1);

  // Helper function to extract security test name from description or infer from vars
  const getSecurityTestName = (description: string | undefined, vars: any): string | null => {
    // First try to extract from description - handle both old and new OWASP format
    if (description) {
      // New OWASP format: "LLM01: Prompt Injection - Testing with variables: {{var}}"
      const owaspMatch = description.match(/^(LLM\d+:\s*[^-]+?)(?:\s*[-\(].*)?$/i);
      if (owaspMatch) {
        return owaspMatch[1].trim();
      }

      // Old format: "Security: Action - Testing with variables: {{var}}"
      const oldMatch = description.match(/^Security:\s*(.+?)(?:\s*[-\(].*)?$/i);
      if (oldMatch) {
        return oldMatch[1].trim();
      }
    }

    // Fallback: Infer test type from variable content patterns
    if (vars) {
      const varValues = Object.values(vars).map(v => String(v).toLowerCase());
      const allVars = varValues.join(' ');

      if (allVars.includes('ignore all previous') || allVars.includes('reveal') && allVars.includes('hidden')) {
        return 'LLM01: Prompt Injection';
      } else if (allVars.includes('password') || allVars.includes('api') && allVars.includes('key')) {
        return 'LLM02: Sensitive Information Disclosure';
      } else if (allVars.includes('github repo') || allVars.includes('security checks')) {
        return 'LLM03: Supply Chain Vulnerabilities';
      } else if (allVars.includes('backdoor') || allVars.includes('fine-tuning')) {
        return 'LLM04: Data and Model Poisoning';
      } else if (allVars.includes('<script>') || allVars.includes('xss')) {
        return 'LLM05: Improper Output Handling';
      } else if (allVars.includes('delete all files') || allVars.includes('confirm when finished')) {
        return 'LLM06: Excessive Agency';
      } else if (allVars.includes('exact system instructions') || allVars.includes('word-for-word')) {
        return 'LLM07: System Prompt Leakage';
      } else if (allVars.includes('attacker says') || allVars.includes('trust me over')) {
        return 'LLM08: Vector and Embedding Weaknesses';
      } else if (allVars.includes('first person') && allVars.includes('moon')) {
        return 'LLM09: Misinformation';
      } else if (allVars.includes('10,000 times') || allVars.includes('repeating')) {
        return 'LLM10: Unbounded Consumption';
      }
    }

    return null;
  };

  // Filter and search logic for grouped test cases
  const getFilteredTestCases = () => {
    if (!hasNewFormat || testCaseGroups.length === 0) return [];

    return testCaseGroups.filter((testCase: any) => {
      // Status filter - if ANY provider passes/fails
      // Check component results (individual assertions) for accurate pass/fail status
      const hasPassed = testCase.providers.some((r: any) => {
        if (r.gradingResult?.componentResults && r.gradingResult.componentResults.length > 0) {
          return r.gradingResult.componentResults.every((cr: any) => cr.pass);
        }
        return r.success || r.score >= 0.7;
      });
      const hasFailed = testCase.providers.some((r: any) => {
        if (r.gradingResult?.componentResults && r.gradingResult.componentResults.length > 0) {
          return !r.gradingResult.componentResults.every((cr: any) => cr.pass);
        }
        return !(r.success || r.score >= 0.7);
      });

      if (filterStatus === 'passed' && !hasPassed) return false;
      if (filterStatus === 'failed' && !hasFailed) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchableText = testCase.providers.map((r: any) => [
          r.prompt?.raw,
          r.response?.output,
          r.error,
          JSON.stringify(r.vars),
          r.gradingResult?.reason,
        ].filter(Boolean).join(' ')).join(' ').toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  };

  const filteredTestCases = getFilteredTestCases();
  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage);
  const paginatedTestCases = filteredTestCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  const toggleExpand = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        logger.info('results', 'Expanded a test case result');
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const passRate = stats && (stats.successes + stats.failures) > 0
    ? ((stats.successes / (stats.successes + stats.failures)) * 100).toFixed(1)
    : '0.0';

  // Calculate total tokens
  const totalTokens = stats?.tokenUsage?.total || 0;
  const promptTokens = stats?.tokenUsage?.prompt || 0;
  const completionTokens = stats?.tokenUsage?.completion || 0;
  const cachedTokens = stats?.tokenUsage?.cached || 0;
  const reasoningTokens = stats?.tokenUsage?.completionDetails?.reasoning || 0;

  // Calculate assertion tokens
  const assertionTokens = stats?.tokenUsage?.assertions || {};
  const assertionTotal = assertionTokens.total || 0;
  const assertionPrompt = assertionTokens.prompt || 0;
  const assertionCompletion = assertionTokens.completion || 0;
  const assertionCached = assertionTokens.cached || 0;
  // Reasoning tokens might be in completionDetails or need to be calculated from the difference
  let assertionReasoning = assertionTokens.completionDetails?.reasoning || 0;

  // If reasoning is 0 but the total doesn't match, calculate it from the difference
  if (assertionReasoning === 0 && assertionTotal > 0) {
    const knownTokens = assertionPrompt + assertionCompletion + assertionCached;
    if (knownTokens < assertionTotal) {
      assertionReasoning = assertionTotal - knownTokens;
    }
  }

  // Calculate per-model token usage for new format
  const modelTokenUsage = hasNewFormat ? promptsArray.map((prompt: any) => {
    const modelId = prompt.provider || prompt.id;
    const metrics = prompt.metrics?.tokenUsage || {};

    return {
      modelId,
      label: prompt.label,
      total: metrics.total || 0,
      prompt: metrics.prompt || 0,
      completion: metrics.completion || 0,
      cached: metrics.cached || 0,
      reasoning: metrics.completionDetails?.reasoning || 0,
      numRequests: metrics.numRequests || 0,
    };
  }) : [];

  // Grand total (evaluation + assertions)
  const grandTotalTokens = totalTokens + assertionTotal;
  const grandTotalPrompt = promptTokens + assertionPrompt;
  const grandTotalCompletion = completionTokens + assertionCompletion;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Evaluation Results</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {results.config?.description || 'Test Results'}
            </p>
            {timestamp && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generated: {formatTimestamp(timestamp)} (Singapore Time)
              </p>
            )}
            {refreshError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{refreshError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {projectOptions?.jsonOutputPath && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Results
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleClearResults}
              className="px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium shadow-sm"
            >
              Clear Results
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-6 rounded-xl shadow-sm border border-green-200 dark:border-green-700">
            <div className="text-4xl font-bold text-green-700 dark:text-green-300">{passRate}%</div>
            <div className="text-sm font-medium text-green-800 dark:text-green-300 mt-2">Pass Rate</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 p-6 rounded-xl shadow-sm border border-green-200 dark:border-green-700">
            <div className="text-4xl font-bold text-green-700 dark:text-green-300">{stats?.successes || 0}</div>
            <div className="text-sm font-medium text-green-800 dark:text-green-300 mt-2">Passed</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 p-6 rounded-xl shadow-sm border border-red-200 dark:border-red-700">
            <div className="text-4xl font-bold text-red-700 dark:text-red-300">{stats?.failures || 0}</div>
            <div className="text-sm font-medium text-red-800 dark:text-red-300 mt-2">Failed</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-6 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700">
            <div className="text-4xl font-bold text-blue-700 dark:text-blue-300">
              {(stats?.successes || 0) + (stats?.failures || 0)}
            </div>
            <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mt-2">Total Tests</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-700">
            <div className="text-4xl font-bold text-purple-700 dark:text-purple-300">
              {grandTotalTokens.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mt-2">Total Tokens</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {totalTokens.toLocaleString()} Evaluation + {assertionTotal.toLocaleString()} Assertions
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="results-tabs flex gap-2 px-6 pt-4 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => handleTabChange('results')}
          className={`px-6 py-3 rounded-t-lg text-sm font-semibold transition-all ${
            activeTab === 'results'
              ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm border-t-2 border-blue-600 dark:border-blue-500'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          Test Results
        </button>

        {/* Security Results Tab - only show if we have security results */}
        {securityResults && (
          <button
            onClick={() => handleTabChange('security')}
            className={`px-6 py-3 rounded-t-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 shadow-sm border-t-2 border-red-600 dark:border-red-500'
                : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Security Results (8 tests)
          </button>
        )}

        <button
          onClick={() => handleTabChange('tokens')}
          className={`px-6 py-3 rounded-t-lg text-sm font-semibold transition-all ${
            activeTab === 'tokens'
              ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm border-t-2 border-blue-600 dark:border-blue-500'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          Token Usage
        </button>
        <button
          onClick={() => handleTabChange('ai-comparison')}
          className={`px-6 py-3 rounded-t-lg text-sm font-semibold transition-all ${
            activeTab === 'ai-comparison'
              ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm border-t-2 border-blue-600 dark:border-blue-500'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          AI Comparison
        </button>
        <button
          onClick={() => handleTabChange('raw')}
          className={`px-6 py-3 rounded-t-lg text-sm font-semibold transition-all ${
            activeTab === 'raw'
              ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm border-t-2 border-blue-600 dark:border-blue-500'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          Raw JSON
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 p-6">
        {/* Test Results Tab & Security Results Tab */}
        {(activeTab === 'results' || activeTab === 'security') && (
          <>
            {/* Filters and Search - only for new format */}
            {hasNewFormat && (
              <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Search */}
                  <div className="flex-1 min-w-[300px]">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search tests by prompt, output, variables..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFilterChange('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === 'all'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      All ({testCaseGroups.length})
                    </button>
                    <button
                      onClick={() => handleFilterChange('passed')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === 'passed'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      ✓ Passed ({stats?.successes || 0})
                    </button>
                    <button
                      onClick={() => handleFilterChange('failed')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === 'failed'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      ✗ Failed ({stats?.failures || 0})
                    </button>
                  </div>

                  {/* Results count */}
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredTestCases.length} of {testCaseGroups.length} test cases
                    {hasMultipleProvidersPerTest && <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">(Multi-provider comparison)</span>}
                  </div>
                </div>
              </div>
            )}

            {(table || hasNewFormat) ? (
              <div className="space-y-6">
                {/* Render old table format */}
                {table && table.body.map((row, rowIndex) => (
              <div key={rowIndex} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Test Case {rowIndex + 1}</span>
                      {row.vars && (
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                          {Object.entries(row.vars).map(([k, v]) => (
                            <span key={k} className="inline-block mr-6 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border dark:border-blue-700">
                              <span className="font-semibold text-blue-900 dark:text-blue-300">{k}:</span>{' '}
                              <span className="text-blue-700 dark:text-blue-300">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {row.outputs.map((output, outputIndex) => {
                    const promptInfo = table.head.prompts[outputIndex];
                    const passed = output.pass;

                    return (
                      <div key={outputIndex} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {promptInfo?.label || 'Prompt'}
                              </div>
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full border dark:border-blue-700">
                                {promptInfo?.provider}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300">
                              <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border dark:border-gray-600">
                                <span className="font-semibold">Score:</span>
                                <span className={output.score >= 0.7 ? 'text-green-700 dark:text-green-300 font-bold' : 'text-red-700 dark:text-red-300 font-bold'}>
                                  {output.score?.toFixed(2) || 'N/A'}
                                </span>
                              </span>
                              <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border dark:border-gray-600">
                                <span className="font-semibold">Latency:</span>
                                <span className="font-medium">{output.latencyMs}ms</span>
                              </span>
                              {output.cost && (
                                <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border dark:border-gray-600">
                                  <span className="font-semibold">Cost:</span>
                                  <span className="font-medium">{formatCost(output.cost)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex-shrink-0 ${
                              passed
                                ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-900 dark:text-green-300 border-2 border-green-400 dark:border-green-600'
                                : 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 text-red-900 dark:text-red-300 border-2 border-red-400 dark:border-red-600'
                            }`}
                          >
                            {passed ? '✓ PASS' : '✗ FAIL'}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Output */}
                          <div>
                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                              Output:
                            </div>
                            <div className="text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 whitespace-pre-wrap font-mono text-gray-900 dark:text-gray-100">
                              {output.text || 'No output'}
                            </div>
                          </div>

                          {/* Assertion Results */}
                          {output.gradingResult?.componentResults && output.gradingResult.componentResults.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                                Assertion Results:
                              </div>
                              <div className="space-y-3">
                                {output.gradingResult.componentResults.map(
                                  (result: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`p-4 rounded-xl border-2 ${
                                        result.pass
                                          ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-300 dark:border-green-700'
                                          : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-300 dark:border-red-700'
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <span
                                          className={`text-2xl ${
                                            result.pass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                          }`}
                                        >
                                          {result.pass ? '✓' : '✗'}
                                        </span>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                                              {result.assertion?.type || 'Unknown Assertion'}
                                            </span>
                                            {result.score !== undefined && (
                                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 px-2 py-1 rounded-md border dark:border-gray-600">
                                                Score: {result.score.toFixed(2)}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                            {result.reason || 'No reason provided'}
                                          </div>
                                          {result.assertion?.value && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-white dark:bg-gray-700 px-2 py-1 rounded inline-block border dark:border-gray-600">
                                              Expected: {typeof result.assertion.value === 'object'
                                                ? JSON.stringify(result.assertion.value, null, 2)
                                                : String(result.assertion.value)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              logger.info('results', 'Clicked on View full details');
                              setSelectedOutput(output);
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-semibold"
                          >
                            View Full Details →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
                ))}

                {/* Render new array format with pagination - grouped by test case */}
                {hasNewFormat && paginatedTestCases.map((testCase: any, pageIdx: number) => {
                  const testIdx = (currentPage - 1) * itemsPerPage + pageIdx;
                  const testId = `testcase-${testIdx}`;
                  const isExpanded = expandedTests.has(testId);

                  // Determine overall pass/fail for this test case
                  // A test passes ONLY if ALL assertions pass (including latency, etc.)
                  const allPassed = testCase.providers.every((r: any) => {
                    // First check if there are component results (individual assertions)
                    if (r.gradingResult?.componentResults && r.gradingResult.componentResults.length > 0) {
                      // ALL component results must pass
                      return r.gradingResult.componentResults.every((cr: any) => cr.pass);
                    }
                    // Fallback to success flag or score
                    return r.success || r.score >= 0.7;
                  });
                  const anyPassed = testCase.providers.some((r: any) => {
                    // Check component results if available
                    if (r.gradingResult?.componentResults && r.gradingResult.componentResults.length > 0) {
                      return r.gradingResult.componentResults.every((cr: any) => cr.pass);
                    }
                    return r.success || r.score >= 0.7;
                  });
                  const overallStatus = allPassed ? 'passed' : anyPassed ? 'mixed' : 'failed';

                  return (
                    <div key={testId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
                      {/* Collapsible Header */}
                      <div
                        className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => toggleExpand(testId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {activeTab === 'security' ? (
                                <>
                                  <span className="text-lg font-bold text-red-900 dark:text-red-300">
                                    {getSecurityTestName(testCase.description, testCase.vars) || `Test Case ${testIdx + 1}`}
                                  </span>
                                  <span className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded border dark:border-red-700">
                                    Security Test
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Test Case {testIdx + 1}</span>
                              )}
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                overallStatus === 'passed'
                                  ? 'bg-green-200 dark:bg-green-900/30 text-green-900 dark:text-green-300 border dark:border-green-700'
                                  : overallStatus === 'mixed'
                                  ? 'bg-yellow-200 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300 border dark:border-yellow-700'
                                  : 'bg-red-200 dark:bg-red-900/30 text-red-900 dark:text-red-300 border dark:border-red-700'
                              }`}>
                                {overallStatus === 'passed' ? '✓ ALL PASSED' : overallStatus === 'mixed' ? '⚠ MIXED' : '✗ ALL FAILED'}
                              </span>
                              {testCase.providers.length > 1 && (
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-full border dark:border-blue-700">
                                  {testCase.providers.length} Providers
                                </span>
                              )}
                            </div>
                            {testCase.vars && (
                              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                {Object.entries(testCase.vars).map(([k, v]) => (
                                  <span key={k} className="inline-block mr-6 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border dark:border-blue-700">
                                    <span className="font-semibold text-blue-900 dark:text-blue-300">{k}:</span>{' '}
                                    <span className="text-blue-700 dark:text-blue-300">{String(v).substring(0, 50)}{String(v).length > 50 ? '...' : ''}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button className="ml-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                            <svg
                              className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="p-6">
                          {/* Provider Comparison Grid */}
                          <div className={`grid gap-6 ${testCase.providers.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                            {testCase.providers.map((result: any, providerIdx: number) => {
                              // Check component results for accurate pass/fail status
                              const passed = result.gradingResult?.componentResults && result.gradingResult.componentResults.length > 0
                                ? result.gradingResult.componentResults.every((cr: any) => cr.pass)
                                : (result.success || result.score >= 0.7);
                              const promptInfo = promptsArray.find((p: any) => p.id === result.promptId) || promptsArray[result.promptIdx] || {};

                              return (
                                <div key={result.id || providerIdx} className={`border-2 rounded-lg p-5 ${
                                  passed ? 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/20' : 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/20'
                                }`}>
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {promptInfo.label || result.prompt?.label || 'Prompt'}
                              </div>
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full border dark:border-blue-700">
                                {result.provider?.id || promptInfo.provider || 'Provider'}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300">
                              <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border dark:border-gray-600">
                                <span className="font-semibold">Score:</span>
                                <span className={result.score >= 0.7 ? 'text-green-700 dark:text-green-300 font-bold' : 'text-red-700 dark:text-red-300 font-bold'}>
                                  {result.score?.toFixed(2) || 'N/A'}
                                </span>
                              </span>
                              <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border dark:border-gray-600">
                                <span className="font-semibold">Latency:</span>
                                <span className="font-medium">{result.latencyMs}ms</span>
                              </span>
                              {result.cost !== undefined && (
                                <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border dark:border-gray-600">
                                  <span className="font-semibold">Cost:</span>
                                  <span className="font-medium">{formatCost(result.cost)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex-shrink-0 ${
                              passed
                                ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-900 dark:text-green-300 border-2 border-green-400 dark:border-green-600'
                                : 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 text-red-900 dark:text-red-300 border-2 border-red-400 dark:border-red-600'
                            }`}
                          >
                            {passed ? '✓ PASS' : '✗ FAIL'}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Prompt Display */}
                          {result.prompt?.raw && (
                            <div>
                              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                                Prompt:
                              </div>
                              <div className="text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 whitespace-pre-wrap font-mono text-gray-900 dark:text-gray-100">
                                {result.prompt.raw}
                              </div>
                            </div>
                          )}

                          {/* Output */}
                          <div>
                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                              Output:
                            </div>
                            <div className="text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 whitespace-pre-wrap font-mono text-gray-900 dark:text-gray-100">
                              {result.response?.output || result.output || 'No output'}
                            </div>
                          </div>

                          {/* Assertion Results */}
                          {result.gradingResult?.componentResults && result.gradingResult.componentResults.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                                Assertion Results:
                              </div>
                              <div className="space-y-3">
                                {result.gradingResult.componentResults.map(
                                  (componentResult: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`p-4 rounded-xl border-2 ${
                                        componentResult.pass
                                          ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-300 dark:border-green-700'
                                          : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-300 dark:border-red-700'
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <span
                                          className={`text-2xl ${
                                            componentResult.pass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                          }`}
                                        >
                                          {componentResult.pass ? '✓' : '✗'}
                                        </span>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                                              {componentResult.assertion?.type || 'Unknown Assertion'}
                                            </span>
                                            {componentResult.score !== undefined && (
                                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 px-2 py-1 rounded-md border dark:border-gray-600">
                                                Score: {componentResult.score.toFixed(2)}
                                              </span>
                                            )}
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                              componentResult.pass
                                                ? 'bg-green-200 dark:bg-green-900/30 text-green-900 dark:text-green-300 border dark:border-green-700'
                                                : 'bg-red-200 dark:bg-red-900/30 text-red-900 dark:text-red-300 border dark:border-red-700'
                                            }`}>
                                              {componentResult.pass ? 'PASSED' : 'FAILED'}
                                            </span>
                                          </div>
                                          <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-2">
                                            {componentResult.reason || 'No reason provided'}
                                          </div>
                                          {componentResult.assertion?.value && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded inline-block border dark:border-gray-600">
                                              <span className="font-semibold">Expected:</span> {typeof componentResult.assertion.value === 'object'
                                                ? JSON.stringify(componentResult.assertion.value, null, 2)
                                                : String(componentResult.assertion.value)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Error Display */}
                          {result.error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
                              <div className="text-xs font-bold text-red-700 dark:text-red-300 mb-2 uppercase tracking-wider">
                                Error:
                              </div>
                              <div className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                                {result.error}
                              </div>
                            </div>
                          )}

                                  <button
                                    onClick={() => setSelectedOutput(result)}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-semibold"
                                  >
                                    View Full Details →
                                  </button>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {hasNewFormat && totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages} • Showing {paginatedTestCases.length} of {filteredTestCases.length} test cases
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center max-w-2xl">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Test Results Table Data</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    The results file doesn't contain the expected table structure.
                  </p>
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-left text-sm border dark:border-gray-600">
                    <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Found data structure:</p>
                    <pre className="text-xs overflow-auto max-h-40 text-gray-800 dark:text-gray-200">
                      {JSON.stringify({
                        hasResults: !!results,
                        hasResultsResults: !!results.results,
                        hasTable: !!table,
                        hasStats: !!stats,
                        hasResultsArray: !!(resultsArray && Array.isArray(resultsArray)),
                        resultKeys: results ? Object.keys(results) : [],
                        resultsResultsKeys: results.results ? Object.keys(results.results) : [],
                      }, null, 2)}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    Check the developer console (Debug Mode in Options) for full details
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Token Usage Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            {/* Grand Total Section */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 text-white rounded-xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold mb-4">📊 Token Usage Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <div className="text-4xl font-bold">{grandTotalTokens.toLocaleString()}</div>
                  <div className="text-sm mt-1">Total Tokens</div>
                  <div className="text-xs mt-1 opacity-80">Evaluation + Assertions</div>
                </div>
                <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <div className="text-4xl font-bold">{totalTokens.toLocaleString()}</div>
                  <div className="text-sm mt-1">Evaluation Tokens</div>
                  <div className="text-xs mt-1 opacity-80 font-semibold">
                    {grandTotalTokens > 0 ? ((totalTokens / grandTotalTokens) * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
                <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <div className="text-4xl font-bold">{assertionTotal.toLocaleString()}</div>
                  <div className="text-sm mt-1">Assertion Tokens</div>
                  <div className="text-xs mt-1 opacity-80 font-semibold">
                    {grandTotalTokens > 0 ? ((assertionTotal / grandTotalTokens) * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
              </div>
            </div>

            {/* Token Distribution Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evaluation vs Assertion Pie Chart */}
              <PieChart
                data={[
                  { name: 'Evaluation', value: totalTokens, color: '#3B82F6' },
                  { name: 'Assertions', value: assertionTotal, color: '#F59E0B' },
                ]}
                title="Token Distribution: Evaluation vs Assertions"
                valueFormatter={(value) => value.toLocaleString()}
                height={280}
              />

              {/* Evaluation Token Breakdown Pie Chart */}
              <PieChart
                data={[
                  { name: 'Prompt', value: promptTokens, color: '#06B6D4' },
                  { name: 'Completion', value: completionTokens, color: '#14B8A6' },
                  ...(cachedTokens > 0 ? [{ name: 'Cached', value: cachedTokens, color: '#6366F1' }] : []),
                  ...(reasoningTokens > 0 ? [{ name: 'Reasoning', value: reasoningTokens, color: '#8B5CF6' }] : []),
                ]}
                title="Evaluation Token Breakdown"
                valueFormatter={(value) => value.toLocaleString()}
                height={280}
              />
            </div>

            {/* Evaluation Tokens Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700 shadow-md">
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">🔵 Evaluation Tokens</h4>
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-5 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalTokens.toLocaleString()}</div>
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-300 mt-2">Total</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 p-5 rounded-lg border border-cyan-200 dark:border-cyan-700">
                  <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">{promptTokens.toLocaleString()}</div>
                  <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-300 mt-2">Prompt</div>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 p-5 rounded-lg border border-teal-200 dark:border-teal-700">
                  <div className="text-3xl font-bold text-teal-700 dark:text-teal-300">{completionTokens.toLocaleString()}</div>
                  <div className="text-sm font-semibold text-teal-900 dark:text-teal-300 mt-2">Completion</div>
                </div>
                {reasoningTokens > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-5 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{reasoningTokens.toLocaleString()}</div>
                    <div className="text-sm font-semibold text-purple-900 dark:text-purple-300 mt-2">Reasoning</div>
                  </div>
                )}
                {cachedTokens > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 p-5 rounded-lg border border-indigo-200 dark:border-indigo-700">
                    <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{cachedTokens.toLocaleString()}</div>
                    <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mt-2">Cached</div>
                  </div>
                )}
              </div>

              {/* Per-Model Breakdown */}
              {modelTokenUsage.length > 0 && (
                <div>
                  <h5 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Per-Model Usage:</h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-blue-100 dark:bg-gray-700 border-b-2 border-blue-300 dark:border-blue-700">
                          <th className="p-3 text-left text-sm font-bold text-gray-900 dark:text-gray-100">Model</th>
                          <th className="p-3 text-right text-sm font-bold text-gray-900 dark:text-gray-100">Total</th>
                          <th className="p-3 text-right text-sm font-bold text-gray-900 dark:text-gray-100">Prompt</th>
                          <th className="p-3 text-right text-sm font-bold text-gray-900 dark:text-gray-100">Completion</th>
                          <th className="p-3 text-right text-sm font-bold text-gray-900 dark:text-gray-100">Cached</th>
                          <th className="p-3 text-right text-sm font-bold text-gray-900 dark:text-gray-100">Reasoning</th>
                          <th className="p-3 text-right text-sm font-bold text-gray-900 dark:text-gray-100">Requests</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelTokenUsage.map((model: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700">
                            <td className="p-3 text-sm">
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{model.label || 'Unnamed'}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{model.modelId}</div>
                            </td>
                            <td className="p-3 text-right text-sm font-bold text-blue-700 dark:text-blue-300">
                              {model.total.toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-700 dark:text-gray-300">
                              {model.prompt.toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-700 dark:text-gray-300">
                              {model.completion.toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-700 dark:text-gray-300">
                              {model.cached > 0 ? model.cached.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-700 dark:text-gray-300">
                              {model.reasoning > 0 ? model.reasoning.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-600 dark:text-gray-400">
                              {model.numRequests}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Assertion Tokens Section */}
            {assertionTotal > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-orange-200 dark:border-orange-700 shadow-md">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">🟠 Assertion Tokens</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Tokens used by assertion evaluators (LLM-based assertions)
                </p>
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 p-5 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{assertionTotal.toLocaleString()}</div>
                    <div className="text-sm font-semibold text-orange-900 dark:text-orange-300 mt-2">Total</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-5 rounded-lg border border-amber-200 dark:border-amber-700">
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{assertionPrompt.toLocaleString()}</div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-300 mt-2">Prompt</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 p-5 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{assertionCompletion.toLocaleString()}</div>
                    <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mt-2">Completion</div>
                  </div>
                  {assertionReasoning > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-5 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{assertionReasoning.toLocaleString()}</div>
                      <div className="text-sm font-semibold text-purple-900 dark:text-purple-300 mt-2">Reasoning</div>
                    </div>
                  )}
                  {assertionCached > 0 && (
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 p-5 rounded-lg border border-indigo-200 dark:border-indigo-700">
                      <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{assertionCached.toLocaleString()}</div>
                      <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mt-2">Cached</div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* AI Comparison Tab */}
        {activeTab === 'ai-comparison' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-300 mb-2">🤖 AI-Powered Model Comparison</h3>
              <p className="text-sm text-purple-800 dark:text-purple-300 mb-4">
                Get intelligent insights and recommendations on which model performs best based on your evaluation results.
              </p>
              <button
                onClick={handleAIComparison}
                disabled={isAnalyzing}
                className="ai-analysis-button px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-semibold shadow-lg flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Results...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Start AI Analysis
                  </>
                )}
              </button>
            </div>

            {aiAnalysis && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      AI Analysis Complete
                      {isStructuredAnalysis && (
                        <span className="ml-2 px-2 py-1 bg-white/20 rounded text-xs font-normal">
                          Structured Analysis
                        </span>
                      )}
                    </h4>
                    {onApplySuggestions && !isHistoryView && (
                      <button
                        onClick={() => {
                          // Extract prompt suggestions from AI analysis (excluding data issues)
                          let suggestions: string[] = [];

                          if (typeof aiAnalysis === 'string') {
                            const lowerAnalysis = aiAnalysis.toLowerCase();
                            const isDataIssue = lowerAnalysis.includes('test data') ||
                                              lowerAnalysis.includes('test case') ||
                                              lowerAnalysis.includes('expected value');
                            if (!isDataIssue) {
                              suggestions = [aiAnalysis];
                            }
                          } else if (aiAnalysis?.prompt_improvements && Array.isArray(aiAnalysis.prompt_improvements)) {
                            // Extract only prompt-related suggestions, not test data issues
                            suggestions = aiAnalysis.prompt_improvements
                              .filter((improvement: any) => {
                                const suggestionText = (improvement.suggestion || '').toLowerCase();
                                const problemText = (improvement.problem || '').toLowerCase();
                                const isDataIssue = suggestionText.includes('test data') ||
                                                   suggestionText.includes('test case') ||
                                                   suggestionText.includes('expected value') ||
                                                   suggestionText.includes('update the \'expected\'') ||
                                                   suggestionText.includes('fix the test') ||
                                                   problemText.includes('test\'s \'expected\' answer') ||
                                                   problemText.includes('flawed test case');
                                return !isDataIssue;
                              })
                              .map((improvement: any) => improvement.suggestion);
                          } else if (aiAnalysis?.promptSuggestions) {
                            suggestions = aiAnalysis.promptSuggestions;
                          } else if (aiAnalysis?.suggestions) {
                            suggestions = aiAnalysis.suggestions;
                          }

                          if (suggestions.length > 0) {
                            logger.info('results', 'Clicked on Apply Suggestions to Prompts', {
                              suggestionsCount: suggestions.length
                            });
                            onApplySuggestions(suggestions);
                            toast.success('Navigate to Prompts tab to review suggested changes');
                          } else {
                            toast.info('No specific prompt suggestions found in the analysis. The issues appear to be related to test data, not prompts.');
                          }
                        }}
                        disabled={!hasPromptSuggestions}
                        className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 shadow-md ${
                          hasPromptSuggestions
                            ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-gray-600 cursor-pointer'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                        title={hasPromptSuggestions ? 'Apply AI suggestions to prompts' : 'No prompt suggestions available - issues may be related to test data'}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Apply Suggestions to Prompts
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {isStructuredAnalysis ? (
                    <StructuredAnalysis data={aiAnalysis} />
                  ) : (
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                        {typeof aiAnalysis === 'string' ? aiAnalysis : JSON.stringify(aiAnalysis, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!aiAnalysis && !isAnalyzing && (
              <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center">
                <div className="text-6xl mb-4">🤔</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Analysis Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Click the "Start AI Analysis" button above to get intelligent insights and recommendations
                  on which model performs best for your use case.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Raw JSON Tab */}
        {activeTab === 'raw' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Raw JSON Results</h3>
                <button
                  onClick={() => {
                    logger.info('results', 'Clicked on Copy to Clipboard on Raw JSON tab');
                    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                    toast.success('JSON copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to Clipboard
                </button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Complete evaluation results in JSON format
              </p>
            </div>
            <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-6 rounded-xl border-2 border-gray-700 dark:border-gray-600 text-sm overflow-auto font-mono shadow-lg max-h-[600px]">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Output Details Modal */}
      {selectedOutput && (
        <div
          className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center p-4 z-[60]"
          onClick={() => setSelectedOutput(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-auto border dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white p-6 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Full Output Details</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedOutput, null, 2));
                  toast.success('Output copied to clipboard!');
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-6 rounded-lg text-sm overflow-auto font-mono border border-gray-700 dark:border-gray-600">
                {JSON.stringify(selectedOutput, null, 2)}
              </pre>
              <button
                onClick={() => setSelectedOutput(null)}
                className="mt-6 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
