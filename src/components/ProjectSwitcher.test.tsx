import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectSwitcher } from './ProjectSwitcher';
import type { Project } from '../lib/types';
import { ToastProvider } from '../contexts/ToastContext';

// Mock dependencies
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const mockGetAllProjects = vi.fn();
const mockGetMetadataStore = vi.fn();
const mockLoadProjectByPath = vi.fn();
const mockUpdateRecentProject = vi.fn();
const mockToggleProjectFavorite = vi.fn();
const mockDeleteProjectFile = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    getAllProjects: mockGetAllProjects,
    getMetadataStore: mockGetMetadataStore,
    loadProjectByPath: mockLoadProjectByPath,
    updateRecentProject: mockUpdateRecentProject,
    toggleProjectFavorite: mockToggleProjectFavorite,
    deleteProjectFile: mockDeleteProjectFile,
  };
  global.confirm = vi.fn(() => true);
});

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockCurrentProject: Project = {
  name: 'Current Project',
  providers: [{ id: 'p1', providerId: 'openai:gpt-4', config: {} }],
  prompts: [{ id: 'pr1', label: 'Prompt 1', text: 'Test' }],
  dataset: { name: 'test', headers: [], rows: [] },
  assertions: [],
  options: {},
};

const mockProjects = [
  {
    name: 'Project Alpha',
    filePath: '/path/to/alpha.json',
    lastModified: '2024-01-15T10:00:00Z',
    provider: 'openai:gpt-4',
  },
  {
    name: 'Project Beta',
    filePath: '/path/to/beta.json',
    lastModified: '2024-01-14T09:00:00Z',
    provider: 'anthropic:claude-3',
  },
  {
    name: 'Current Project',
    filePath: '/path/to/current.json',
    lastModified: '2024-01-13T08:00:00Z',
    provider: 'openai:gpt-4',
  },
];

const mockRecentProjects = [
  {
    id: 'proj-1',
    name: 'Project Alpha',
    filePath: '/path/to/alpha.json',
    lastOpened: '2024-01-15T12:00:00Z',
    favorite: true,
    provider: 'openai:gpt-4',
  },
  {
    id: 'proj-2',
    name: 'Project Beta',
    filePath: '/path/to/beta.json',
    lastOpened: '2024-01-14T11:00:00Z',
    favorite: false,
    provider: 'anthropic:claude-3',
  },
];

