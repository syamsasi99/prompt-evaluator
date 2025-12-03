import React, { useState, useEffect, useMemo } from 'react';
import type { HistoryItem, ProjectOptions } from '../lib/types';
import {
  calculateAggregateStats,
  getRecentEvaluations,
  getTrendData,
  getTopFailingTests,
  detectRegressions,
  compareProjects,
} from '../lib/dashboardUtils';
import { MetricCard } from './dashboard/MetricCard';
import { RecentActivity } from './dashboard/RecentActivity';
import { MiniChart } from './dashboard/MiniChart';
import { TopFailuresWidget } from './dashboard/TopFailuresWidget';
import { QuickActionsPanel } from './dashboard/QuickActionsPanel';
import { ProjectComparisonWidget } from './dashboard/ProjectComparisonWidget';
import { TrendLineChart, MultiLineChart } from './charts';
import { useToast } from '../contexts/ToastContext';
import { logger } from '../lib/logger';

interface DashboardProps {
  onNavigate: (tab: 'providers' | 'prompts' | 'dataset' | 'assertions' | 'settings' | 'results' | 'history') => void;
  projectOptions: ProjectOptions;
  onReRunLastEvaluation: () => void;
}

export function Dashboard({ onNavigate, projectOptions, onReRunLastEvaluation }: DashboardProps) {
  const toast = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<7 | 30 | 90>(7);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  // Load history on mount
  useEffect(() => {
    logger.info('dashboard', 'Dashboard loaded');
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      if (window.api?.getAllHistory) {
        const result = await window.api.getAllHistory();
        if (result.success && result.history) {
          logger.info('dashboard', 'History loaded for dashboard', {
            totalItems: result.history.length,
          });
          setHistory(result.history);
        } else {
          setHistory([]);
        }
      }
    } catch (error: any) {
      logger.error('dashboard', 'Failed to load history', { error: error.message });
      toast.error(`Failed to load dashboard data: ${error.message}`);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter history by selected project
  const filteredHistory = useMemo(() => {
    if (selectedProject === 'all') {
      return history;
    }
    return history.filter(item => item.projectName === selectedProject);
  }, [history, selectedProject]);

  // Get unique project names for filter
  const projectNames = useMemo(() => {
    const names = [...new Set(history.map(item => item.projectName))].filter(Boolean);
    return names.sort();
  }, [history]);

  // Calculate dashboard data
  const dashboardData = useMemo(() => {
    const stats = calculateAggregateStats(filteredHistory);
    const recentEvals = getRecentEvaluations(filteredHistory, 10);
    const trendData = getTrendData(filteredHistory, timePeriod);
    const topFailures = getTopFailingTests(filteredHistory, 5);
    const regressions = detectRegressions(filteredHistory);
    const projects = compareProjects(history); // Always show all projects in comparison

    // Prepare chart data from filtered history
    const sortedByDate = [...filteredHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const chartData = {
      passRateTrend: sortedByDate.map((item) => ({
        timestamp: item.timestamp,
        value: item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0,
      })),
      multiMetricTrend: sortedByDate.map((item) => ({
        timestamp: item.timestamp,
        passRate: item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0,
        avgScore: item.stats.avgScore * 100,
        cost: item.stats.totalCost,
      })),
      costTrend: sortedByDate.map((item) => ({
        timestamp: item.timestamp,
        value: item.stats.totalCost,
      })),
      tokenTrend: sortedByDate.map((item) => {
        const tokenUsage = item.results?.results?.stats?.tokenUsage?.total ||
                          item.results?.stats?.tokenUsage?.total ||
                          0;
        return {
          timestamp: item.timestamp,
          value: tokenUsage,
        };
      }),
    };

    return {
      stats,
      recentEvals,
      trendData,
      topFailures,
      regressions,
      projects,
      chartData,
    };
  }, [filteredHistory, history, timePeriod]);

  // Handle viewing evaluation details
  const handleViewDetails = (item: HistoryItem) => {
    logger.info('dashboard', 'Navigating to history from dashboard', {
      itemId: item.id,
      projectName: item.projectName,
    });
    onNavigate('history');
    // Note: The History component will need to handle selecting this item
  };

  // Empty state for new users
  if (!isLoading && history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome to Your Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your evaluation insights will appear here once you run your first test. Get started by
            configuring your prompts and running an evaluation!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onNavigate('prompts')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Prompts
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { stats, recentEvals, trendData, topFailures, regressions, projects, chartData } = dashboardData;

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Overview of your evaluation performance and insights
              {selectedProject !== 'all' && (
                <span className="ml-2 text-blue-600 font-medium">
                  • {selectedProject}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Filter */}
            {projectNames.length > 0 && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Projects</option>
                {projectNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            {/* Time Period Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-1">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimePeriod(days as 7 | 30 | 90)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timePeriod === days
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Evaluations"
            value={stats.totalEvaluations}
            subtitle={`Across ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            color="blue"
            onClick={() => onNavigate('history')}
            infoText="Total number of evaluation runs stored in local history. The system keeps the most recent 500 evaluations. Older evaluations are automatically removed. Click to view full history."
          />

          <MetricCard
            title="Avg Pass Rate"
            value={`${stats.avgPassRate.toFixed(1)}%`}
            subtitle={`${stats.totalTests} total tests`}
            trend={stats.passRateTrend}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="green"
            infoText="Average percentage of tests that passed across all evaluations. Calculated from all assertions in your test cases. Higher is better. Trend shows change compared to previous period."
          />

          <MetricCard
            title="Total Cost"
            value={`$${stats.totalCost.toFixed(4)}`}
            subtitle="All evaluations"
            trend={stats.costTrend}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="orange"
            infoText="Cumulative cost of all LLM API calls across all evaluations. Based on token usage and model pricing. Includes prompt and completion tokens. Trend shows cost change over time."
          />

          <MetricCard
            title="Avg Score"
            value={`${stats.avgScore.toFixed(1)}%`}
            subtitle="Quality metric"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            }
            color="purple"
            infoText="Average quality score across all test assertions. Combines pass/fail results with weighted scores from LLM-based rubric assertions. Scale: 0-100%, higher indicates better quality."
          />
        </div>

        {/* Trend Charts */}
        {filteredHistory.length >= 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Trends</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pass Rate Trend */}
              <TrendLineChart
                data={chartData.passRateTrend}
                title="Pass Rate Trend"
                yAxisLabel="Pass Rate (%)"
                color="#10B981"
                valueFormatter={(value) => `${value.toFixed(1)}%`}
                height={250}
              />

              {/* Multi-Metric Trend */}
              <MultiLineChart
                data={chartData.multiMetricTrend}
                series={[
                  { key: 'passRate', name: 'Pass Rate (%)', color: '#10B981' },
                  { key: 'avgScore', name: 'Avg Score (%)', color: '#3B82F6' },
                ]}
                title="Multi-Metric Comparison"
                yAxisLabel="Percentage (%)"
                height={250}
              />

              {/* Cost Trend */}
              <TrendLineChart
                data={chartData.costTrend}
                title="Cost Trend"
                yAxisLabel="Total Cost ($)"
                color="#F59E0B"
                valueFormatter={(value) => `$${value.toFixed(4)}`}
                height={250}
              />

              {/* Token Usage Trend */}
              <TrendLineChart
                data={chartData.tokenTrend}
                title="Token Usage Trend"
                yAxisLabel="Total Tokens"
                color="#8B5CF6"
                valueFormatter={(value) => value.toLocaleString()}
                height={250}
              />
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Activity (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <RecentActivity evaluations={recentEvals} onViewDetails={handleViewDetails} />
            {topFailures.length > 0 && <TopFailuresWidget failures={topFailures} />}
          </div>

          {/* Right Column - Sidebar (1/3 width) */}
          <div className="space-y-6">
            <QuickActionsPanel
              onReRunLast={onReRunLastEvaluation}
              onViewHistory={() => onNavigate('history')}
              onCompareRuns={() => onNavigate('history')}
              hasHistory={history.length > 0}
            />

            {projects.length > 1 && <ProjectComparisonWidget projects={projects} />}
          </div>
        </div>
      </div>
    </div>
  );
}
