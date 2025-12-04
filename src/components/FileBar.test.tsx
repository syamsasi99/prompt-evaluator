import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileBar } from './FileBar';
import type { Project } from '../lib/types';
import { ToastProvider } from '../contexts/ToastContext';
import { TutorialProvider } from '../contexts/TutorialContext';
import { DarkModeProvider } from '../contexts/DarkModeContext';

// Mock dependencies
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../lib/buildYaml', () => ({
  buildPromptfooYaml: vi.fn(() => 'mock yaml content'),
  buildSecurityTestYaml: vi.fn(() => 'mock security yaml content'),
}));

vi.mock('./ProjectSwitcher', () => ({
  ProjectSwitcher: ({ onClose }: any) => (
    <div data-testid="project-switcher">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockExportYaml = vi.fn();
const mockSaveProject = vi.fn();
const mockLoadProject = vi.fn();
const mockGetVersion = vi.fn();
const mockGetMetadataStore = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    exportYaml: mockExportYaml,
    saveProject: mockSaveProject,
    loadProject: mockLoadProject,
    getVersion: mockGetVersion,
    getMetadataStore: mockGetMetadataStore,
  };

  mockGetVersion.mockResolvedValue('1.0.0');
  mockGetMetadataStore.mockResolvedValue({ recentProjects: [] });
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <TutorialProvider>
        <DarkModeProvider>
          {ui}
        </DarkModeProvider>
      </TutorialProvider>
    </ToastProvider>
  );
};

const mockProject: Project = {
  name: 'Test Project',
  providers: [{ id: 'provider-1', providerId: 'openai:gpt-4', config: {} }],
  prompts: [{ id: 'prompt-1', label: 'Test Prompt', text: 'Test prompt text' }],
  dataset: { name: 'test', headers: [], rows: [] },
  assertions: [],
  options: {
    outputPath: './output.html',
    jsonOutputPath: './output.json',
    maxConcurrency: 4,
    cache: false,
    openReportAfterTest: false,
  },
};

describe('FileBar', () => {
  let mockOnLoadProject: ReturnType<typeof vi.fn>;
  let mockOnRunEval: ReturnType<typeof vi.fn>;
  let mockOnValidateProviders: ReturnType<typeof vi.fn>;
  let mockOnValidatePrompts: ReturnType<typeof vi.fn>;
  let mockOnPreviewYaml: ReturnType<typeof vi.fn>;
  let mockOnNavigateToDashboard: ReturnType<typeof vi.fn>;
  let mockOnOpenSettings: ReturnType<typeof vi.fn>;
  let mockOnOpenDocumentation: ReturnType<typeof vi.fn>;
  let mockOnCreateNewProject: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnLoadProject = vi.fn();
    mockOnRunEval = vi.fn();
    mockOnValidateProviders = vi.fn();
    mockOnValidatePrompts = vi.fn();
    mockOnPreviewYaml = vi.fn();
    mockOnNavigateToDashboard = vi.fn();
    mockOnOpenSettings = vi.fn();
    mockOnOpenDocumentation = vi.fn();
    mockOnCreateNewProject = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the file bar header', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      expect(screen.getByText('Prompt Evaluator')).toBeInTheDocument();
    });

    it('should display app version', async () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/v1.0.0/)).toBeInTheDocument();
      });
    });

    it('should render dashboard button when callback provided', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          onNavigateToDashboard={mockOnNavigateToDashboard}
        />
      );

      const dashboardButton = screen.getByTitle('Dashboard');
      expect(dashboardButton).toBeInTheDocument();
    });

    it('should render run button', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      expect(screen.getByRole('button', { name: /Run Evaluation/i })).toBeInTheDocument();
    });

    it('should show running state when evaluation is running', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={true}
        />
      );

      const runButton = screen.getByRole('button', { name: /Running.../i });
      expect(runButton).toBeDisabled();
    });

    it('should render run button even with validation errors', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          hasValidationErrors={true}
        />
      );

      // Button is rendered but validation is checked in click handler
      const runButton = screen.getByRole('button', { name: /Run Evaluation/i });
      expect(runButton).toBeInTheDocument();
      expect(runButton).not.toBeDisabled();
    });
  });

  describe('Run Evaluation', () => {
    it('should call onRunEval when run button is clicked', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      const runButton = screen.getByRole('button', { name: /Run Evaluation/i });
      fireEvent.click(runButton);

      expect(mockOnRunEval).toHaveBeenCalledTimes(1);
    });

    it('should validate context-relevance assertion requirements', () => {
      const projectWithContextRelevance = {
        ...mockProject,
        assertions: [{ type: 'context-relevance', value: '', id: 'assert-1' }],
        dataset: {
          name: 'test',
          headers: ['question'], // Missing 'query' and 'context'
          rows: [{ question: 'test' }],
        },
      };

      renderWithProviders(
        <FileBar
          project={projectWithContextRelevance}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      const runButton = screen.getByRole('button', { name: /Run Evaluation/i });
      fireEvent.click(runButton);

      // Should not call onRunEval due to missing required columns
      expect(mockOnRunEval).not.toHaveBeenCalled();
    });
  });

  describe('Export YAML', () => {
    it('should export YAML successfully', async () => {
      mockExportYaml.mockResolvedValue('/path/to/yaml');

      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      // Open actions menu
      const actionsButton = screen.getByRole('button', { name: /Actions/i });
      fireEvent.click(actionsButton);

      // Click export YAML
      const exportButton = screen.getByRole('button', { name: /Export YAML/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportYaml).toHaveBeenCalledWith('mock yaml content', 'promptfooconfig.yaml');
      });
    });

    it('should block export when there are validation errors', async () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          hasValidationErrors={true}
          onValidateProviders={mockOnValidateProviders}
          onValidatePrompts={mockOnValidatePrompts}
        />
      );

      const actionsButton = screen.getByRole('button', { name: /Actions/i });
      fireEvent.click(actionsButton);

      const exportButton = screen.getByRole('button', { name: /Export YAML/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportYaml).not.toHaveBeenCalled();
      });
    });

    it('should validate project name before export', async () => {
      const invalidProject = { ...mockProject, name: '' };

      renderWithProviders(
        <FileBar
          project={invalidProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      const actionsButton = screen.getByRole('button', { name: /Actions/i });
      fireEvent.click(actionsButton);

      const exportButton = screen.getByRole('button', { name: /Export YAML/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportYaml).not.toHaveBeenCalled();
      });
    });
  });

  describe('Save Project', () => {
    it('should save project successfully', async () => {
      mockSaveProject.mockResolvedValue('/path/to/project.json');

      const { container } = renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      // Find button by its SVG path (save icon)
      const saveButton = container.querySelector('button svg path[d*="M8 7H5a2"]')?.closest('button');
      expect(saveButton).toBeInTheDocument();

      if (saveButton) {
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockSaveProject).toHaveBeenCalled();
        });
      }
    });

    it('should block save when there are validation errors', async () => {
      const { container } = renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          hasValidationErrors={true}
          onValidateProviders={mockOnValidateProviders}
          onValidatePrompts={mockOnValidatePrompts}
        />
      );

      const saveButton = container.querySelector('button svg path[d*="M8 7H5a2"]')?.closest('button');
      expect(saveButton).toBeInTheDocument();

      if (saveButton) {
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockSaveProject).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('Load Project', () => {
    it('should load project successfully', async () => {
      const loadedProject = { ...mockProject, name: 'Loaded Project' };
      mockLoadProject.mockResolvedValue(loadedProject);

      const { container } = renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      // Find button by its SVG path (folder/load icon)
      const loadButton = container.querySelector('button svg path[d*="M5 19a2"]')?.closest('button');
      expect(loadButton).toBeInTheDocument();

      if (loadButton) {
        fireEvent.click(loadButton);

        await waitFor(() => {
          expect(mockOnLoadProject).toHaveBeenCalledWith(loadedProject);
        });
      }
    });

    it('should handle load cancellation', async () => {
      mockLoadProject.mockResolvedValue(null);

      const { container } = renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      const loadButton = container.querySelector('button svg path[d*="M5 19a2"]')?.closest('button');
      expect(loadButton).toBeInTheDocument();

      if (loadButton) {
        fireEvent.click(loadButton);

        await waitFor(() => {
          expect(mockOnLoadProject).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('Preview YAML', () => {
    it('should call onPreviewYaml when preview button is clicked', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          onPreviewYaml={mockOnPreviewYaml}
        />
      );

      const previewButton = screen.getByRole('button', { name: /Preview/i });
      fireEvent.click(previewButton);

      expect(mockOnPreviewYaml).toHaveBeenCalledTimes(1);
    });

    it('should show preview dropdown with yaml view options', () => {
      const projectWithSecurity = {
        ...mockProject,
        options: {
          ...mockProject.options,
          enableSecurityTests: true,
        },
      };

      renderWithProviders(
        <FileBar
          project={projectWithSecurity}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          onPreviewYaml={mockOnPreviewYaml}
        />
      );

      const previewButton = screen.getByTitle('Preview YAML');
      fireEvent.click(previewButton);

      // Should show main and security options
      expect(screen.getByText(/Main/i)).toBeInTheDocument();
    });
  });

  describe('Dark Mode Toggle', () => {
    it('should toggle dark mode', async () => {
      const { container } = renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      // Find dark mode button by the moon SVG icon
      const darkModeButton = container.querySelector('button svg path[d*="17.293 13.293"]')?.closest('button');
      expect(darkModeButton).toBeInTheDocument();

      if (darkModeButton) {
        fireEvent.click(darkModeButton);

        // Dark mode should toggle
        await waitFor(() => {
          expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
      }
    });
  });

  describe('Navigation', () => {
    it('should navigate to dashboard when button is clicked', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          onNavigateToDashboard={mockOnNavigateToDashboard}
        />
      );

      const dashboardButton = screen.getByTitle('Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockOnNavigateToDashboard).toHaveBeenCalledTimes(1);
    });

    it('should open settings when button is clicked', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /Settings/i });
      fireEvent.click(settingsButton);

      expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('should open documentation when button is clicked', () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
          onOpenDocumentation={mockOnOpenDocumentation}
        />
      );

      // Open the actions menu first
      const actionsButton = screen.getByTitle('More actions');
      fireEvent.click(actionsButton);

      // Then click the documentation button in the menu
      const docsButton = screen.getByText(/Help & Documentation/i);
      fireEvent.click(docsButton);

      expect(mockOnOpenDocumentation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Project Switcher', () => {
    it.skip('should open project switcher', async () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      const projectsButton = screen.getByTitle('Recent Projects');
      fireEvent.click(projectsButton);

      await waitFor(() => {
        expect(screen.getByTestId('project-switcher')).toBeInTheDocument();
      });
    });

    it.skip('should close project switcher', async () => {
      renderWithProviders(
        <FileBar
          project={mockProject}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      const projectsButton = screen.getByTitle('Recent Projects');
      fireEvent.click(projectsButton);

      await waitFor(() => {
        expect(screen.getByTestId('project-switcher')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('project-switcher')).not.toBeInTheDocument();
      });
    });
  });

  describe('Security Tests', () => {
    it.skip('should show security badge when security assertions exist', () => {
      const projectWithSecurity = {
        ...mockProject,
        assertions: [
          { type: 'security-prompt-injection', value: '', id: 'assert-1' },
          { type: 'security-pii', value: '', id: 'assert-2' },
        ],
      };

      renderWithProviders(
        <FileBar
          project={projectWithSecurity}
          onLoadProject={mockOnLoadProject}
          onRunEval={mockOnRunEval}
          isRunning={false}
        />
      );

      // Security count badge might be in multiple places, use getAllByText
      const badges = screen.getAllByText('2');
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
