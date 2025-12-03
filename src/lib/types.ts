// Core types for the application
export interface Provider {
  id: string;
  providerId: string;
  config?: Record<string, any>;
}

export interface Prompt {
  id: string;
  label: string;
  text: string;
}

export interface DatasetRow {
  [key: string]: any;
}

export interface Dataset {
  name: string;
  rows: DatasetRow[];
  headers?: string[]; // Column headers (preserved even when rows are empty)
  csvPath?: string; // Path to CSV file (used when CSV is imported)
}

export type AssertionType =
  | 'equals'
  | 'contains'
  | 'regex'
  | 'llm-rubric'
  | 'context-relevance'
  | 'factuality'
  | 'javascript'
  | 'python'
  | 'is-json'
  | 'contains-json'
  | 'cost'
  | 'latency'
  | 'perplexity'
  | 'perplexity-score'
  | 'security-prompt-injection'
  | 'security-xss'
  | 'security-sql-injection'
  | 'security-path-traversal'
  | 'security-unicode-attack'
  | 'security-prompt-disclosure'
  | 'security-pii'
  | 'security-dos';

export interface Assertion {
  id: string;
  type: AssertionType | string;
  value?: string | number | object;
  threshold?: number;
  metric?: string;
  rubric?: string;
  provider?: string;
  weight?: number;
  transform?: string;
  // Context Relevance specific fields
  queryColumn?: string; // Column name for query/question
  contextColumn?: string; // Column name for context/document
}

export interface ProjectOptions {
  outputPath?: string;
  jsonOutputPath?: string;
  maxConcurrency?: number;
  sharing?: boolean | { apiBaseUrl?: string; appBaseUrl?: string };
  cache?: boolean;
  openReportAfterTest?: boolean;
  debugMode?: boolean;
  aiModel?: string; // AI model for generating assertions, datasets, and analysis
  datasetRowCount?: number; // Number of rows to generate for AI dataset generation
  // Security testing
  enableSecurityTests?: boolean; // Enable separate security testing YAML
  securityGraderModel?: string; // AI model for grading security test results (llm-rubric assertions)
  selectedSecurityTests?: string[]; // Selected OWASP LLM tests to run (e.g., ['LLM01', 'LLM02'])
  // AI Prompts - Customizable system prompts for AI generation features
  aiPromptAnalysis?: string; // System prompt for AI analysis of test results
  aiPromptAssertionGeneration?: string; // System prompt for generating assertions
  aiPromptDatasetGeneration?: string; // System prompt for generating datasets
  aiPromptColumnGeneration?: string; // System prompt for generating dataset columns
  aiPromptRowGeneration?: string; // System prompt for generating dataset rows
  aiPromptReferenceAnswer?: string; // System prompt for generating reference answers
}

export interface Project {
  name: string;
  providers: Provider[];
  prompts: Prompt[];
  dataset?: Dataset;
  assertions: Assertion[];
  options?: ProjectOptions;
}

export interface TestResult {
  pass: boolean;
  score: number;
  reason: string;
  assertion: any;
}

export interface EvalResult {
  prompt: {
    raw: string;
    label: string;
  };
  vars: Record<string, any>;
  response: {
    output: string;
    tokenUsage?: {
      total: number;
      prompt: number;
      completion: number;
    };
  };
  success: boolean;
  score: number;
  latencyMs: number;
  gradingResult: {
    pass: boolean;
    score: number;
    reason: string;
    componentResults: TestResult[];
  };
}

export interface PromptfooResults {
  version: number;
  results: {
    table: {
      head: {
        prompts: Array<{ raw: string; label: string; provider: string }>;
        vars: string[];
      };
      body: Array<{
        outputs: Array<{
          pass: boolean;
          score: number;
          text: string;
          prompt: string;
          latencyMs: number;
          cost: number;
          gradingResult?: any;
        }>;
        vars: string[];
        test: any;
      }>;
    };
    stats: {
      successes: number;
      failures: number;
      tokenUsage: {
        total: number;
        prompt: number;
        completion: number;
      };
    };
  };
  config: {
    description?: string;
  };
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  projectName: string;
  timestamp: string;
  results: PromptfooResults;
  project?: Project; // Save project config for reference
  stats: {
    totalTests: number;
    passed: number;
    failed: number;
    avgScore: number;
    totalCost: number;
    totalLatency: number;
  };
}
