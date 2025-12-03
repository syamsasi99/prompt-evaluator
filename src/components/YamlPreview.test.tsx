import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YamlPreview } from './YamlPreview';
import type { Project } from '../lib/types';
import * as buildYaml from '../lib/buildYaml';
import { DarkModeProvider } from '../contexts/DarkModeContext';

// Mock the buildYaml module
vi.mock('../lib/buildYaml', () => ({
  buildPromptfooYaml: vi.fn(),
  buildSecurityTestYaml: vi.fn(),
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="monaco-editor">{value}</div>
  ),
}));

// Helper to render with DarkModeProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<DarkModeProvider>{ui}</DarkModeProvider>);
};

describe('YamlPreview', () => {
  let mockProject: Project;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProject = {
      name: 'Test Project',
      providers: [
        { id: 'provider-1', providerId: 'openai:gpt-4o', config: {} },
      ],
      prompts: [
        { id: 'prompt-1', label: 'Test Prompt', text: 'Hello {{name}}' },
      ],
      assertions: [
        { id: 'assertion-1', type: 'contains', value: 'test' },
      ],
      dataset: {
        name: 'Test Dataset',
        rows: [{ name: 'Alice' }],
      },
      options: {},
    };

    // Setup default mock return values
    (buildYaml.buildPromptfooYaml as any).mockReturnValue('# Main YAML\nproviders:\n  - openai:gpt-4o');
    (buildYaml.buildSecurityTestYaml as any).mockReturnValue('# Security YAML\nasserts:\n  - type: security');
  });

  describe('Rendering', () => {
    it('should render with main YAML preview by default', () => {
      renderWithProviders(<YamlPreview project={mockProject} />);

      expect(screen.getByText('Main Config YAML Preview')).toBeInTheDocument();
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should render with security YAML preview when yamlType is security', () => {
      renderWithProviders(<YamlPreview project={mockProject} yamlType="security" />);

      expect(screen.getByText('Security Test YAML Preview')).toBeInTheDocument();
      expect(buildYaml.buildSecurityTestYaml).toHaveBeenCalledWith(mockProject, { includeApiKeys: false });
    });

    it('should display generated YAML content in Monaco editor', () => {
      renderWithProviders(<YamlPreview project={mockProject} />);

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveTextContent('# Main YAML');
      expect(editor).toHaveTextContent('providers:');
    });
  });

  describe('YAML Generation', () => {
    it('should call buildPromptfooYaml with correct parameters for main YAML', () => {
      renderWithProviders(<YamlPreview project={mockProject} />);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledWith(mockProject, { includeApiKeys: false });
      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(1);
    });

    it('should call buildSecurityTestYaml with correct parameters for security YAML', () => {
      renderWithProviders(<YamlPreview project={mockProject} yamlType="security" />);

      expect(buildYaml.buildSecurityTestYaml).toHaveBeenCalledWith(mockProject, { includeApiKeys: false });
      expect(buildYaml.buildSecurityTestYaml).toHaveBeenCalledTimes(1);
    });

    it('should not include API keys in preview for security', () => {
      renderWithProviders(<YamlPreview project={mockProject} />);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ includeApiKeys: false })
      );
    });

    it('should regenerate YAML when project changes', () => {
      const { rerender } = renderWithProviders(<YamlPreview project={mockProject} />);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(1);

      const updatedProject = {
        ...mockProject,
        name: 'Updated Project',
      };

      rerender(<DarkModeProvider><YamlPreview project={updatedProject} /></DarkModeProvider>);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(2);
      expect(buildYaml.buildPromptfooYaml).toHaveBeenLastCalledWith(updatedProject, { includeApiKeys: false });
    });

    it('should regenerate YAML when yamlType changes', () => {
      const { rerender } = renderWithProviders(<YamlPreview project={mockProject} yamlType="main" />);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(1);

      rerender(<DarkModeProvider><YamlPreview project={mockProject} yamlType="security" /></DarkModeProvider>);

      expect(buildYaml.buildSecurityTestYaml).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when YAML generation fails', () => {
      (buildYaml.buildPromptfooYaml as any).mockImplementation(() => {
        throw new Error('Invalid project configuration');
      });

      renderWithProviders(<YamlPreview project={mockProject} />);

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveTextContent('# Error generating YAML:');
      expect(editor).toHaveTextContent('# Invalid project configuration');
    });

    it('should handle security YAML generation errors', () => {
      (buildYaml.buildSecurityTestYaml as any).mockImplementation(() => {
        throw new Error('Security config error');
      });

      renderWithProviders(<YamlPreview project={mockProject} yamlType="security" />);

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveTextContent('# Error generating YAML:');
      expect(editor).toHaveTextContent('# Security config error');
    });

    it('should not crash when project is incomplete', () => {
      const incompleteProject = {
        name: 'Incomplete',
        providers: [],
        prompts: [],
        assertions: [],
      } as Project;

      (buildYaml.buildPromptfooYaml as any).mockReturnValue('# Empty YAML\n');

      expect(() => {
        renderWithProviders(<YamlPreview project={incompleteProject} />);
      }).not.toThrow();

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    let mockWriteText: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock clipboard API with a vi.fn() spy
      mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });
    });


    it('should show success message after copying', async () => {
      const user = userEvent.setup();
      renderWithProviders(<YamlPreview project={mockProject} />);

      const copyButton = screen.getByText('Copy to Clipboard');
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Successfully copied YAML data')).toBeInTheDocument();
      });
    });



  });

  describe('Monaco Editor Integration', () => {
    it('should configure Monaco editor with correct options', () => {
      renderWithProviders(<YamlPreview project={mockProject} />);

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should use YAML language mode', () => {
      renderWithProviders(<YamlPreview project={mockProject} />);

      // The monaco editor should receive yaml as the language
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should not regenerate YAML when unrelated props change', () => {
      const { rerender } = renderWithProviders(<YamlPreview project={mockProject} />);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(1);

      // Rerender with same project reference
      rerender(<DarkModeProvider><YamlPreview project={mockProject} /></DarkModeProvider>);

      // Should still be called only once due to useMemo
      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(1);
    });

    it('should regenerate YAML when project deeply changes', () => {
      const { rerender } = renderWithProviders(<YamlPreview project={mockProject} />);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(1);

      const newProject = {
        ...mockProject,
        providers: [{ id: 'provider-2', providerId: 'anthropic:claude-3-5-sonnet', config: {} }],
      };

      rerender(<DarkModeProvider><YamlPreview project={newProject} /></DarkModeProvider>);

      expect(buildYaml.buildPromptfooYaml).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project', () => {
      const emptyProject = {
        name: 'Empty',
        providers: [],
        prompts: [],
        assertions: [],
      } as Project;

      (buildYaml.buildPromptfooYaml as any).mockReturnValue('# Empty configuration\n');

      renderWithProviders(<YamlPreview project={emptyProject} />);

      expect(screen.getByTestId('monaco-editor')).toHaveTextContent('# Empty configuration');
    });

    it('should handle very long YAML content', () => {
      const longYaml = '# Very long YAML\n' + 'line: content\n'.repeat(1000);
      (buildYaml.buildPromptfooYaml as any).mockReturnValue(longYaml);

      renderWithProviders(<YamlPreview project={mockProject} />);

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveTextContent('# Very long YAML');
    });

    it('should handle YAML with special characters', () => {
      const specialYaml = '# YAML with "quotes" and \'apostrophes\'\nkey: "value with: colon"\n';
      (buildYaml.buildPromptfooYaml as any).mockReturnValue(specialYaml);

      renderWithProviders(<YamlPreview project={mockProject} />);

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveTextContent('# YAML with "quotes" and \'apostrophes\'');
    });

    it('should handle null/undefined values in project gracefully', () => {
      const projectWithNulls = {
        ...mockProject,
        dataset: undefined,
        options: null as any,
      };

      (buildYaml.buildPromptfooYaml as any).mockReturnValue('# YAML without dataset\n');

      expect(() => {
        renderWithProviders(<YamlPreview project={projectWithNulls} />);
      }).not.toThrow();
    });
  });
});
