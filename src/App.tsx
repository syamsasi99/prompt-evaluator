import React, { useState, useEffect } from 'react';
import type { Project, Provider, Prompt, Dataset, Assertion, ProjectOptions, PromptfooResults } from './lib/types';
import { ProvidersForm } from './components/ProvidersForm';
import { PromptsForm } from './components/PromptsForm';
import { DatasetForm } from './components/DatasetForm';
import { AssertionsForm } from './components/AssertionsForm';
import { OptionsForm } from './components/OptionsForm';
import { logger } from './lib/logger';
import { YamlPreview } from './components/YamlPreview';
import { RunResults } from './components/RunResults';
import { History } from './components/History';
import { Dashboard } from './components/Dashboard';
import { FileBar } from './components/FileBar';
import { Loader } from './components/Loader';
import { TutorialOverlay } from './components/TutorialOverlay';
import { Documentation } from './components/Documentation';
import { useToast } from './contexts/ToastContext';
import { useTutorial } from './contexts/TutorialContext';
import { ValidationService, EvaluationService, HistoryService } from './services';

type Tab = 'dashboard' | 'providers' | 'prompts' | 'dataset' | 'assertions' | 'settings' | 'results' | 'history';

function App() {
  const toast = useToast();
  const tutorial = useTutorial();
  const [isLoading, setIsLoading] = useState(true);
  const [userDataPath, setUserDataPath] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [projectName, setProjectName] = useState('My First Project');
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [hasProviderErrors, setHasProviderErrors] = useState(false);
  const [shouldValidateProviders, setShouldValidateProviders] = useState(false);
  const [hasPromptErrors, setHasPromptErrors] = useState(false);
  const [shouldValidatePrompts, setShouldValidatePrompts] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [activeYamlView, setActiveYamlView] = useState<'main' | 'security'>('main');

  const [providers, setProviders] = useState<Provider[]>([
    {
      id: 'provider-1',
      providerId: 'google:gemini-2.5-flash',
      config: {},
    },
  ]);

  // Sync tutorial active tab with app active tab
  useEffect(() => {
    const stepConfig = tutorial.getCurrentStepConfig();
    if (tutorial.isActive && stepConfig?.targetTab && stepConfig.targetTab !== activeTab) {
      setActiveTab(stepConfig.targetTab);
    }
  }, [tutorial.isActive, tutorial.currentStep]);

  // Handle tab change with validation
  const handleTabChange = async (tab: Tab) => {
    logger.debug('navigation', `Tab changed from ${activeTab} to ${tab}`);

    if (activeTab === 'providers' && tab !== 'providers') {
      // Trigger validation when trying to leave providers tab
      setShouldValidateProviders(true);
      setPendingTab(tab);
    } else if (activeTab === 'prompts' && tab !== 'prompts') {
      // Trigger validation when trying to leave prompts tab
      setShouldValidatePrompts(true);
      setPendingTab(tab);
    } else if (activeTab === 'dataset' && tab !== 'dataset' && hasUnsavedDatasetData) {
      // Warn about unsaved data when trying to leave dataset tab
      toast.warning('You have unsaved data in the paste area. It will be auto-saved now.');
      // Data will be auto-saved by the onBlur handler
      setActiveTab(tab);
      setPendingTab(null);
    } else {
      // Allow navigation if not leaving providers/prompts/dataset tab
      setActiveTab(tab);
      setPendingTab(null);

      // Auto-load results when navigating to results tab
      if (tab === 'results' && !results && options.jsonOutputPath) {
        try {
          if (window.api?.readJsonResults) {
            const result = await window.api.readJsonResults(options.jsonOutputPath);
            if (result.success && result.results) {
              setResults(result.results);
            }
          }
        } catch (error) {
          console.error('Failed to auto-load results:', error);
        }
      }
    }
  };

  // Check validation after it's triggered and navigate or block
  React.useEffect(() => {
    if (pendingTab && shouldValidateProviders) {
      // Small delay to ensure validation has completed
      const timer = setTimeout(() => {
        if (hasProviderErrors) {
          const message = providers.length === 0
            ? 'Please add at least one provider before leaving this tab.'
            : 'Please fix all provider validation errors before leaving this tab.';
          toast.warning(message);
          setPendingTab(null);
        } else {
          setActiveTab(pendingTab);
          setPendingTab(null);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingTab, shouldValidateProviders, hasProviderErrors, providers.length]);

  // Check prompt validation
  React.useEffect(() => {
    if (pendingTab && shouldValidatePrompts) {
      // Small delay to ensure validation has completed
      const timer = setTimeout(() => {
        if (hasPromptErrors) {
          toast.warning('Please fix all prompt validation errors before leaving this tab.');
          setPendingTab(null);
        } else {
          setActiveTab(pendingTab);
          setPendingTab(null);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingTab, shouldValidatePrompts, hasPromptErrors]);

  const [prompts, setPrompts] = useState<Prompt[]>([
    {
      id: 'prompt-1',
      label: 'Sample Prompt',
      text: 'You are a helpful assistant. Please answer the following question: {{question}}\n\nReturn the answer in JSON format.\n\nExample:\n{"answer": "Answer from model here"}',
    },
  ]);

  const [dataset, setDataset] = useState<Dataset | undefined>(undefined);
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [options, setOptions] = useState<ProjectOptions>({
    outputPath: '~/Library/Application Support/prompt-evaluator/output.html',
    jsonOutputPath: '~/Library/Application Support/prompt-evaluator/output.json',
    maxConcurrency: 4,
    cache: false,
    openReportAfterTest: false,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PromptfooResults | null>(null);
  const [securityResults, setSecurityResults] = useState<PromptfooResults | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null); // Persist AI analysis results
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [promptfooInstalled, setPromptfooInstalled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [hasUnsavedDatasetData, setHasUnsavedDatasetData] = useState(false);
  const [showYamlPreview, setShowYamlPreview] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<Prompt[] | null>(null);
  const [showRerunConfirmation, setShowRerunConfirmation] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleCloseSettingsModal = () => {
    setShowSettingsModal(false);
  };
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [missingExpectedOutputError, setMissingExpectedOutputError] = useState<string | null>(null);

  // Track last evaluated project to prevent showing stale results
  const [lastEvaluatedProject, setLastEvaluatedProject] = useState<string | null>(null);

  // Initialize app and check if promptfoo is installed
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Log application startup
        logger.info('app', 'Prompt Evaluator application starting...');

        // Simulate minimum loading time for better UX
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 1000));

        // Check if we're running in Electron or browser with timeout
        if (window.api?.checkPromptfooInstalled) {
          // Get user data path
          const dataPath = await window.api.getUserDataPath();
          setUserDataPath(dataPath);

          const checkPromise = window.api.checkPromptfooInstalled();
          const timeoutPromise = new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 5000) // 5 second timeout
          );

          const installed = await Promise.race([checkPromise, timeoutPromise]);
          setPromptfooInstalled(installed);
        } else {
          // Running in browser mode - skip promptfoo check
          setPromptfooInstalled(null);
        }

        // Wait for minimum load time
        await minLoadTime;

        logger.info('app', 'Application initialization complete');
      } catch (error) {
        console.error('Error during initialization:', error);
        logger.error('app', 'Application initialization failed', { error: String(error) });
      } finally {
        // Always hide loader, even if there's an error
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Update output paths when userDataPath is available
  useEffect(() => {
    if (userDataPath && options.outputPath?.includes('~/Library')) {
      setOptions(prev => ({
        ...prev,
        outputPath: `${userDataPath}/output.html`,
        jsonOutputPath: `${userDataPath}/output.json`,
      }));
    }
  }, [userDataPath]);

  // Debug: Log whenever options change
  useEffect(() => {
    console.log('[App] Options state changed:', options);
  }, [options]);

  // Clear results when project configuration changes (but not on first load)
  // Note: options are excluded from the hash as they don't affect test results
  // Note: results is NOT in the dependency array to avoid circular updates
  useEffect(() => {
    // Create a hash of current project configuration
    const currentProjectHash = JSON.stringify({
      name: projectName,
      providers: providers.map(p => ({ id: p.providerId, config: p.config })),
      prompts: prompts.map(p => ({ id: p.id, text: p.text })),
      dataset: dataset,
      assertions: assertions.map(a => ({ type: a.type, value: a.value })),
    });

    // If we have results but the project has changed, clear them
    if (results && lastEvaluatedProject && lastEvaluatedProject !== currentProjectHash) {
      console.log('Project configuration changed, clearing stale results');
      setResults(null);
    }
  }, [projectName, providers, prompts, dataset, assertions, lastEvaluatedProject]);

  const project: Project = {
    name: projectName,
    providers,
    prompts,
    dataset,
    assertions,
    options,
  };

  // Helper function to generate project ID from file path
  const generateProjectId = (filePath: string): string => {
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  };

  // Auto-save project with debouncing
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      // Only auto-save if there's meaningful content
      if (projectName && projectName !== 'My First Project') {
        try {
          const fileName = `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
          console.log('[Auto-save] Saving project with options:', project.options);
          const result = await window.api.autoSaveProject(project, fileName);

          if (result.success && result.filePath) {
            // Update recent projects metadata
            const metadata = {
              id: generateProjectId(result.filePath),
              name: projectName,
              filePath: result.filePath,
              lastOpened: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              favorite: false,
              provider: providers[0]?.providerId,
              evalCount: 0,
            };

            await window.api.updateRecentProject(metadata);
            console.log('[Auto-save] Project saved:', fileName);
          }
        } catch (error) {
          console.error('[Auto-save] Failed:', error);
        }
      }
    }, 5000); // Debounce for 5 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [projectName, providers, prompts, dataset, assertions, options]);

  // Helper function to save results to history
  const saveResultsToHistory = async (evaluationResults: PromptfooResults) => {
    try {
      console.log('Saving to history...');

      const saveResult = await HistoryService.saveEvaluationResults(
        projectName,
        evaluationResults,
        {
          name: projectName,
          providers,
          prompts,
          dataset,
          assertions,
          options,
        }
      );

      if (saveResult.success && saveResult.historyItem) {
        console.log('Saved evaluation to history:', projectName);
      } else {
        console.error('Failed to save to history:', saveResult.error);
      }
    } catch (error: any) {
      console.error('Error saving to history:', error);
      // Don't fail the evaluation if history save fails
    }
  };

  const handleRunEval = async () => {
    try {
      // Validate entire project using ValidationService
      const validation = ValidationService.validateProject(
        projectName,
        providers,
        prompts,
        dataset,
        assertions,
        options as any
      );

      if (!validation.valid) {
        toast.error(validation.error || 'Validation failed');

        // Navigate to appropriate tab based on error
        if (validation.error?.includes('provider')) {
          setActiveTab('providers');
        } else if (validation.error?.includes('prompt')) {
          setActiveTab('prompts');
        } else if (validation.error?.includes('dataset') || validation.error?.includes('variable')) {
          setActiveTab('dataset');
        } else if (validation.error?.includes('assertion')) {
          setActiveTab('assertions');
        }

        return;
      }

      // Clear the error if validation passes
      setMissingExpectedOutputError(null);

      // Calculate total tests for progress tracking
      const totalTests = EvaluationService.calculateTotalTests(project);

      setIsRunning(true);
      setLogs([]);
      setShowLogs(true);
      setResults(null);
      setSecurityResults(null); // Also clear security results
      setAiAnalysis(null); // Clear AI analysis for new run
      setProgress({ current: 0, total: totalTests });

      // Generate a unique run ID
      const runId = Date.now().toString();
      setCurrentRunId(runId);

      // Run evaluation using EvaluationService
      console.log('🚀 [App] Starting evaluation with project:', {
        name: project.name,
        providersCount: project.providers.length,
        promptsCount: project.prompts.length,
        datasetRowsCount: project.dataset.rows.length,
        assertionsCount: project.assertions.length,
        options: project.options,
      });
      const evalResult = await EvaluationService.runEvaluation(project, {
        runId,
        onLog: (log, progressUpdate) => {
          setLogs((prev) => [...prev, log]);
          if (progressUpdate) {
            setProgress({ current: progressUpdate.current, total: progressUpdate.total });
          }
        },
      });

      // Handle functional results
      let evaluationResults = evalResult.functionalResult?.results;
      console.log('📊 Evaluation complete:', {
        hasFunctionalResult: !!evalResult.functionalResult,
        hasResults: !!evaluationResults,
        resultsStructure: evaluationResults ? Object.keys(evaluationResults) : [],
        hasTable: !!(evaluationResults as any)?.table || !!(evaluationResults as any)?.results?.table,
        projectOptions: options,
        functionalResultKeys: evalResult.functionalResult ? Object.keys(evalResult.functionalResult) : [],
      });

      if (evaluationResults) {
        console.log('🔵 About to save to history...');
        await saveResultsToHistory(evaluationResults);
        console.log('🔵 Finished saving to history');
      }

      // Handle security results
      if (evalResult.securityResult?.results) {
        console.log('🔒 Setting security results to state');
        setSecurityResults(evalResult.securityResult.results);
      }

      // Handle success cases based on what tests ran
      const functionalTestsSucceeded = !!evalResult.functionalResult?.results;
      const securityTestsSucceeded = !!evalResult.securityResult?.results;

      if (functionalTestsSucceeded) {
        console.log('✅ Setting results to state:', {
          hasResults: !!evaluationResults,
          tableExists: !!(evaluationResults as any)?.table,
          tableBodyLength: (evaluationResults as any)?.table?.body?.length || 0,
        });
        setResults(evaluationResults!);
      } else {
        console.log('❌ No functional results to display');
      }

      // Show success if either functional or security tests succeeded
      if (functionalTestsSucceeded || securityTestsSucceeded) {
        setShowLogs(false);

        // Save project hash to detect future changes
        const currentProjectHash = JSON.stringify({
          name: projectName,
          providers: providers.map(p => ({ id: p.providerId, config: p.config })),
          prompts: prompts.map(p => ({ id: p.id, text: p.text })),
          dataset: dataset,
          assertions: assertions.map(a => ({ type: a.type, value: a.value })),
        });
        setLastEvaluatedProject(currentProjectHash);

        // Automatically switch to Results tab
        setActiveTab('results');
        console.log('Switched to results tab');

        // Determine success message based on what ran
        let successMsg = '';
        if (functionalTestsSucceeded && securityTestsSucceeded) {
          successMsg = 'Functional and Security evaluations completed';
        } else if (securityTestsSucceeded) {
          successMsg = 'Security evaluation completed';
        } else {
          successMsg = 'Evaluation completed';
        }
        toast.success(successMsg);

        // Open HTML report if option is enabled and result exists
        if (options.openReportAfterTest && options.outputPath && evalResult.functionalResult?.htmlPath) {
          try {
            const openResult = await EvaluationService.openHtmlReport(evalResult.functionalResult.htmlPath);
            if (!openResult.success) {
              console.error('Failed to open HTML report:', openResult.error);
            }
          } catch (error: any) {
            console.error('Failed to open HTML report:', error);
            // Don't show a toast - the evaluation succeeded, just opening failed
          }
        }
      } else if (evalResult.functionalResult?.aborted || evalResult.securityResult?.aborted) {
        toast.warning('Evaluation was aborted');
      } else {
        // Even if evaluation failed, show completed message
        toast.success('Evaluation completed');
      }
    } catch (error: any) {
      toast.error(`Failed to run evaluation: ${error.message}`);
    } finally {
      setIsRunning(false);
      setCurrentRunId(null);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleAbortEval = async () => {
    if (!currentRunId) return;

    const result = await EvaluationService.abortEvaluation(currentRunId);
    if (result.success) {
      toast.warning('Aborting evaluation...');
    } else {
      toast.error(result.error || 'Failed to abort evaluation');
    }
  };

  const handleProjectNameChange = (value: string) => {
    setProjectName(value);

    // Validate project name using ValidationService
    const validation = ValidationService.validateProjectName(value);
    if (!validation.valid) {
      setProjectNameError(validation.error || 'Invalid project name');
    } else {
      setProjectNameError(null);
    }
  };

  const handleLoadProject = (loadedProject: Project) => {
    setProjectName(loadedProject.name);
    setProjectNameError(null);
    setProviders(loadedProject.providers);
    setPrompts(loadedProject.prompts);
    setDataset(loadedProject.dataset);
    setAssertions(loadedProject.assertions);

    // Merge loaded options with defaults to ensure required fields are present
    const defaultOptions = {
      outputPath: userDataPath ? `${userDataPath}/output.html` : '~/Library/Application Support/prompt-evaluator/output.html',
      jsonOutputPath: userDataPath ? `${userDataPath}/output.json` : '~/Library/Application Support/prompt-evaluator/output.json',
      maxConcurrency: 4,
      cache: false,
      openReportAfterTest: false,
    };

    setOptions({
      ...defaultOptions,
      ...(loadedProject.options || {}),
    });

    console.log('[handleLoadProject] Loaded project with merged options:', {
      ...defaultOptions,
      ...(loadedProject.options || {}),
    });
  };

  const handleCreateNewProject = () => {
    // Reset everything to a fresh state
    setProjectName('My New Project');
    setProjectNameError(null);
    setProviders([]);
    setPrompts([]);
    setDataset({ name: '', headers: [], rows: [] }); // Empty dataset to show input interface
    setAssertions([]);
    const newOptions = {
      outputPath: userDataPath ? `${userDataPath}/output.html` : '~/Library/Application Support/prompt-evaluator/output.html',
      jsonOutputPath: userDataPath ? `${userDataPath}/output.json` : '~/Library/Application Support/prompt-evaluator/output.json',
      maxConcurrency: 4,
      cache: false,
      openReportAfterTest: false,
    };
    console.log('[handleCreateNewProject] Setting new options:', newOptions);
    setOptions(newOptions);
    setResults(null);
    setSecurityResults(null);
    setLastEvaluatedProject(null); // Reset to allow new evaluations
    setAiAnalysis(null); // Clear AI analysis
    setActiveTab('dataset'); // Start on dataset tab to add data
    logger.info('ui', 'Created new project');
  };

  const handleApplySuggestions = (suggestions: string[]) => {
    // Parse suggestions and create suggested prompts
    // All suggestions will be appended at the end of the prompt

    if (!suggestions || suggestions.length === 0) {
      toast.warning('No suggestions found to apply');
      return;
    }

    // Create suggested prompts by appending all suggestions at the end
    const newSuggestedPrompts = prompts.map((prompt) => {
      // Start with the original prompt text
      let updatedText = prompt.text.trim();

      // Add a separator and append all suggestions
      updatedText += '\n\n---\n\n';
      updatedText += '## AI-SUGGESTED IMPROVEMENTS:\n\n';

      // Add each suggestion as a numbered item
      suggestions.forEach((suggestion, index) => {
        // Use the full suggestion text, no extraction
        updatedText += `${index + 1}. ${suggestion}\n\n`;
      });

      return {
        ...prompt,
        text: updatedText.trim(),
      };
    });

    setSuggestedPrompts(newSuggestedPrompts);
    setActiveTab('prompts'); // Switch to prompts tab to show the diff
    toast.info('Review suggested prompt changes in the Prompts tab');
  };

  const handleAcceptSuggestions = () => {
    if (!suggestedPrompts) return;

    setPrompts(suggestedPrompts);
    setSuggestedPrompts(null);
    setShowRerunConfirmation(true);
  };

  const handleRejectSuggestions = () => {
    setSuggestedPrompts(null);
    toast.info('Prompt suggestions discarded');
  };

  const handleConfirmRerun = () => {
    setShowRerunConfirmation(false);
    handleRunEval();
  };

  const handleCancelRerun = () => {
    setShowRerunConfirmation(false);
    toast.info('You can manually run the evaluation when ready');
  };

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'prompts', label: 'Prompts', badge: prompts.length },
    { id: 'providers', label: 'Providers', badge: providers.length },
    { id: 'dataset', label: 'Dataset', badge: dataset?.rows.length },
    { id: 'assertions', label: 'Assertions', badge: assertions.length },
    { id: 'results', label: 'Results' },
    { id: 'history', label: 'History' },
  ];

  // Show loader while initializing
  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <TutorialOverlay />

      <FileBar
        project={project}
        onLoadProject={handleLoadProject}
        onRunEval={handleRunEval}
        isRunning={isRunning}
        hasValidationErrors={hasProviderErrors || hasPromptErrors || !!projectNameError}
        onValidateProviders={() => setShouldValidateProviders(true)}
        onValidatePrompts={() => setShouldValidatePrompts(true)}
        onPreviewYaml={() => {
          logger.info('ui', 'Preview YAML button clicked', { yamlView: activeYamlView });
          setShowYamlPreview(true);
        }}
        activeYamlView={activeYamlView}
        onYamlViewChange={setActiveYamlView}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenDocumentation={() => setShowDocumentation(true)}
        onNavigateToDashboard={() => setActiveTab('dashboard')}
        onCreateNewProject={handleCreateNewProject}
      />

      {/* Promptfoo CLI check removed - GUI app has built-in evaluation functionality */}

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - tabs */}
        <div className="w-64 border-r bg-gray-50 dark:bg-gray-800 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => handleProjectNameChange(e.target.value)}
              maxLength={100}
              className={`w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                projectNameError ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              placeholder="e.g., My Evaluation"
            />
            {projectNameError && (
              <p className="mt-1 text-xs text-red-600">{projectNameError}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {projectName.length}/100 characters
              {projectName.length >= 100 && <span className="text-orange-600 ml-1">(Maximum reached)</span>}
            </p>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {tabs.map((tab) => {
              const isDisabledByProviders = activeTab === 'providers' && tab.id !== 'providers' && hasProviderErrors;
              const isDisabledByPrompts = activeTab === 'prompts' && tab.id !== 'prompts' && hasPromptErrors;
              const isDisabled = isDisabledByProviders || isDisabledByPrompts;

              const tooltipMessage = isDisabledByProviders
                ? 'Fix provider validation errors to enable navigation'
                : isDisabledByPrompts
                ? 'Fix prompt validation errors to enable navigation'
                : '';

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={isDisabled}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : isDisabled
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title={tooltipMessage}
                >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
              );
            })}
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto p-6 flex flex-col dark:bg-gray-900">
          <div className="flex-1">
            {activeTab === 'providers' && (
              <div className="providers-form">
                <ProvidersForm
                  providers={providers}
                  onChange={setProviders}
                  onValidationChange={setHasProviderErrors}
                  shouldValidate={shouldValidateProviders}
                />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="h-full dashboard-view">
                <Dashboard
                  onNavigate={setActiveTab}
                  projectOptions={options}
                  onReRunLastEvaluation={handleRunEval}
                />
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="prompts-form">
                <PromptsForm
                  prompts={prompts}
                  onChange={setPrompts}
                  onValidationChange={setHasPromptErrors}
                  shouldValidate={shouldValidatePrompts}
                  suggestedPrompts={suggestedPrompts}
                  onAcceptSuggestions={handleAcceptSuggestions}
                  onRejectSuggestions={handleRejectSuggestions}
                />
              </div>
            )}

            {activeTab === 'dataset' && (
              <div className="dataset-form">
                <DatasetForm
                  dataset={dataset}
                  onChange={setDataset}
                  prompts={prompts}
                  options={options}
                  onUnsavedDataChange={setHasUnsavedDatasetData}
                  validationError={missingExpectedOutputError}
                />
              </div>
            )}

            {activeTab === 'assertions' && (
              <div className="assertions-form">
                <AssertionsForm assertions={assertions} onChange={setAssertions} providers={providers} prompts={prompts} dataset={dataset} onDatasetChange={setDataset} options={options} />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-form">
                <OptionsForm
                  options={options}
                  onChange={setOptions}
                />
              </div>
            )}

            {activeTab === 'results' && (
              <div className="h-full results-view">
                {results ? (
                  <div className="relative h-full">
                    <RunResults
                      results={results}
                      securityResults={securityResults}
                      aiAnalysis={aiAnalysis}
                      onAiAnalysisChange={setAiAnalysis}
                      onApplySuggestions={handleApplySuggestions}
                      projectOptions={options}
                      onClose={() => {
                        setResults(null);
                        setSecurityResults(null);
                      }}
                      onRefresh={(newResults) => setResults(newResults)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📊</div>
                      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Test Results Cleared</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Test results are cleared. Refresh the page to see the last test report.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={async () => {
                            if (!window.api?.readJsonResults || !options.jsonOutputPath) {
                              return;
                            }
                            try {
                              const result = await window.api.readJsonResults(options.jsonOutputPath);
                              if (result.success && result.results) {
                                setResults(result.results);
                              }
                            } catch (error) {
                              console.error('Failed to refresh results:', error);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="h-full">
                <History projectOptions={options} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
          </div>
        </div>
      </div>

      {/* YAML Preview Modal */}
      {showYamlPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[90vw] max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">YAML Configuration Preview</h2>
                    <p className="text-xs text-white/80 mt-0.5">
                      Preview your Promptfoo configuration
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowYamlPreview(false)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <YamlPreview project={project} yamlType={activeYamlView} />
            </div>
          </div>
        </div>
      )}

      {/* Re-run Confirmation Dialog */}
      {showRerunConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Re-run Tests?</h2>
                  <p className="text-sm text-white/80 mt-1">
                    Test with updated prompts
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                You've successfully applied the AI-suggested prompt changes. Would you like to re-run the evaluation with the updated prompts to see if the improvements are effective?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelRerun}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                >
                  Not Now
                </button>
                <button
                  onClick={handleConfirmRerun}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Tests Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs modal - Redesigned */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Evaluation Logs</h2>
                    <p className="text-sm text-white/80 mt-1">
                      {isRunning ? 'Tests are running...' : 'Evaluation complete'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isRunning && (
                    <button
                      onClick={handleAbortEval}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 shadow-lg transition-all hover:scale-105 font-semibold"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Abort Evaluation
                    </button>
                  )}
                  {!isRunning && (
                    <button
                      onClick={() => setShowLogs(false)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all font-semibold"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Section */}
              {isRunning && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold">
                        Running evaluation
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logs Content */}
            <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <svg className="w-16 h-16 mb-4 opacity-50 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-lg font-semibold">Initializing evaluation...</div>
                  <div className="text-sm mt-2">Logs will appear here</div>
                </div>
              )}
              <div className="font-mono text-sm space-y-1">
                {logs.map((log, index) => {
                  // Color code different log types
                  let logClass = 'text-green-400';
                  if (log.includes('✓') || log.toLowerCase().includes('pass') || log.toLowerCase().includes('success')) {
                    logClass = 'text-green-400 font-semibold';
                  } else if (log.includes('✗') || log.toLowerCase().includes('fail') || log.toLowerCase().includes('error')) {
                    logClass = 'text-red-400 font-semibold';
                  } else if (log.toLowerCase().includes('warn')) {
                    logClass = 'text-yellow-400';
                  } else if (log.toLowerCase().includes('info')) {
                    logClass = 'text-blue-400';
                  } else if (log.match(/\d+\/\d+/)) {
                    logClass = 'text-purple-400 font-semibold';
                  }

                  return (
                    <div
                      key={index}
                      className={`whitespace-pre-wrap ${logClass} leading-relaxed hover:bg-white/5 px-2 py-1 rounded transition-colors`}
                    >
                      {log}
                    </div>
                  );
                })}
                {isRunning && (
                  <div className="flex items-center gap-2 mt-4 text-blue-400 text-base font-semibold">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="animate-pulse">Processing evaluation...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-3 flex items-center justify-between text-sm">
              <div className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{logs.length} log entries</span>
              </div>
              <div className="text-gray-600">
                {isRunning ? (
                  <span className="flex items-center gap-2 text-blue-600 font-semibold">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    Evaluation in progress
                  </span>
                ) : (
                  <span className="text-green-600 font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Evaluation finished
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Settings</h2>
                    <p className="text-xs text-white/80 mt-0.5">
                      Configure application settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseSettingsModal}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <OptionsForm
                options={options}
                onChange={setOptions}
              />
            </div>
          </div>
        </div>
      )}


      {/* Documentation Modal */}
      {showDocumentation && (
        <Documentation onClose={() => setShowDocumentation(false)} />
      )}
    </div>
  );
}

export default App;
