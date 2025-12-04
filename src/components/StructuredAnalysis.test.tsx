import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StructuredAnalysis } from './StructuredAnalysis';

// Mock data
const mockAnalysisData = {
  summary: {
    total_tests: 50,
    models: ['openai:gpt-4', 'anthropic:claude-3-opus'],
    multi_model: true,
  },
  failed_tests_by_model: [
    {
      model: 'openai:gpt-4',
      failed_count: 5,
      total_count: 25,
      failures: [
        {
          test_id: 'test-1',
          input_hint: 'What is the capital of France?',
          expected_hint: 'Paris',
          observed_hint: 'Lyon',
          reason: 'Incorrect factual answer',
          score: 0.3,
        },
        {
          test_id: 'test-2',
          input_hint: 'Calculate 2+2',
          expected_hint: '4',
          observed_hint: '5',
          reason: 'Math error',
          score: 0.0,
        },
      ],
    },
    {
      model: 'anthropic:claude-3-opus',
      failed_count: 0,
      total_count: 25,
      failures: [],
    },
  ],
  cross_model_rca: {
    clusters: [
      {
        label: 'Factual Accuracy Issues',
        symptoms: ['Incorrect facts', 'Outdated information'],
        likely_cause: 'Training data cutoff or hallucination',
        evidence_test_ids: ['test-1', 'test-3'],
        models_affected: ['openai:gpt-4'],
        recommended_fixes: [
          'Add fact-checking step',
          'Include source requirements',
          'Update prompt with current date context',
        ],
      },
      {
        label: 'Math Calculation Errors',
        symptoms: ['Wrong arithmetic', 'Off-by-one errors'],
        likely_cause: 'Model weakness in numerical reasoning',
        evidence_test_ids: ['test-2'],
        models_affected: ['openai:gpt-4', 'anthropic:claude-3-opus'],
        recommended_fixes: [
          'Use code interpreter for calculations',
          'Add verification step',
        ],
      },
    ],
    notes: 'Multiple systematic issues identified across models',
  },
  model_comparison: {
    per_model_metrics: [
      {
        model: 'openai:gpt-4',
        pass_rate: 0.8,
        avg_score: 0.85,
        weighted_score: 0.82,
        stability: 0.9,
        severe_failures: 2,
        latency_ms_avg: 1250,
        cost_usd_estimate: 0.05,
      },
      {
        model: 'anthropic:claude-3-opus',
        pass_rate: 1.0,
        avg_score: 0.95,
        weighted_score: 0.94,
        stability: 0.98,
        severe_failures: 0,
        latency_ms_avg: 1100,
        cost_usd_estimate: 0.06,
      },
    ],
    best_model: {
      model: 'anthropic:claude-3-opus',
      justification: 'Claude 3 Opus achieved 100% pass rate with higher average scores and better stability, despite slightly higher cost.',
    },
  },
  prompt_improvements: [
    {
      title: 'Add Explicit Fact-Checking Instruction',
      problem: 'Model provides incorrect factual information without verification',
      suggestion: 'Add: "Before answering, verify all factual claims are accurate and up-to-date."',
      priority: 'high' as const,
      expected_impact: 'Should reduce factual errors by 60-80%',
    },
    {
      title: 'Specify Output Format',
      problem: 'Inconsistent response formatting',
      suggestion: 'Add: "Always respond in JSON format with keys: answer, confidence, sources."',
      priority: 'medium' as const,
      expected_impact: 'Will improve output consistency and parseability',
    },
    {
      title: 'Add Context About Current Date',
      problem: 'Model may not have current information',
      suggestion: 'Add: "Today\'s date is {{current_date}}. Use this for time-sensitive queries."',
      priority: 'low' as const,
      expected_impact: 'Minor improvement for date-dependent queries',
    },
  ],
};

