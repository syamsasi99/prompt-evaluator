import React from 'react';
import type { FailingTest } from '../../lib/dashboardUtils';

interface TopFailuresWidgetProps {
  failures: FailingTest[];
}

export function TopFailuresWidget({ failures }: TopFailuresWidgetProps) {
  if (failures.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Top Failing Tests
        </h3>
        <div className="text-center py-8">
          <p className="text-green-600 dark:text-green-400 font-medium text-sm">🎉 No failing tests!</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">All your tests are passing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Top Failing Tests
      </h3>

      <div className="space-y-3">
        {failures.map((failure, index) => (
          <div key={index} className="border border-red-100 dark:border-red-900/30 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{failure.promptLabel}</p>
                {failure.variablesSummary && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{failure.variablesSummary}</p>
                )}
              </div>
              <span className="flex-shrink-0 ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded">
                {failure.failureRate.toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>Failed {failure.failureCount}/{failure.totalRuns} runs</span>
              <span>•</span>
              <span>Last: {new Date(failure.lastFailedAt).toLocaleDateString()}</span>
            </div>

            {/* Visual bar */}
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-red-500 dark:bg-red-600 h-2 rounded-full transition-all"
                style={{ width: `${failure.failureRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
