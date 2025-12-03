import React, { useState } from 'react';
import type { Project } from '../lib/types';
import { buildPromptfooYaml, buildSecurityTestYaml } from '../lib/buildYaml';
import { ProjectNameSchema } from '../lib/schemas';
import { useToast } from '../contexts/ToastContext';
import { useTutorial } from '../contexts/TutorialContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { logger } from '../lib/logger';
import { ProjectSwitcher } from './ProjectSwitcher';

interface FileBarProps {
  project: Project;
  onLoadProject: (project: Project) => void;
  onRunEval: () => void;
  isRunning: boolean;
  hasValidationErrors?: boolean;
  onValidateProviders?: () => void;
  onValidatePrompts?: () => void;
  onPreviewYaml?: () => void;
  activeYamlView?: 'main' | 'security';
  onYamlViewChange?: (view: 'main' | 'security') => void;
  onOpenSettings?: () => void;
  onOpenDocumentation?: () => void;
  onNavigateToDashboard?: () => void;
  onCreateNewProject?: () => void;
}

export function FileBar({ project, onLoadProject, onRunEval, isRunning, hasValidationErrors, onValidateProviders, onValidatePrompts, onPreviewYaml, activeYamlView = 'main', onYamlViewChange, onOpenSettings, onOpenDocumentation, onNavigateToDashboard, onCreateNewProject }: FileBarProps) {
  const toast = useToast();
  const tutorial = useTutorial();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const securityAssertionsCount = project.assertions.filter(a => a.type.startsWith('security-')).length;
  const [appVersion, setAppVersion] = useState<string>('');
  const [showPreviewDropdown, setShowPreviewDropdown] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);

  React.useEffect(() => {
    if (window.api?.getVersion) {
      window.api.getVersion().then(setAppVersion);
    }
  }, []);

  // Load recent projects on mount
  React.useEffect(() => {
    if (window.api?.getMetadataStore) {
      window.api.getMetadataStore().then((store: any) => {
        setRecentProjects(store.recentProjects || []);
      }).catch((error: any) => {
        console.error('Failed to load recent projects:', error);
      });
    }
  }, []);

  const validateAssertions = (): boolean => {
    // Check if context-relevance assertion is used
    const hasContextRelevance = project.assertions.some(a => a.type === 'context-relevance');

    if (hasContextRelevance) {
      // Check if dataset has required columns
      const datasetHeaders = project.dataset?.headers || [];
      const datasetRows = project.dataset?.rows || [];

      // Get column names from first row if headers not explicitly set
      const columns = datasetHeaders.length > 0
        ? datasetHeaders
        : (datasetRows.length > 0 ? Object.keys(datasetRows[0]) : []);

      const hasQuery = columns.includes('query');
      const hasContext = columns.includes('context');

      if (!hasQuery || !hasContext) {
        const missing = [];
        if (!hasQuery) missing.push('"query"');
        if (!hasContext) missing.push('"context"');

        toast.error(
          `Context Relevance assertion requires ${missing.join(' and ')} column${missing.length > 1 ? 's' : ''} in your dataset. ` +
          `Please add ${missing.length > 1 ? 'these columns' : 'this column'} to your dataset.`
        );
        return false;
      }
    }

    return true;
  };

  const handleRunEval = () => {
    if (!validateAssertions()) {
      return;
    }
    onRunEval();
  };

  const handleExportYaml = async () => {
    try {
      logger.info('ui', 'Export YAML button clicked', { projectName: project.name });

      // Trigger validation before checking
      onValidateProviders?.();
      onValidatePrompts?.();

      // Small delay to allow validation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for validation errors
      if (hasValidationErrors) {
        logger.warn('ui', 'Export YAML blocked: validation errors present');
        toast.warning('Please fix all validation errors before exporting YAML.');
        return;
      }

      // Validate project name
      const validationResult = ProjectNameSchema.safeParse(project.name);
      if (!validationResult.success) {
        logger.warn('ui', 'Export YAML blocked: invalid project name', { error: validationResult.error.errors[0].message });
        toast.error(`Invalid project name: ${validationResult.error.errors[0].message}`);
        return;
      }

      if (!window.api?.exportYaml) {
        logger.warn('ui', 'Export YAML failed: Electron API not available');
        toast.error('This feature requires running the app in Electron mode.');
        return;
      }

      // Export YAML without API keys for security
      const yamlContent = buildPromptfooYaml(project, { includeApiKeys: false });
      const filePath = await window.api.exportYaml(
        yamlContent,
        'promptfooconfig.yaml'
      );

      if (filePath) {
        logger.info('ui', 'YAML exported successfully', { projectName: project.name, filePath });
        toast.success(`YAML exported successfully!`);
      } else {
        logger.info('ui', 'Export YAML cancelled by user');
      }
    } catch (error: any) {
      logger.error('ui', 'Failed to export YAML', { projectName: project.name, error: error.message });
      toast.error(`Failed to export YAML: ${error.message}`);
    }
  };

  const handleSaveProject = async () => {
    try {
      logger.info('ui', 'Save Project button clicked', { projectName: project.name });

      // Trigger validation before checking
      onValidateProviders?.();
      onValidatePrompts?.();

      // Small delay to allow validation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for validation errors
      if (hasValidationErrors) {
        logger.warn('ui', 'Save Project blocked: validation errors present');
        toast.warning('Please fix all validation errors before saving project.');
        return;
      }

      // Validate project name
      const validationResult = ProjectNameSchema.safeParse(project.name);
      if (!validationResult.success) {
        logger.warn('ui', 'Save Project blocked: invalid project name', { error: validationResult.error.errors[0].message });
        toast.error(`Invalid project name: ${validationResult.error.errors[0].message}`);
        return;
      }

      if (!window.api?.saveProject) {
        logger.warn('ui', 'Save Project failed: Electron API not available');
        toast.error('This feature requires running the app in Electron mode.');
        return;
      }

      const filePath = await window.api.saveProject(
        project,
        `${project.name}.json`
      );

      if (filePath) {
        logger.info('ui', 'Project saved successfully', { projectName: project.name, filePath });
        toast.success(`Project saved successfully!`);
      } else {
        logger.info('ui', 'Save Project cancelled by user');
      }
    } catch (error: any) {
      logger.error('ui', 'Failed to save project', { projectName: project.name, error: error.message });
      toast.error(`Failed to save project: ${error.message}`);
    }
  };

  const handleLoadProject = async () => {
    try {
      logger.info('ui', 'Load Project button clicked');

      if (!window.api?.loadProject) {
        logger.warn('ui', 'Load Project failed: Electron API not available');
        toast.error('This feature requires running the app in Electron mode.');
        return;
      }

      const loadedProject = await window.api.loadProject();

      if (loadedProject) {
        logger.info('ui', 'Project loaded successfully', { projectName: loadedProject.name });
        onLoadProject(loadedProject);
        toast.success('Project loaded successfully!');
      } else {
        logger.info('ui', 'Load Project cancelled by user');
      }
    } catch (error: any) {
      logger.error('ui', 'Failed to load project', { error: error.message });
      toast.error(`Failed to load project: ${error.message}`);
    }
  };

  return (
    <div className="border-b bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section - Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Prompt Evaluator
            </h1>
            {appVersion && (
              <span className="text-xs text-gray-400">v{appVersion}</span>
            )}
          </div>

          {/* Dashboard Button - Icon Only */}
          {onNavigateToDashboard && (
            <button
              onClick={() => {
                logger.info('ui', 'Dashboard button clicked');
                onNavigateToDashboard();
              }}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
              title="Dashboard"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          )}

          {/* Recent Projects Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-2"
              title="Recent Projects"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="max-w-[200px] truncate">{project.name}</span>
              <svg className={`w-4 h-4 transition-transform ${showProjectsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Recent Projects Dropdown Menu */}
            {showProjectsDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProjectsDropdown(false)}
                />
                <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20 max-h-96 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Projects</p>
                  </div>

                  {recentProjects.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <p>No recent projects</p>
                      <p className="text-xs text-gray-400 mt-1">Save a project to see it here</p>
                    </div>
                  ) : (
                    <>
                      {recentProjects.slice(0, 5).map((proj: any) => {
                        const getRelativeTime = (isoString: string): string => {
                          const date = new Date(isoString);
                          const now = new Date();
                          const diffMs = now.getTime() - date.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);

                          if (diffMins < 1) return 'Just now';
                          if (diffMins < 60) return `${diffMins}m ago`;
                          if (diffHours < 24) return `${diffHours}h ago`;
                          if (diffDays === 1) return 'Yesterday';
                          if (diffDays < 7) return `${diffDays}d ago`;
                          return date.toLocaleDateString();
                        };

                        return (
                          <button
                            key={proj.id}
                            onClick={async () => {
                              try {
                                const loadedProject = await window.api.loadProjectByPath(proj.filePath);
                                onLoadProject(loadedProject);
                                setShowProjectsDropdown(false);
                                toast.success(`Loaded project: ${proj.name}`);

                                // Update last opened time
                                await window.api.updateRecentProject({
                                  ...proj,
                                  lastOpened: new Date().toISOString(),
                                });
                              } catch (error: any) {
                                toast.error(`Failed to load project: ${error.message}`);
                              }
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                          >
                            {proj.favorite ? (
                              <span className="text-yellow-500">⭐</span>
                            ) : (
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{proj.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-gray-500 dark:text-gray-400">{getRelativeTime(proj.lastOpened)}</p>
                                {proj.provider && (
                                  <>
                                    <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{proj.provider.split(':')[1] || proj.provider}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  <div className="border-t border-gray-100 mt-2 pt-2">
                    {recentProjects.length > 0 && (
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to clear all recent projects? This cannot be undone.')) {
                            try {
                              await window.api.clearRecentProjects();
                              // Reload metadata to update UI
                              const store = await window.api.getMetadataStore();
                              setRecentProjects(store.recentProjects || []);
                              toast.success('Recent projects cleared');
                              setShowProjectsDropdown(false);
                            } catch (error: any) {
                              toast.error(`Failed to clear recent projects: ${error.message}`);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Recent Projects
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowProjectsDropdown(false);
                        setShowProjectSwitcher(true);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                      </svg>
                      Browse All Projects...
                    </button>
                    <button
                      onClick={() => {
                        setShowProjectsDropdown(false);
                        if (onCreateNewProject) {
                          onCreateNewProject();
                          toast.success('Created new project!');
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create New Project
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* YAML Switcher - Compact */}
          {project.options?.enableSecurityTests && securityAssertionsCount > 0 && onYamlViewChange && (
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-gray-50">
              <button
                onClick={() => onYamlViewChange('main')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeYamlView === 'main'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                Main
              </button>
              <button
                onClick={() => onYamlViewChange('security')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  activeYamlView === 'security'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Security
              </button>
            </div>
          )}
        </div>

        {/* Right Section - Primary Actions */}
        <div className="flex items-center gap-2">
          {/* Load Project */}
          <button
            onClick={handleLoadProject}
            className="group relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            {/* Tooltip */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Load Project
            </span>
          </button>

          {/* Save Project */}
          <button
            onClick={handleSaveProject}
            className="group relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {/* Tooltip */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Save Project
            </span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="group relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {/* Tooltip */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Settings
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="group relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-yellow-500 group-hover:text-yellow-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
            {/* Tooltip */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* More Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="More actions"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      handleLoadProject();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                    Load Project
                  </button>

                  <button
                    onClick={() => {
                      handleSaveProject();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Project
                  </button>

                  <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                  <button
                    onClick={() => {
                      handleExportYaml();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <svg className="w-5 h-5 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export YAML
                  </button>

                  <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                  <button
                    onClick={() => {
                      tutorial.startTutorial();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Start Tutorial
                  </button>

                  <button
                    onClick={() => {
                      onOpenSettings?.();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      onOpenDocumentation?.();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help & Documentation
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Preview YAML - Icon Button with Dropdown when Security Enabled */}
          <div className="relative">
            <button
              onClick={() => {
                if (project.options?.enableSecurityTests) {
                  setShowPreviewDropdown(!showPreviewDropdown);
                } else {
                  onYamlViewChange?.('main');
                  onPreviewYaml?.();
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={project.options?.enableSecurityTests ? "Preview YAML" : `Preview Main YAML`}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>

            {/* Dropdown Menu for YAML Preview Options */}
            {showPreviewDropdown && project.options?.enableSecurityTests && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowPreviewDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onYamlViewChange?.('main');
                      onPreviewYaml?.();
                      setShowPreviewDropdown(false);
                      logger.info('ui', 'Preview Main YAML clicked from dropdown');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>View Main YAML</span>
                  </button>
                  <button
                    onClick={() => {
                      onYamlViewChange?.('security');
                      onPreviewYaml?.();
                      setShowPreviewDropdown(false);
                      logger.info('ui', 'Preview Security YAML clicked from dropdown');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>View Security YAML</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Run Evaluation - Primary CTA */}
          <button
            onClick={handleRunEval}
            disabled={isRunning}
            className="run-eval-button px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-sm font-medium shadow-sm transition-all flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Evaluation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Project Switcher Modal */}
      {showProjectSwitcher && (
        <ProjectSwitcher
          onClose={() => setShowProjectSwitcher(false)}
          onLoadProject={onLoadProject}
          currentProject={project}
        />
      )}
    </div>
  );
}
