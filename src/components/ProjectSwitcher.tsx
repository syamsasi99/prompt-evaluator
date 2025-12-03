import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import type { Project } from '../lib/types';

interface ProjectSwitcherProps {
  onClose: () => void;
  onLoadProject: (project: Project) => void;
  currentProject: Project;
}

interface ProjectInfo {
  name: string;
  filePath: string;
  lastModified: string;
  provider?: string;
}

export function ProjectSwitcher({ onClose, onLoadProject, currentProject }: ProjectSwitcherProps) {
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'modified'>('recent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const [allProjects, metadata] = await Promise.all([
        window.api.getAllProjects(),
        window.api.getMetadataStore(),
      ]);

      setProjects(allProjects);
      setRecentProjects(metadata.recentProjects || []);
    } catch (error: any) {
      toast.error(`Failed to load projects: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateProjectId = (filePath: string): string => {
    // Simple hash function for generating project ID from file path
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  };

  const handleLoadProject = async (filePath: string, projectName: string) => {
    try {
      const loadedProject = await window.api.loadProjectByPath(filePath);
      onLoadProject(loadedProject);
      onClose();
      toast.success(`Loaded project: ${projectName}`);

      // Update recent projects
      const metadata = {
        id: generateProjectId(filePath),
        name: projectName,
        filePath,
        lastOpened: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        favorite: false,
        provider: loadedProject.providers?.[0]?.providerId,
        evalCount: 0,
      };

      await window.api.updateRecentProject(metadata);
    } catch (error: any) {
      toast.error(`Failed to load project: ${error.message}`);
    }
  };

  const handleToggleFavorite = async (projectId: string) => {
    try {
      const metadata = await window.api.toggleProjectFavorite(projectId);
      setRecentProjects(metadata.recentProjects || []);
      toast.success('Favorite toggled');
    } catch (error: any) {
      toast.error(`Failed to toggle favorite: ${error.message}`);
    }
  };

  const handleDeleteProject = async (filePath: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await window.api.deleteProjectFile(filePath);
      toast.success(`Deleted project: ${projectName}`);
      loadProjects();
    } catch (error: any) {
      toast.error(`Failed to delete project: ${error.message}`);
    }
  };

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

  // Filter and sort projects
  const filteredProjects = projects
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'modified') {
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
      // For 'recent', use recent projects order
      const aRecent = recentProjects.findIndex(rp => rp.filePath === a.filePath);
      const bRecent = recentProjects.findIndex(rp => rp.filePath === b.filePath);
      if (aRecent === -1 && bRecent === -1) return 0;
      if (aRecent === -1) return 1;
      if (bRecent === -1) return -1;
      return aRecent - bRecent;
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Projects</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Sort */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="recent">Sort: Recent</option>
            <option value="name">Sort: Name</option>
            <option value="modified">Sort: Modified</option>
          </select>
          <button
            onClick={loadProjects}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No projects found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {searchQuery ? 'Try a different search term' : 'Create a new project to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((proj) => {
                const recentProj = recentProjects.find(rp => rp.filePath === proj.filePath);
                const isFavorite = recentProj?.favorite || false;
                const isCurrentProject = proj.name === currentProject.name;

                return (
                  <div
                    key={proj.filePath}
                    className={`border rounded-lg p-4 flex flex-col hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all bg-white dark:bg-gray-800 ${
                      isCurrentProject ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {isFavorite && <span className="text-yellow-500">⭐</span>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => recentProj && handleToggleFavorite(recentProj.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <svg className={`w-4 h-4 ${isFavorite ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`} fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.filePath, proj.name)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Delete project"
                        >
                          <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate" title={proj.name}>
                      {proj.name}
                      {isCurrentProject && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">(Current)</span>
                      )}
                    </h3>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3 flex-grow">
                      {proj.provider && (
                        <p className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                          {proj.provider.split(':')[1] || proj.provider}
                        </p>
                      )}
                      <p className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Modified {getRelativeTime(proj.lastModified)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleLoadProject(proj.filePath, proj.name)}
                      disabled={isCurrentProject}
                      className={`w-full py-2 rounded-lg transition-colors font-medium text-sm ${
                        isCurrentProject
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                      }`}
                    >
                      {isCurrentProject ? 'Currently Open' : 'Open Project'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
