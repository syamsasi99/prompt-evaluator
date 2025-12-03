import React from 'react';
import type { Regression } from '../../lib/dashboardUtils';

interface AlertsWidgetProps {
  regressions: Regression[];
}

export function AlertsWidget({ regressions }: AlertsWidgetProps) {
  if (regressions.length === 0) {
    return null; // Don't show widget if no alerts
  }

  const severityColors = {
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🚨' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '⚠️' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'ℹ️' },
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Alerts
      </h3>

      <div className="space-y-3">
        {regressions.map((regression, index) => {
          const colors = severityColors[regression.severity];
          return (
            <div
              key={index}
              className={`${colors.bg} border ${colors.border} rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{colors.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${colors.text}`}>{regression.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <span className="font-semibold capitalize">{regression.severity} severity</span>
                    <span>•</span>
                    <span>Type: {regression.type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