describe('StructuredAnalysis', () => {
  describe('Summary Section', () => {
    it('should render analysis summary with correct stats', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
      expect(screen.getAllByText('50')[0]).toBeInTheDocument(); // Total tests
      expect(screen.getAllByText('2')[0]).toBeInTheDocument(); // Models tested
      expect(screen.getAllByText('✓')[0]).toBeInTheDocument(); // Multi-model indicator
    });

    it('should display all model names', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getAllByText('Gpt 4')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Claude 3 Opus')[0]).toBeInTheDocument();
    });

    it('should show single model indicator when not multi-model', () => {
      const singleModelData = {
        ...mockAnalysisData,
        summary: { ...mockAnalysisData.summary, multi_model: false },
      };

      render(<StructuredAnalysis data={singleModelData} />);

      expect(screen.getByText('✗')).toBeInTheDocument();
    });
  });

  describe('Best Model Recommendation', () => {
    it('should display best model recommendation', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('Best Model Recommendation')).toBeInTheDocument();
      expect(screen.getAllByText('Claude 3 Opus')[0]).toBeInTheDocument();
      expect(screen.getByText(/100% pass rate/)).toBeInTheDocument();
    });

    it('should not render best model section when no recommendation', () => {
      const noRecommendationData = {
        ...mockAnalysisData,
        model_comparison: {
          ...mockAnalysisData.model_comparison,
          best_model: { model: null, justification: null },
        },
      };

      render(<StructuredAnalysis data={noRecommendationData} />);

      expect(screen.queryByText('Best Model Recommendation')).not.toBeInTheDocument();
    });
  });

  describe('Model Performance Metrics', () => {
    it('should display performance metrics table', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('Model Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Pass Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg Score')).toBeInTheDocument();
      expect(screen.getByText('Severe Failures')).toBeInTheDocument();
    });

    it('should show pass rates with correct formatting', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('80.0%')).toBeInTheDocument(); // GPT-4
      expect(screen.getByText('100.0%')).toBeInTheDocument(); // Claude
    });

    it('should display latency and cost metrics', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('1250')).toBeInTheDocument(); // GPT-4 latency
      expect(screen.getByText('1100')).toBeInTheDocument(); // Claude latency
      expect(screen.getByText('0.0500')).toBeInTheDocument(); // GPT-4 cost
      expect(screen.getByText('0.0600')).toBeInTheDocument(); // Claude cost
    });

    it('should handle null values in metrics', () => {
      const dataWithNulls = {
        ...mockAnalysisData,
        model_comparison: {
          ...mockAnalysisData.model_comparison,
          per_model_metrics: [
            {
              ...mockAnalysisData.model_comparison.per_model_metrics[0],
              avg_score: null,
              latency_ms_avg: null,
              cost_usd_estimate: null,
            },
          ],
        },
      };

      render(<StructuredAnalysis data={dataWithNulls} />);

      const naTexts = screen.getAllByText('N/A');
      expect(naTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Test Results Summary', () => {
    it('should display all models in test results', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('Test Results Summary')).toBeInTheDocument();
      const gpt4Elements = screen.getAllByText('Gpt 4');
      expect(gpt4Elements.length).toBeGreaterThan(0);
    });

    it('should show failed test count badges', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText(/5 \/ 25 failed/)).toBeInTheDocument();
      expect(screen.getByText(/All Passed \(25\/25\)/)).toBeInTheDocument();
    });

    it('should expand model details when clicked', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      // Initially, failure details should not be visible
      expect(screen.queryByText('test-1')).not.toBeInTheDocument();

      // Find and click the model header to expand
      const modelButtons = screen.getAllByRole('button');
      const gpt4Button = modelButtons.find(btn => btn.textContent?.includes('5 / 25 failed'));

      if (gpt4Button) {
        fireEvent.click(gpt4Button);
      }

      // Now failure details should be visible
      expect(screen.getByText('test-1')).toBeInTheDocument();
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('Lyon')).toBeInTheDocument();
      expect(screen.getByText('Incorrect factual answer')).toBeInTheDocument();
    });

    it('should collapse model details when clicked again', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      const modelButtons = screen.getAllByRole('button');
      const gpt4Button = modelButtons.find(btn => btn.textContent?.includes('5 / 25 failed'));

      if (gpt4Button) {
        // Expand
        fireEvent.click(gpt4Button);
        expect(screen.getByText('test-1')).toBeInTheDocument();

        // Collapse
        fireEvent.click(gpt4Button);
        expect(screen.queryByText('test-1')).not.toBeInTheDocument();
      }
    });

    it('should show all passed message for models with no failures', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      const modelButtons = screen.getAllByRole('button');
      const claudeButton = modelButtons.find(btn => btn.textContent?.includes('All Passed'));

      if (claudeButton) {
        fireEvent.click(claudeButton);
        expect(screen.getByText(/No failures - All tests passed!/)).toBeInTheDocument();
      }
    });

    it('should display failure scores', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      const modelButtons = screen.getAllByRole('button');
      const gpt4Button = modelButtons.find(btn => btn.textContent?.includes('5 / 25 failed'));

      if (gpt4Button) {
        fireEvent.click(gpt4Button);
        expect(screen.getByText('0.30')).toBeInTheDocument(); // Score for test-1
        expect(screen.getByText('0.00')).toBeInTheDocument(); // Score for test-2
      }
    });
  });

  describe('Root Cause Analysis', () => {
    it('should display RCA section with clusters', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('Common Issues & Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Multiple systematic issues identified across models')).toBeInTheDocument();
      expect(screen.getByText('Factual Accuracy Issues')).toBeInTheDocument();
      expect(screen.getByText('Math Calculation Errors')).toBeInTheDocument();
    });

    it('should show affected model count', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('1 model affected')).toBeInTheDocument();
      expect(screen.getByText('2 models affected')).toBeInTheDocument();
    });

    it('should expand cluster details when clicked', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      // Initially, cluster details should not be visible
      expect(screen.queryByText('Incorrect facts')).not.toBeInTheDocument();

      // Find and click the cluster button
      const clusterButtons = screen.getAllByRole('button');
      const factualButton = clusterButtons.find(btn =>
        btn.textContent?.includes('Factual Accuracy Issues')
      );

      if (factualButton) {
        fireEvent.click(factualButton);
      }

      // Now cluster details should be visible
      expect(screen.getByText('Incorrect facts')).toBeInTheDocument();
      expect(screen.getByText('Outdated information')).toBeInTheDocument();
      expect(screen.getByText('Training data cutoff or hallucination')).toBeInTheDocument();
    });

    it('should display symptoms, cause, and recommended fixes', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      const clusterButtons = screen.getAllByRole('button');
      const factualButton = clusterButtons.find(btn =>
        btn.textContent?.includes('Factual Accuracy Issues')
      );

      if (factualButton) {
        fireEvent.click(factualButton);

        expect(screen.getByText('Symptoms')).toBeInTheDocument();
        expect(screen.getByText('Likely Cause')).toBeInTheDocument();
        expect(screen.getByText('Recommended Fixes')).toBeInTheDocument();

        expect(screen.getByText('Add fact-checking step')).toBeInTheDocument();
        expect(screen.getByText('Include source requirements')).toBeInTheDocument();
      }
    });

    it('should display evidence test IDs', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      const clusterButtons = screen.getAllByRole('button');
      const factualButton = clusterButtons.find(btn =>
        btn.textContent?.includes('Factual Accuracy Issues')
      );

      if (factualButton) {
        fireEvent.click(factualButton);

        expect(screen.getByText('test-1')).toBeInTheDocument();
        expect(screen.getByText('test-3')).toBeInTheDocument();
      }
    });

    it('should not render RCA section when no clusters', () => {
      const noClusterData = {
        ...mockAnalysisData,
        cross_model_rca: {
          clusters: [],
          notes: '',
        },
      };

      render(<StructuredAnalysis data={noClusterData} />);

      expect(screen.queryByText('Common Issues & Recommendations')).not.toBeInTheDocument();
    });
  });

  describe('Prompt Improvement Recommendations', () => {
    it('should display prompt improvements section', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('Prompt Improvement Recommendations')).toBeInTheDocument();
      expect(screen.getByText(/Based on test failures/)).toBeInTheDocument();
    });

    it('should display all improvement recommendations', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('Add Explicit Fact-Checking Instruction')).toBeInTheDocument();
      expect(screen.getByText('Specify Output Format')).toBeInTheDocument();
      expect(screen.getByText('Add Context About Current Date')).toBeInTheDocument();
    });

    it('should show priority badges with correct colors', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
      expect(screen.getByText('🟡 MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('🔵 LOW')).toBeInTheDocument();
    });

    it('should display problem, suggestion, and expected impact', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      expect(screen.getByText(/provides incorrect factual information/)).toBeInTheDocument();
      expect(screen.getByText(/verify all factual claims/)).toBeInTheDocument();
      expect(screen.getByText(/reduce factual errors by 60-80%/)).toBeInTheDocument();
    });

    it('should not render improvements section when empty', () => {
      const noImprovementsData = {
        ...mockAnalysisData,
        prompt_improvements: [],
      };

      render(<StructuredAnalysis data={noImprovementsData} />);

      expect(screen.queryByText('Prompt Improvement Recommendations')).not.toBeInTheDocument();
    });

    it('should not render improvements section when undefined', () => {
      const { prompt_improvements, ...dataWithoutImprovements } = mockAnalysisData;

      render(<StructuredAnalysis data={dataWithoutImprovements} />);

      expect(screen.queryByText('Prompt Improvement Recommendations')).not.toBeInTheDocument();
    });
  });

  describe('Model Display Name Formatting', () => {
    it('should format model names correctly', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      // Should convert "openai:gpt-4" to "Gpt 4"
      expect(screen.getAllByText('Gpt 4')[0]).toBeInTheDocument();

      // Should convert "anthropic:claude-3-opus" to "Claude 3 Opus"
      expect(screen.getAllByText('Claude 3 Opus')[0]).toBeInTheDocument();
    });

    it('should handle models without colon separator', () => {
      const simpleModelData = {
        ...mockAnalysisData,
        summary: {
          ...mockAnalysisData.summary,
          models: ['gpt4', 'claude'],
        },
      };

      render(<StructuredAnalysis data={simpleModelData} />);

      expect(screen.getByText('gpt4')).toBeInTheDocument();
      expect(screen.getByText('claude')).toBeInTheDocument();
    });
  });

  describe('Interactive States', () => {
    it('should maintain independent expand/collapse states for models', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      const modelButtons = screen.getAllByRole('button');
      const gpt4Button = modelButtons.find(btn => btn.textContent?.includes('5 / 25 failed'));
      const claudeButton = modelButtons.find(btn => btn.textContent?.includes('All Passed'));

      // Expand GPT-4
      if (gpt4Button) fireEvent.click(gpt4Button);
      expect(screen.getByText('test-1')).toBeInTheDocument();

      // Expand Claude
      if (claudeButton) fireEvent.click(claudeButton);
      expect(screen.getByText(/No failures - All tests passed!/)).toBeInTheDocument();

      // GPT-4 should still be expanded
      expect(screen.getByText('test-1')).toBeInTheDocument();
    });

    it('should maintain independent expand/collapse states for RCA clusters', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      const clusterButtons = screen.getAllByRole('button');
      const factualButton = clusterButtons.find(btn =>
        btn.textContent?.includes('Factual Accuracy Issues')
      );
      const mathButton = clusterButtons.find(btn =>
        btn.textContent?.includes('Math Calculation Errors')
      );

      // Expand Factual Issues
      if (factualButton) fireEvent.click(factualButton);
      expect(screen.getByText('Incorrect facts')).toBeInTheDocument();

      // Expand Math Issues
      if (mathButton) fireEvent.click(mathButton);
      expect(screen.getByText('Wrong arithmetic')).toBeInTheDocument();

      // Both should be expanded
      expect(screen.getByText('Incorrect facts')).toBeInTheDocument();
      expect(screen.getByText('Wrong arithmetic')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should apply color coding to pass rates', () => {
      render(<StructuredAnalysis data={mockAnalysisData} />);

      // High pass rate (>= 80%) should be green
      const highPassRate = screen.getByText('100.0%');
      expect(highPassRate).toHaveClass('text-green-600');

      // Medium pass rate (50-79%) should be yellow - need to add test data
      const medPassRateData = {
        ...mockAnalysisData,
        model_comparison: {
          ...mockAnalysisData.model_comparison,
          per_model_metrics: [
            ...mockAnalysisData.model_comparison.per_model_metrics,
            {
              model: 'test:model',
              pass_rate: 0.6,
              avg_score: 0.7,
              weighted_score: 0.68,
              stability: 0.8,
              severe_failures: 1,
              latency_ms_avg: 1000,
              cost_usd_estimate: 0.04,
            },
          ],
        },
      };

      const { rerender } = render(<StructuredAnalysis data={medPassRateData} />);
      const medPassRate = screen.getByText('60.0%');
      expect(medPassRate).toHaveClass('text-yellow-600');
    });
  });
});
