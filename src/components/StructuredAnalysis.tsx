import React from 'react';

interface FailureDetail {
  test_id: string;
  input_hint: string;
  expected_hint: string;
  observed_hint: string;
  reason: string;
  score: number | null;
}

interface ModelFailures {
  model: string;
  failed_count: number;
  total_count: number;
  failures: FailureDetail[];
}

interface RCACluster {
  label: string;
  symptoms: string[];
  likely_cause: string;
  evidence_test_ids: string[];
  models_affected: string[];
  recommended_fixes: string[];
}

interface PromptImprovement {
  title: string;
  problem: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  expected_impact: string;
}

interface ModelMetrics {
  model: string;
  pass_rate: number;
  avg_score: number | null;
  weighted_score: number | null;
  stability: number;
  severe_failures: number;
  latency_ms_avg: number | null;
  cost_usd_estimate: number | null;
}

interface AnalysisData {
  summary: {
    total_tests: number;
    models: string[];
    multi_model: boolean;
  };
  failed_tests_by_model: ModelFailures[];
  cross_model_rca: {
    clusters: RCACluster[];
    notes: string;
  };
  model_comparison: {
    per_model_metrics: ModelMetrics[];
    best_model: {
      model: string | null;
      justification: string | null;
    };
  };
  prompt_improvements?: PromptImprovement[];
}

interface StructuredAnalysisProps {
  data: AnalysisData;
}

export function StructuredAnalysis({ data }: StructuredAnalysisProps) {
  const [expandedModels, setExpandedModels] = React.useState<Set<string>>(new Set());
  const [expandedClusters, setExpandedClusters] = React.useState<Set<string>>(new Set());

  // Helper function to get friendly model display name
  const getModelDisplayName = (model: string) => {
    // Extract the model name after the colon
    const parts = model.split(':');
    if (parts.length > 1) {
      const modelName = parts[1];
      // Convert to title case and clean up
      return modelName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return model;
  };

  const toggleModel = (model: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(model)) {
      newExpanded.delete(model);
    } else {
      newExpanded.add(model);
    }
    setExpandedModels(newExpanded);
  };

  const toggleCluster = (label: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedClusters(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4">Analysis Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tests</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.summary.total_tests}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Models Tested</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.summary.models.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Multi-Model</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {data.summary.multi_model ? '✓' : '✗'}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 font-semibold mb-2">Models:</div>
          <div className="flex flex-wrap gap-2">
            {data.summary.models.map((model) => (
              <span
                key={model}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
              >
                {getModelDisplayName(model)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Best Model Recommendation */}
      {data.model_comparison.best_model.model && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 shadow-sm">
          <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Best Model Recommendation
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mt-4">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {getModelDisplayName(data.model_comparison.best_model.model)}
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {data.model_comparison.best_model.justification}
            </div>
          </div>
        </div>
      )}

      {/* Model Metrics Comparison */}
      <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Model Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Model</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Pass Rate</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Avg Score</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Severe Failures</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Latency (ms)</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Est. Cost ($)</th>
              </tr>
            </thead>
            <tbody>
              {data.model_comparison.per_model_metrics.map((metric, idx) => (
                <tr key={metric.model} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{getModelDisplayName(metric.model)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${metric.pass_rate >= 0.8 ? 'text-green-600 dark:text-green-400' : metric.pass_rate >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(metric.pass_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {metric.avg_score !== null ? metric.avg_score.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{metric.severe_failures}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {metric.latency_ms_avg !== null ? Math.round(metric.latency_ms_avg) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {metric.cost_usd_estimate !== null ? metric.cost_usd_estimate.toFixed(4) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Results Summary */}
      <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Test Results Summary</h3>
        <div className="space-y-4">
          {data.failed_tests_by_model.map((modelData) => (
            <div key={modelData.model} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleModel(modelData.model)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{getModelDisplayName(modelData.model)}</span>
                  {modelData.failed_count === 0 ? (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                      All Passed ({modelData.total_count}/{modelData.total_count})
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                      {modelData.failed_count} / {modelData.total_count} failed
                    </span>
                  )}
                </div>
                <svg
                  className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform ${expandedModels.has(modelData.model) ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedModels.has(modelData.model) && (
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  {modelData.failures.length === 0 ? (
                    <div className="text-green-600 dark:text-green-400 font-medium">No failures - All tests passed!</div>
                  ) : (
                    <div className="space-y-3">
                      {modelData.failures.map((failure, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Test ID</div>
                              <div className="text-sm text-gray-900 dark:text-gray-100">{failure.test_id}</div>
                            </div>
                            {failure.score !== null && (
                              <div>
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Score</div>
                                <div className="text-sm text-red-600 dark:text-red-400 font-bold">{failure.score.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Input</div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                                {failure.input_hint}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Expected</div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                                {failure.expected_hint}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Observed</div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                                {failure.observed_hint}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Reason</div>
                              <div className="text-sm text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
                                {failure.reason}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Root Cause Analysis */}
      {data.cross_model_rca.clusters.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Common Issues & Recommendations</h3>
          {data.cross_model_rca.notes && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="text-sm text-blue-900 dark:text-blue-200 font-medium">{data.cross_model_rca.notes}</div>
            </div>
          )}
        <div className="space-y-4">
          {data.cross_model_rca.clusters.map((cluster, idx) => (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCluster(cluster.label)}
                className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-purple-900 dark:text-purple-200">{cluster.label}</span>
                  <span className="px-3 py-1 bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
                    {cluster.models_affected.length} model{cluster.models_affected.length !== 1 ? 's' : ''} affected
                  </span>
                </div>
                <svg
                  className={`h-5 w-5 text-purple-600 dark:text-purple-400 transition-transform ${expandedClusters.has(cluster.label) ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedClusters.has(cluster.label) && (
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Symptoms</div>
                    <ul className="list-disc list-inside space-y-1">
                      {cluster.symptoms.map((symptom, i) => (
                        <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{symptom}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Likely Cause</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                      {cluster.likely_cause}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Evidence (Test IDs)</div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.evidence_test_ids.map((testId) => (
                        <span key={testId} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">
                          {testId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Affected Models</div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.models_affected.map((model) => (
                        <span key={model} className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                          {getModelDisplayName(model)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recommended Fixes</div>
                    <ul className="list-disc list-inside space-y-1">
                      {cluster.recommended_fixes.map((fix, i) => (
                        <li key={i} className="text-sm text-green-700 dark:text-green-400 font-medium">{fix}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Prompt Improvement Recommendations */}
      {data.prompt_improvements && data.prompt_improvements.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Prompt Improvement Recommendations</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Based on test failures, here are specific suggestions to improve your prompts:
          </p>

          <div className="space-y-4">
            {data.prompt_improvements.map((improvement, index) => {
              const priorityColors = {
                high: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300',
                medium: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300',
                low: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
              };
              const priorityIcons = {
                high: '🔴',
                medium: '🟡',
                low: '🔵'
              };

              return (
                <div key={index} className="border-l-4 border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-r-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{improvement.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${priorityColors[improvement.priority]}`}>
                      {priorityIcons[improvement.priority]} {improvement.priority.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Problem</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{improvement.problem}</p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Suggested Change</div>
                      <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded p-3 font-mono text-sm text-blue-900 dark:text-blue-200">
                        {improvement.suggestion}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Expected Impact</div>
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {improvement.expected_impact}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
