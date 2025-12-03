import React from 'react';
import type { ProjectComparison } from '../../lib/dashboardUtils';

interface ProjectComparisonWidgetProps {
  projects: ProjectComparison[];
}

export function ProjectComparisonWidget({ projects }: ProjectComparisonWidgetProps) {
  if (projects.length <= 1) {
    return null; // Don't show if only one project
  }

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        Project Comparison
      </h3>

      <div className="space-y-3">
        {projects.map((project, index) => {
          const passRateColor =
            project.avgPassRate >= 90
              ? 'bg-green-500 dark:bg-green-600'
              : project.avgPassRate >= 70
              ? 'bg-yellow-500 dark:bg-yellow-600'
              : 'bg-red-500 dark:bg-red-600';

          return (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{project.projectName}</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">{project.evaluationCount} runs</span>
              </div>

              {/* Pass Rate Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                  <span>Pass Rate</span>
                  <span className="font-semibold">{project.avgPassRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${passRateColor} h-2 rounded-full transition-all`}
                    style={{ width: `${project.avgPassRate}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Tests</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{project.totalTests}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Cost</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">${project.totalCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Last Run</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{formatTimeAgo(project.lastRunAt)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