describe('ProjectSwitcher', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnLoadProject: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnLoadProject = vi.fn();
    mockGetAllProjects.mockResolvedValue(mockProjects);
    mockGetMetadataStore.mockResolvedValue({ recentProjects: mockRecentProjects });
  });

  describe('Rendering', () => {
    it('should render project switcher modal', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All Projects')).toBeInTheDocument();
      });
    });

    it('should display project count', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3 projects available')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      mockGetAllProjects.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      // Loading spinner is a div with animate-spin class, not an img
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render all projects as cards', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
        expect(screen.getByText('Current Project')).toBeInTheDocument();
      });
    });

    it('should highlight current project', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('(Current)')).toBeInTheDocument();
      });
    });

    it('should show favorite star for favorited projects', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        const stars = screen.getAllByText('⭐');
        expect(stars).toHaveLength(1); // Only Project Alpha is favorited
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter projects by search query', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'Alpha');

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when no matches found', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'NonExistent');

      await waitFor(() => {
        expect(screen.getByText('No projects found')).toBeInTheDocument();
        expect(screen.getByText('Try a different search term')).toBeInTheDocument();
      });
    });

    it('should be case-insensitive', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'alpha');

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by recent by default', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        const projectCards = screen.getAllByRole('heading', { level: 3 });
        // Project Alpha should be first (most recent in metadata)
        expect(projectCards[0]).toHaveTextContent('Project Alpha');
      });
    });

    it('should sort by name', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const sortSelect = screen.getByRole('combobox');
      fireEvent.change(sortSelect, { target: { value: 'name' } });

      await waitFor(() => {
        const projectCards = screen.getAllByRole('heading', { level: 3 });
        // Should be alphabetically sorted
        expect(projectCards[0]).toHaveTextContent('Current Project');
        expect(projectCards[1]).toHaveTextContent('Project Alpha');
        expect(projectCards[2]).toHaveTextContent('Project Beta');
      });
    });

    it('should sort by modified date', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const sortSelect = screen.getByRole('combobox');
      fireEvent.change(sortSelect, { target: { value: 'modified' } });

      await waitFor(() => {
        const projectCards = screen.getAllByRole('heading', { level: 3 });
        // Project Alpha has most recent lastModified date
        expect(projectCards[0]).toHaveTextContent('Project Alpha');
      });
    });
  });

  describe('Loading Projects', () => {
    it('should load a project when Open button is clicked', async () => {
      const loadedProject = {
        ...mockCurrentProject,
        name: 'Project Alpha',
        providers: [{ id: 'p1', providerId: 'openai:gpt-4', config: {} }],
      };

      mockLoadProjectByPath.mockResolvedValue(loadedProject);

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const openButtons = screen.getAllByRole('button', { name: /Open Project/i });
      fireEvent.click(openButtons[0]);

      await waitFor(() => {
        expect(mockLoadProjectByPath).toHaveBeenCalledWith('/path/to/alpha.json');
        expect(mockOnLoadProject).toHaveBeenCalledWith(loadedProject);
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockUpdateRecentProject).toHaveBeenCalled();
      });
    });

    it('should not allow opening current project', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Current Project')).toBeInTheDocument();
      });

      const currentButton = screen.getByRole('button', { name: 'Currently Open' });
      expect(currentButton).toBeDisabled();
    });

    it('should handle load project error', async () => {
      mockLoadProjectByPath.mockRejectedValue(new Error('Failed to load'));

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const openButtons = screen.getAllByRole('button', { name: /Open Project/i });
      fireEvent.click(openButtons[0]);

      await waitFor(() => {
        expect(mockOnLoadProject).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('Favorites', () => {
    it('should toggle favorite status', async () => {
      mockToggleProjectFavorite.mockResolvedValue({
        recentProjects: [
          { ...mockRecentProjects[0], favorite: false },
          mockRecentProjects[1],
        ],
      });

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      // Find favorite buttons (star icons)
      const favoriteButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('title')?.includes('favorites')
      );

      const alphaFavoriteButton = favoriteButtons[0];
      fireEvent.click(alphaFavoriteButton);

      await waitFor(() => {
        expect(mockToggleProjectFavorite).toHaveBeenCalledWith('proj-1');
      });
    });

    it('should show add to favorites tooltip for non-favorites', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
      });

      const addToFavoriteButtons = screen.getAllByTitle('Add to favorites');
      expect(addToFavoriteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Project', () => {
    it('should delete project with confirmation', async () => {
      mockDeleteProjectFile.mockResolvedValue(undefined);

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('title') === 'Delete project'
      );

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Are you sure you want to delete "Project Alpha"?')
        );
        expect(mockDeleteProjectFile).toHaveBeenCalledWith('/path/to/alpha.json');
      });
    });

    it('should not delete if confirmation cancelled', async () => {
      global.confirm = vi.fn(() => false);

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('title') === 'Delete project'
      );

      fireEvent.click(deleteButtons[0]);

      expect(mockDeleteProjectFile).not.toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      mockDeleteProjectFile.mockRejectedValue(new Error('Delete failed'));

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('title') === 'Delete project'
      );

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteProjectFile).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh', () => {
    it('should reload projects when refresh button clicked', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      mockGetAllProjects.mockClear();

      const refreshButton = screen.getByTitle('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockGetAllProjects).toHaveBeenCalled();
        expect(mockGetMetadataStore).toHaveBeenCalled();
      });
    });
  });

  describe('Close Modal', () => {
    it('should close when close button clicked', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All Projects')).toBeInTheDocument();
      });

      // Find close button (X icon in header)
      const closeButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.querySelector('path[d*="M6 18L18 6"]')
      );

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no projects', async () => {
      mockGetAllProjects.mockResolvedValue([]);
      mockGetMetadataStore.mockResolvedValue({ recentProjects: [] });

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No projects found')).toBeInTheDocument();
        expect(screen.getByText('Create a new project to get started')).toBeInTheDocument();
      });
    });

    it('should show correct count for single project', async () => {
      mockGetAllProjects.mockResolvedValue([mockProjects[0]]);

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('1 project available')).toBeInTheDocument();
      });
    });
  });

  describe('Project Metadata Display', () => {
    it('should display provider information', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('gpt-4')[0]).toBeInTheDocument();
        expect(screen.getAllByText('claude-3')[0]).toBeInTheDocument();
      });
    });

    it('should display relative time for last modified', async () => {
      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        const modifiedTexts = screen.getAllByText(/Modified/);
        expect(modifiedTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockGetAllProjects.mockRejectedValue(new Error('API Error'));

      renderWithToast(
        <ProjectSwitcher
          onClose={mockOnClose}
          onLoadProject={mockOnLoadProject}
          currentProject={mockCurrentProject}
        />
      );

      await waitFor(() => {
        // Should not crash, loading should stop
        expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
      });
    });
  });
});
