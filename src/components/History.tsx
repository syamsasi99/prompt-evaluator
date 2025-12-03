import React, { useState, useEffect } from 'react';
import type { HistoryItem, PromptfooResults } from '../lib/types';
import { RunResults } from './RunResults';
import { useToast } from '../contexts/ToastContext';
import { ComparisonView } from './ComparisonView';
import { compareRuns } from '../lib/comparison';
import type { ComparisonData } from '../lib/comparisonTypes';
import { logger } from '../lib/logger';

interface HistoryProps {
  projectOptions: any;
}

export function History({ projectOptions }: HistoryProps) {
  const toast = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>(''); // '' means all projects

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Load history on mount
  useEffect(() => {
    logger.info('history', 'History page loaded');
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    logger.info('history', 'Loading history data');
    try {
      // Always load from local JSON file (BigQuery data is synced to local when toggle is enabled)
      if (window.api?.getAllHistory) {
        const result = await window.api.getAllHistory();
        if (result.success && result.history) {
          logger.info('history', 'History loaded successfully', {
            totalItems: result.history.length
          });
          setHistory(result.history);
        } else {
          logger.warn('history', 'No history data found');
          setHistory([]);
        }
      }
    } catch (error: any) {
      logger.error('history', 'Failed to load history', { error: error.message });
      console.error('Error loading history:', error);
      toast.error(`Failed to load history: ${error.message}`);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Check if using BigQuery history
    const usingBigQuery = projectOptions?.bigQueryHistoryEnabled &&
                          projectOptions?.bigQueryProjectId &&
                          projectOptions?.bigQueryDatasetId &&
                          projectOptions?.bigQueryTableId;

    if (usingBigQuery) {
      logger.warn('history', 'Delete blocked: BigQuery history source is enabled', { itemId: id });
      toast.error('Cannot delete BigQuery history items from this UI. Please manage BigQuery data directly or disable BigQuery history source in Settings.');
      setShowDeleteConfirm(null);
      return;
    }

    const itemToDelete = history.find(h => h.id === id);
    logger.info('history', 'Deleting history item', {
      itemId: id,
      projectName: itemToDelete?.projectName
    });

    try {
      if (window.api?.deleteHistoryById) {
        const result = await window.api.deleteHistoryById(id);
        if (result.success) {
          logger.info('history', 'History item deleted successfully', { itemId: id });
          toast.success('History item deleted');
          await loadHistory();
          if (selectedItem?.id === id) {
            setSelectedItem(null);
          }
        } else {
          logger.error('history', 'Failed to delete history item', {
            itemId: id,
            error: result.error
          });
          toast.error(`Failed to delete: ${result.error}`);
        }
      }
    } catch (error: any) {
      logger.error('history', 'Error deleting history item', {
        itemId: id,
        error: error.message
      });
      toast.error(`Error deleting history: ${error.message}`);
    }
    setShowDeleteConfirm(null);
  };

  const handleDeleteAllClick = () => {
    // Check if using BigQuery history
    const usingBigQuery = projectOptions?.bigQueryHistoryEnabled &&
                          projectOptions?.bigQueryProjectId &&
                          projectOptions?.bigQueryDatasetId &&
                          projectOptions?.bigQueryTableId;

    if (usingBigQuery) {
      logger.warn('history', 'Delete all blocked: BigQuery history source is enabled');
      toast.error('Cannot delete BigQuery history from this UI. Please manage BigQuery data directly or disable BigQuery history source in Settings.');
      return;
    }

    setShowDeleteAllConfirm(true);
  };

  const handleClearAll = async () => {
    logger.info('history', 'Clearing all history', { totalItems: history.length });

    try {
      if (window.api?.clearAllHistory) {
        const result = await window.api.clearAllHistory();
        if (result.success) {
          logger.info('history', 'All history cleared successfully');
          toast.success('All history cleared');
          setHistory([]);
          setSelectedItem(null);
        } else {
          logger.error('history', 'Failed to clear all history', { error: result.error });
          toast.error(`Failed to clear history: ${result.error}`);
        }
      }
    } catch (error: any) {
      logger.error('history', 'Error clearing all history', { error: error.message });
      toast.error(`Error clearing history: ${error.message}`);
    } finally {
      setShowDeleteAllConfirm(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (latencyMs: number) => {
    if (latencyMs < 1000) {
      return `${Math.round(latencyMs)}ms`;
    }
    return `${(latencyMs / 1000).toFixed(1)}s`;
  };

  // Check if using BigQuery history
  const usingBigQuery = projectOptions?.bigQueryHistoryEnabled &&
                        projectOptions?.bigQueryProjectId &&
                        projectOptions?.bigQueryDatasetId &&
                        projectOptions?.bigQueryTableId;

  // Get unique project names for filter dropdown
  const uniqueProjects = React.useMemo(() => {
    const projects = new Set(history.map(item => item.projectName));
    return Array.from(projects).sort();
  }, [history]);

  // Filter and sort history
  const filteredAndSortedHistory = React.useMemo(() => {
    let filtered = history;

    // Apply project name filter
    if (selectedProject) {
      filtered = filtered.filter(item => item.projectName === selectedProject);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.projectName.toLowerCase().includes(query) ||
        formatDate(item.timestamp).toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate <= toDate;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else { // name
        return a.projectName.localeCompare(b.projectName);
      }
    });

    return sorted;
  }, [history, selectedProject, searchQuery, sortBy, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedHistory.length / itemsPerPage);
  const paginatedHistory = filteredAndSortedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search, sort, date, or project filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, dateFrom, dateTo, selectedProject]);

  // Helper functions with logging
  const handleSearchChange = (query: string) => {
    logger.info('history', 'Search query changed', {
      query: query || '(cleared)',
      resettingSelection: selectedForComparison.size > 0
    });
    setSearchQuery(query);
    // Reset comparison selection when filter changes
    if (selectedForComparison.size > 0) {
      logger.info('history', 'Comparison selection reset due to search change');
      setSelectedForComparison(new Set());
    }
  };

  const handleSortChange = (sort: 'newest' | 'oldest' | 'name') => {
    logger.info('history', 'Sort changed', {
      sortBy: sort,
      resettingSelection: selectedForComparison.size > 0
    });
    setSortBy(sort);
    // Reset comparison selection when sort changes
    if (selectedForComparison.size > 0) {
      logger.info('history', 'Comparison selection reset due to sort change');
      setSelectedForComparison(new Set());
    }
  };

  const handleProjectFilterChange = (project: string) => {
    logger.info('history', 'Project filter changed', {
      project: project || 'All Projects',
      resettingSelection: selectedForComparison.size > 0
    });
    setSelectedProject(project);
    // Reset comparison selection when filter changes
    if (selectedForComparison.size > 0) {
      logger.info('history', 'Comparison selection reset due to filter change', {
        previouslySelected: selectedForComparison.size
      });
      setSelectedForComparison(new Set());
    }
  };

  const handleDateFromChange = (date: string) => {
    logger.info('history', 'Date from filter changed', {
      dateFrom: date || '(cleared)',
      resettingSelection: selectedForComparison.size > 0
    });
    setDateFrom(date);
    // Reset comparison selection when filter changes
    if (selectedForComparison.size > 0) {
      logger.info('history', 'Comparison selection reset due to date filter change');
      setSelectedForComparison(new Set());
    }
  };

  const handleDateToChange = (date: string) => {
    logger.info('history', 'Date to filter changed', {
      dateTo: date || '(cleared)',
      resettingSelection: selectedForComparison.size > 0
    });
    setDateTo(date);
    // Reset comparison selection when filter changes
    if (selectedForComparison.size > 0) {
      logger.info('history', 'Comparison selection reset due to date filter change');
      setSelectedForComparison(new Set());
    }
  };

  const handleClearDateFilters = () => {
    logger.info('history', 'Date filters cleared', {
      resettingSelection: selectedForComparison.size > 0
    });
    setDateFrom('');
    setDateTo('');
    // Reset comparison selection when filter changes
    if (selectedForComparison.size > 0) {
      logger.info('history', 'Comparison selection reset due to date filter clear');
      setSelectedForComparison(new Set());
    }
  };

  const handleClearAllFilters = () => {
    logger.info('history', 'All filters cleared', {
      hadSearch: !!searchQuery,
      hadDateFrom: !!dateFrom,
      hadDateTo: !!dateTo,
      resettingSelection: selectedForComparison.size > 0
    });
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    // Reset comparison selection when all filters cleared
    if (selectedForComparison.size > 0) {
      logger.info('history', 'Comparison selection reset due to clear all filters');
      setSelectedForComparison(new Set());
    }
  };

  const handlePageChange = (page: number) => {
    logger.info('history', 'Page changed', { page, totalPages });
    setCurrentPage(page);
  };

  // Toggle comparison mode selection for an item
  const toggleComparisonSelection = (itemId: string) => {
    const item = history.find(h => h.id === itemId);
    setSelectedForComparison((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        logger.info('history', 'Item deselected for comparison', {
          itemId,
          projectName: item?.projectName,
          selectedCount: newSet.size - 1
        });
        newSet.delete(itemId);
      } else {
        // Max 2 items
        if (newSet.size >= 2) {
          logger.warn('history', 'Cannot select more than 2 items for comparison', {
            currentCount: newSet.size
          });
          toast.error('You can only compare up to 2 runs');
          return prev;
        }
        logger.info('history', 'Item selected for comparison', {
          itemId,
          projectName: item?.projectName,
          selectedCount: newSet.size + 1
        });
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle compare button click
  const handleCompare = async () => {
    const selectedItems = history.filter((item) => selectedForComparison.has(item.id));

    logger.info('history', 'Compare button clicked', {
      selectedCount: selectedItems.length,
      itemIds: selectedItems.map(i => i.id)
    });

    if (selectedItems.length < 2 || selectedItems.length > 3) {
      logger.warn('history', 'Invalid number of items selected for comparison', {
        selectedCount: selectedItems.length
      });
      toast.error('Please select 2-3 runs to compare');
      return;
    }

    // Validate all items are from the same project
    const projects = new Set(selectedItems.map((item) => item.projectName));
    if (projects.size > 1) {
      logger.warn('history', 'Cannot compare runs from different projects', {
        projects: Array.from(projects)
      });
      toast.error('All selected runs must be from the same project');
      return;
    }

    // All items now have full results (BigQuery data is synced to local JSON)
    try {
      // Generate comparison data directly from selected items
      const comparison = compareRuns(selectedItems);
      logger.info('history', 'Comparison generated successfully', {
        selectedCount: selectedItems.length,
        projectName: selectedItems[0].projectName
      });
      setComparisonData(comparison);
    } catch (error: any) {
      logger.error('history', 'Failed to generate comparison', {
        error: error.message,
        selectedCount: selectedItems.length
      });
      toast.error(`Failed to compare runs: ${error.message}`);
    }
  };

  // Exit comparison mode
  const exitComparisonMode = () => {
    logger.info('history', 'Exited comparison mode', {
      selectedCount: selectedForComparison.size
    });
    setComparisonMode(false);
    setSelectedForComparison(new Set());
  };

  // Exit comparison view
  const exitComparisonView = () => {
    logger.info('history', 'Exited comparison view');
    setComparisonData(null);
  };

  // Handle selecting a history item - all items now have full results (BigQuery synced to local)
  const handleSelectItem = async (item: HistoryItem) => {
    logger.info('history', 'History item selected for viewing', {
      itemId: item.id,
      projectName: item.projectName,
      timestamp: item.timestamp,
      totalTests: item.stats.totalTests
    });
    setSelectedItem(item);
  };

  const handleBackToHistory = () => {
    logger.info('history', 'Returned to history list from detail view');
    setSelectedItem(null);
  };

  const handleToggleComparisonMode = () => {
    if (comparisonMode) {
      exitComparisonMode();
    } else {
      logger.info('history', 'Entered comparison mode');
      setComparisonMode(true);
    }
  };

  // Show comparison view if comparison data is set
  if (comparisonData) {
    return (
      <div className="h-full flex flex-col">
        <ComparisonView
          comparisonData={comparisonData}
          onBack={exitComparisonView}
        />
      </div>
    );
  }

  if (selectedItem) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleBackToHistory}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to History
          </button>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedItem.projectName} - {formatDate(selectedItem.timestamp)}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <RunResults
            results={selectedItem.results}
            onClose={() => setSelectedItem(null)}
            onRefresh={async () => selectedItem.results}
            projectOptions={projectOptions}
            isHistoryView={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Evaluation History</h2>
              {usingBigQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  BigQuery Source
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredAndSortedHistory.length} of {history.length} {history.length === 1 ? 'result' : 'results'}
              {selectedProject && ` for project "${selectedProject}"`}
              {searchQuery && ` matching "${searchQuery}"`}
              {usingBigQuery && ' (read-only)'}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Comparison Mode Toggle */}
            {history.length >= 2 && (
              <button
                onClick={handleToggleComparisonMode}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  comparisonMode
                    ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800'
                    : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {comparisonMode ? 'Exit Compare Mode' : 'Compare Runs'}
              </button>
            )}

            {/* Compare Selected Button (only shown when items selected) */}
            {comparisonMode && selectedForComparison.size >= 2 && (
              <button
                onClick={handleCompare}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 border border-blue-600 dark:border-blue-700 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Compare Selected ({selectedForComparison.size})
              </button>
            )}

            {/* Delete All Button */}
            {history.length > 0 && !usingBigQuery && (
              <button
                onClick={handleDeleteAllClick}
                className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-3 items-center justify-between">
              <div className="flex gap-3 items-center flex-1">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by project name..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Project Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedProject}
                    onChange={(e) => handleProjectFilterChange(e.target.value)}
                    className="pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer"
                  >
                    <option value="">All Projects</option>
                    {uniqueProjects.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as 'newest' | 'oldest' | 'name')}
                    className="pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Pagination Controls - Top Right */}
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and nearby pages
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-3 py-1 text-sm text-gray-400 dark:text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Date Range:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="From"
                />
                <span className="text-gray-400 dark:text-gray-500">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="To"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={handleClearDateFilters}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Summary */}
            {(searchQuery || dateFrom || dateTo) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                    Search: "{searchQuery}"
                    <button onClick={() => handleSearchChange('')} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {dateFrom && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                    From: {new Date(dateFrom).toLocaleDateString()}
                    <button onClick={() => handleDateFromChange('')} className="hover:text-purple-900 dark:hover:text-purple-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {dateTo && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                    To: {new Date(dateTo).toLocaleDateString()}
                    <button onClick={() => handleDateToChange('')} className="hover:text-purple-900 dark:hover:text-purple-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearAllFilters}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
            </div>
          </div>
        ) : filteredAndSortedHistory.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">{searchQuery ? '🔍' : '📜'}</div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {searchQuery ? 'No Results Found' : 'No History Yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery
                  ? `No evaluations match "${searchQuery}"`
                  : 'Run your first evaluation to start building your test history'}
              </p>
              {!searchQuery && projectOptions?.bigQueryHistoryEnabled && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
                    💡 <strong>Restore from BigQuery:</strong> Go to Settings → BigQuery Integration and click "Sync Now from BigQuery" to restore your evaluation history.
                  </p>
                </div>
              )}
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedHistory.map((item) => {
                const isSelected = selectedForComparison.has(item.id);
                return (
              <div
                key={item.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border transition-all overflow-hidden group ${
                  comparisonMode
                    ? isSelected
                      ? 'border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-200 dark:ring-blue-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer'
                }`}
                onClick={() => {
                  if (comparisonMode) {
                    toggleComparisonSelection(item.id);
                  } else {
                    handleSelectItem(item);
                  }
                }}
              >
                {/* Card Header */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      {/* Checkbox for comparison mode */}
                      {comparisonMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleComparisonSelection(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.projectName}
                      </h3>
                    </div>
                    {/* Delete button */}
                    {!usingBigQuery && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(item.id);
                        }}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete this result"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDate(item.timestamp)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tests</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {item.stats.totalTests}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pass Rate</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {item.stats.totalTests > 0
                          ? Math.round((item.stats.passed / item.stats.totalTests) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Score</div>
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {item.stats.avgScore.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</div>
                      <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                        {formatDuration(item.stats.totalLatency)}
                      </div>
                    </div>
                  </div>

                  {/* Pass/Fail Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{item.stats.passed} passed</span>
                      <span>{item.stats.failed} failed</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 dark:bg-green-600 h-2 transition-all"
                        style={{
                          width: `${item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* View Details / Select Overlay */}
                <div className={`px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center transition-colors ${
                  comparisonMode
                    ? isSelected
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'bg-gray-50 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900'
                    : 'bg-gray-50 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900'
                }`}>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {comparisonMode
                      ? isSelected
                        ? '✓ Selected for Comparison'
                        : 'Click to Select'
                      : 'View Details →'}
                  </span>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm === item.id && (
                  <div
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(null);
                    }}
                  >
                    <div
                      className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl border border-gray-200 dark:border-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete History Item?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Are you sure you want to delete "{item.projectName}"? This action cannot be undone.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(null);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 rounded-lg hover:bg-red-700 dark:hover:bg-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
                );
              })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedHistory.length)} of {filteredAndSortedHistory.length} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, current, and nearby pages
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const prevPage = array[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="px-3 py-1 text-sm text-gray-400 dark:text-gray-500">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowDeleteAllConfirm(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete All History?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to delete <strong>all {history.length} history items</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-6 font-medium">
              This action cannot be undone and will only delete local history data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
