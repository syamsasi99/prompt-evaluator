import React, { useState, useRef } from 'react';
import type { ProjectOptions } from '../lib/types';
import { HtmlOutputPathSchema, JsonOutputPathSchema } from '../lib/schemas';
import { DEFAULT_AI_PROMPTS } from '../lib/defaultPrompts';
import { LogsViewer } from './LogsViewer';
import { logger } from '../lib/logger';

// AI Models available for generating assertions, datasets, and analysis
const AI_MODELS = [
  { category: 'Google (Recommended)', models: [
    { id: 'google:gemini-2.5-pro', label: 'Gemini 2.5 Pro - Best for complex analysis' },
    { id: 'google:gemini-2.5-flash', label: 'Gemini 2.5 Flash - Fast and cost-efficient' },
    { id: 'google:gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp - Experimental' },
  ]},
  { category: 'Anthropic', models: [
    { id: 'anthropic:claude-sonnet-4-20250514', label: 'Claude Sonnet 4 - Latest' },
    { id: 'anthropic:claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'anthropic:claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ]},
  { category: 'OpenAI', models: [
    { id: 'openai:gpt-4o', label: 'GPT-4o - Latest' },
    { id: 'openai:gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'openai:o1', label: 'O1 - Reasoning model' },
  ]},
];

interface OptionsFormProps {
  options: ProjectOptions;
  onChange: (options: ProjectOptions) => void;
}

type SettingsTab = 'general' | 'ai' | 'prompts' | 'logs';

export function OptionsForm({ options, onChange }: OptionsFormProps) {
  console.log('OptionsForm RENDER');

  const [htmlPathError, setHtmlPathError] = useState<string | null>(null);
  const [jsonPathError, setJsonPathError] = useState<string | null>(null);
  const [aiModelApiKeyStatus, setAiModelApiKeyStatus] = useState<{ hasKey: boolean; envVar: string; checking: boolean }>({ hasKey: true, envVar: '', checking: false });
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const validateHtmlPath = (path: string): string | null => {
    if (!path || path.trim() === '') {
      return 'HTML output path is required';
    }

    const validation = HtmlOutputPathSchema.safeParse(path);
    if (!validation.success) {
      return validation.error.errors[0].message;
    }

    return null;
  };

  const validateJsonPath = (path: string): string | null => {
    if (!path || path.trim() === '') {
      return null; // Optional field
    }

    const validation = JsonOutputPathSchema.safeParse(path);
    if (!validation.success) {
      return validation.error.errors[0].message;
    }

    return null;
  };

  const updateOption = (key: keyof ProjectOptions, value: any) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  const getEnvVarForModel = (modelPrefix: string): string => {
    if (modelPrefix === 'google' || modelPrefix === 'vertex') {
      return 'GEMINI_API_KEY';
    } else if (modelPrefix === 'anthropic') {
      return 'ANTHROPIC_API_KEY';
    } else if (modelPrefix === 'openai') {
      return 'OPENAI_API_KEY';
    }
    return '';
  };

  const checkAiModelApiKey = async (aiModel: string) => {
    setAiModelApiKeyStatus({ hasKey: false, envVar: '', checking: true });

    const modelPrefix = aiModel.split(':')[0];
    const envVarName = getEnvVarForModel(modelPrefix);

    if (!envVarName || !window.api?.checkApiKey) {
      setAiModelApiKeyStatus({ hasKey: false, envVar: envVarName, checking: false });
      return false;
    }

    try {
      const result = await window.api.checkApiKey(envVarName);
      const hasKey = result.success && (result as any).hasApiKey;
      setAiModelApiKeyStatus({
        hasKey,
        envVar: envVarName,
        checking: false,
      });
      return hasKey;
    } catch (error) {
      setAiModelApiKeyStatus({ hasKey: false, envVar: envVarName, checking: false });
      return false;
    }
  };

  // Auto-select model with valid API key on mount
  React.useEffect(() => {
    const autoSelectModelWithApiKey = async () => {
      // Only auto-select if no model is currently set
      if (options.aiModel) {
        checkAiModelApiKey(options.aiModel);
        return;
      }

      // Check API keys in order of preference: Google > Anthropic > OpenAI
      const modelPriority = [
        { prefix: 'google', defaultModel: 'google:gemini-2.5-pro', envVar: 'GEMINI_API_KEY' },
        { prefix: 'anthropic', defaultModel: 'anthropic:claude-sonnet-4-20250514', envVar: 'ANTHROPIC_API_KEY' },
        { prefix: 'openai', defaultModel: 'openai:gpt-4o', envVar: 'OPENAI_API_KEY' },
      ];

      if (!window.api?.checkApiKey) {
        return;
      }

      for (const { defaultModel, envVar } of modelPriority) {
        try {
          const result = await window.api.checkApiKey(envVar);
          if (result.success && (result as any).hasApiKey) {
            // Found a valid API key, set this as the default model
            updateOption('aiModel', defaultModel);
            setAiModelApiKeyStatus({
              hasKey: true,
              envVar,
              checking: false,
            });
            return;
          }
        } catch (error) {
          console.error(`Error checking ${envVar}:`, error);
        }
      }

      // No valid API keys found, show warning with default model
      setAiModelApiKeyStatus({
        hasKey: false,
        envVar: 'GEMINI_API_KEY',
        checking: false,
      });
    };

    autoSelectModelWithApiKey();
  }, []); // Run only once on mount

  // Check API key when model changes (but not on initial mount)
  React.useEffect(() => {
    if (options.aiModel) {
      checkAiModelApiKey(options.aiModel);
    }
  }, [options.aiModel]);

  const tabs: Array<{ id: SettingsTab; label: string; icon: JSX.Element; description: string }> = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      description: 'Output paths and basic settings',
    },
    {
      id: 'ai',
      label: 'AI Configuration',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      description: 'AI model and generation settings',
    },
    {
      id: 'prompts',
      label: 'AI Prompts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Customize AI system prompts',
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      description: 'View application logs',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure your project settings and preferences</p>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-100 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-600'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Output Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      JSON Output Path
                    </label>
                    <input
                      type="text"
                      value={options.jsonOutputPath || ''}
                      onChange={(e) => {
                        updateOption('jsonOutputPath', e.target.value);
                        const error = validateJsonPath(e.target.value);
                        setJsonPathError(error);
                      }}
                      onBlur={(e) => {
                        const error = validateJsonPath(e.target.value);
                        setJsonPathError(error);
                      }}
                      placeholder="~/Library/Application Support/prompt-evaluator/output.json"
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                        jsonPathError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {jsonPathError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {jsonPathError}
                      </p>
                    )}
                    {!jsonPathError && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Raw results in JSON format for programmatic analysis
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Performance Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Concurrency
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={options.maxConcurrency || 4}
                        onChange={(e) =>
                          updateOption(
                            'maxConcurrency',
                            e.target.value === '' ? 4 : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                            e.preventDefault();
                          }
                        }}
                        placeholder="4"
                        min={1}
                        max={4}
                        step={1}
                        className="w-24 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-gray-100"
                        title="Use up/down arrows to adjust between 1-4"
                      />
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                            style={{ width: `${((options.maxConcurrency || 4) / 4) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {options.maxConcurrency || 4} parallel API {(options.maxConcurrency || 4) === 1 ? 'request' : 'requests'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Controls how many API requests run in parallel. Higher values = faster but more resource intensive.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Security Testing
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                    <input
                      type="checkbox"
                      id="enableSecurityTests"
                      checked={options.enableSecurityTests || false}
                      onChange={(e) => updateOption('enableSecurityTests', e.target.checked)}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="enableSecurityTests" className="block text-sm font-medium text-red-900 dark:text-red-200 cursor-pointer">
                        Enable Security Testing
                      </label>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Automatically test for common security vulnerabilities. Security tests are auto-generated based on your prompt variables.
                      </p>
                    </div>
                  </div>

                  {options.enableSecurityTests && (
                    <div className="space-y-3">
                      <div className="ml-7 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 text-sm">
                        <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">Security Tests Active</p>
                        <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                          Select which security assertions to enable below. All selected tests will be automatically added during evaluation.
                        </p>
                      </div>

                      <div className="ml-7 space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enabled Security Assertions:</p>

                        {/* Prompt Injection */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-prompt-injection"
                            checked={(options as any).enablePromptInjection !== false}
                            onChange={(e) => updateOption('enablePromptInjection' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-prompt-injection" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              Prompt Injection
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Tests if model resists attempts to manipulate system prompts or change behavior</p>
                          </div>
                        </div>

                        {/* XSS */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-xss"
                            checked={(options as any).enableXSS !== false}
                            onChange={(e) => updateOption('enableXSS' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-xss" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              XSS (Cross-Site Scripting)
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Validates output doesn't contain executable JavaScript or malicious HTML tags</p>
                          </div>
                        </div>

                        {/* SQL Injection */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-sql"
                            checked={(options as any).enableSQLInjection !== false}
                            onChange={(e) => updateOption('enableSQLInjection' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-sql" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              SQL Injection
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Checks for SQL injection patterns like UNION SELECT, OR 1=1, comment sequences</p>
                          </div>
                        </div>

                        {/* Path Traversal */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-path"
                            checked={(options as any).enablePathTraversal !== false}
                            onChange={(e) => updateOption('enablePathTraversal' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-path" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              Path Traversal
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Detects attempts to access files outside allowed directories (../, /etc/passwd, etc.)</p>
                          </div>
                        </div>

                        {/* Unicode Attack */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-unicode"
                            checked={(options as any).enableUnicodeAttack !== false}
                            onChange={(e) => updateOption('enableUnicodeAttack' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-unicode" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              Unicode Attack
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Tests handling of homograph attacks, bidirectional text, and encoding bypasses</p>
                          </div>
                        </div>

                        {/* Prompt Disclosure */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-disclosure"
                            checked={(options as any).enablePromptDisclosure !== false}
                            onChange={(e) => updateOption('enablePromptDisclosure' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-disclosure" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              Prompt Disclosure
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Ensures model doesn't reveal system prompts, instructions, or internal configuration</p>
                          </div>
                        </div>

                        {/* PII Leakage */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-pii"
                            checked={(options as any).enablePII !== false}
                            onChange={(e) => updateOption('enablePII' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-pii" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              PII Leakage
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Checks output doesn't contain emails, phone numbers, SSN, credit cards, or other sensitive data</p>
                          </div>
                        </div>

                        {/* DoS */}
                        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            id="sec-dos"
                            checked={(options as any).enableDoS !== false}
                            onChange={(e) => updateOption('enableDoS' as any, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <div className="flex-1">
                            <label htmlFor="sec-dos" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                              Denial of Service (DoS)
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Validates system handles excessively long inputs without resource exhaustion</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Configuration */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Model Selection
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Model for AI Generation Features
                    </label>
                    <select
                      value={options.aiModel || 'google:gemini-2.5-pro'}
                      onChange={(e) => updateOption('aiModel', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800"
                    >
                      {AI_MODELS.map((category) => (
                        <optgroup key={category.category} label={category.category}>
                          {category.models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Powers "Generate with AI" features (assertions, datasets, analysis)
                    </p>
                  </div>

                  {/* API Key Status */}
                  {aiModelApiKeyStatus.checking ? (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking API key status...
                      </p>
                    </div>
                  ) : !aiModelApiKeyStatus.hasKey ? (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">API Key Not Found</p>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                            Please set the <code className="bg-red-100 px-1 py-0.5 rounded">{aiModelApiKeyStatus.envVar}</code> environment variable to use this AI model.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        API key configured
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  Dataset Generation
                </h3>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Default Row Count
                    </label>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {options.datasetRowCount || 1}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={options.datasetRowCount || 1}
                    onChange={(e) => updateOption('datasetRowCount', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    style={{
                      background: `linear-gradient(to right, rgb(22 163 74) 0%, rgb(22 163 74) ${((options.datasetRowCount || 1) - 1) / 99 * 100}%, rgb(229 231 235) ${((options.datasetRowCount || 1) - 1) / 99 * 100}%, rgb(229 231 235) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <span>1 row</span>
                    <span>50 rows</span>
                    <span>100 rows</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Number of test data rows to generate when using AI features
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* AI Prompts */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700 p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customize AI System Prompts</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      These prompts control how AI interprets your data and generates outputs. Customize them to match your specific needs or use the defaults for best results.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* AI Analysis Prompt */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'analysis' ? null : 'analysis')}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">AI Analysis Prompt</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Controls how AI analyzes test results</div>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedPrompt === 'analysis' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedPrompt === 'analysis' && (
                    <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                      <textarea
                        value={options.aiPromptAnalysis || DEFAULT_AI_PROMPTS.analysis}
                        onChange={(e) => updateOption('aiPromptAnalysis', e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        placeholder="Enter AI analysis prompt..."
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateOption('aiPromptAnalysis', DEFAULT_AI_PROMPTS.analysis)}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                          Reset to Default
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(options.aiPromptAnalysis || DEFAULT_AI_PROMPTS.analysis);
                          }}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assertion Generation Prompt */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'assertion' ? null : 'assertion')}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">Assertion Generation Prompt</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Controls how AI generates test assertions</div>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedPrompt === 'assertion' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedPrompt === 'assertion' && (
                    <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                      <textarea
                        value={options.aiPromptAssertionGeneration || DEFAULT_AI_PROMPTS.assertionGeneration}
                        onChange={(e) => updateOption('aiPromptAssertionGeneration', e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        placeholder="Enter assertion generation prompt..."
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateOption('aiPromptAssertionGeneration', DEFAULT_AI_PROMPTS.assertionGeneration)}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                          Reset to Default
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(options.aiPromptAssertionGeneration || DEFAULT_AI_PROMPTS.assertionGeneration);
                          }}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dataset Generation Prompt */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'dataset' ? null : 'dataset')}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">Dataset Generation Prompt</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Controls how AI generates test datasets</div>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedPrompt === 'dataset' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedPrompt === 'dataset' && (
                    <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                      <textarea
                        value={options.aiPromptDatasetGeneration || DEFAULT_AI_PROMPTS.datasetGeneration}
                        onChange={(e) => updateOption('aiPromptDatasetGeneration', e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        placeholder="Enter dataset generation prompt..."
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateOption('aiPromptDatasetGeneration', DEFAULT_AI_PROMPTS.datasetGeneration)}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                          Reset to Default
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(options.aiPromptDatasetGeneration || DEFAULT_AI_PROMPTS.datasetGeneration);
                          }}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column Generation Prompt */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'column' ? null : 'column')}
                    className="w-full px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">Column Generation Prompt</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Controls how AI generates dataset columns</div>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedPrompt === 'column' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedPrompt === 'column' && (
                    <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                      <textarea
                        value={options.aiPromptColumnGeneration || DEFAULT_AI_PROMPTS.columnGeneration}
                        onChange={(e) => updateOption('aiPromptColumnGeneration', e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        placeholder="Enter column generation prompt..."
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateOption('aiPromptColumnGeneration', DEFAULT_AI_PROMPTS.columnGeneration)}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                          Reset to Default
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(options.aiPromptColumnGeneration || DEFAULT_AI_PROMPTS.columnGeneration);
                          }}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row Generation Prompt */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'row' ? null : 'row')}
                    className="w-full px-6 py-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 hover:from-pink-100 hover:to-rose-100 dark:hover:from-pink-900/30 dark:hover:to-rose-900/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">Row Generation Prompt</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Controls how AI generates dataset rows</div>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedPrompt === 'row' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedPrompt === 'row' && (
                    <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                      <textarea
                        value={options.aiPromptRowGeneration || DEFAULT_AI_PROMPTS.rowGeneration}
                        onChange={(e) => updateOption('aiPromptRowGeneration', e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        placeholder="Enter row generation prompt..."
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateOption('aiPromptRowGeneration', DEFAULT_AI_PROMPTS.rowGeneration)}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                          Reset to Default
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(options.aiPromptRowGeneration || DEFAULT_AI_PROMPTS.rowGeneration);
                          }}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reference Answer Prompt */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'reference' ? null : 'reference')}
                    className="w-full px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/30 dark:hover:to-cyan-900/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">Reference Answer Prompt</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Controls how AI generates reference answers</div>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedPrompt === 'reference' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedPrompt === 'reference' && (
                    <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                      <textarea
                        value={options.aiPromptReferenceAnswer || DEFAULT_AI_PROMPTS.referenceAnswer}
                        onChange={(e) => updateOption('aiPromptReferenceAnswer', e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        placeholder="Enter reference answer prompt..."
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateOption('aiPromptReferenceAnswer', DEFAULT_AI_PROMPTS.referenceAnswer)}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                          Reset to Default
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(options.aiPromptReferenceAnswer || DEFAULT_AI_PROMPTS.referenceAnswer);
                          }}
                          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset All Button */}
                <div className="pt-4">
                  <button
                    onClick={() => {
                      updateOption('aiPromptAnalysis', DEFAULT_AI_PROMPTS.analysis);
                      updateOption('aiPromptAssertionGeneration', DEFAULT_AI_PROMPTS.assertionGeneration);
                      updateOption('aiPromptDatasetGeneration', DEFAULT_AI_PROMPTS.datasetGeneration);
                      updateOption('aiPromptColumnGeneration', DEFAULT_AI_PROMPTS.columnGeneration);
                      updateOption('aiPromptRowGeneration', DEFAULT_AI_PROMPTS.rowGeneration);
                      updateOption('aiPromptReferenceAnswer', DEFAULT_AI_PROMPTS.referenceAnswer);
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-400 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/30 dark:hover:to-rose-900/30 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 border border-red-200 dark:border-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset All Prompts to Defaults
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          {activeTab === 'logs' && (
            <div className="h-[calc(100vh-250px)]">
              <LogsViewer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
