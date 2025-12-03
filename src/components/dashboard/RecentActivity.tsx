import React from 'react';
import type { HistoryItem } from '../../lib/types';

interface RecentActivityProps {
  evaluations: HistoryItem[];
  onViewDetails: (item: HistoryItem) => void;
}

export function RecentActivity({ evaluations, onViewDetails }: RecentActivityProps) {
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return then.toLocaleDateString();
  };

  const getStatusIcon = (item: HistoryItem) => {
    const passRate = item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0;
    if (passRate >= 90) return { icon: '✅', color: 'text-green-600', bg: 'bg-green-50' };
    if (passRate >= 70) return { icon: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { icon: '❌', color: 'text-red-600', bg: 'bg-red-50' };
  };

  if (evaluations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Evaluations</h3>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No evaluations yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Run your first evaluation to see results here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Evaluations</h3>
      <div className="space-y-3">
        {evaluations.map((item) => {
          const status = getStatusIcon(item);
          const passRate = item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0;

          return (
            <div
              key={item.id}
              onClick={() => onViewDetails(item)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
            >
              {/* Status Icon */}
              <div className={`flex-shrink-0 w-10 h-10 ${status.bg} dark:bg-opacity-20 rounded-lg flex items-center justify-center text-xl`}>
                {status.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.projectName}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className={status.color}>{passRate.toFixed(0)}% pass rate</span>
                  <span>•</span>
                  <span>{item.stats.totalTests} tests</span>
                </div>
              </div>

              {/* Time */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(item.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
