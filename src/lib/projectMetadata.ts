import type { Project } from './types';

export interface ProjectMetadata {
  id: string;
  name: string;
  filePath: string;
  lastOpened: string;
  lastModified: string;
  favorite: boolean;
  provider?: string;
  evalCount: number;
}

export interface MetadataStore {
  recentProjects: ProjectMetadata[];
  settings: {
    autoSave: boolean;
    autoSaveInterval: number;
    maxRecentProjects: number;
    defaultProjectPath: string;
  };
}

export const DEFAULT_METADATA_STORE: MetadataStore = {
  recentProjects: [],
  settings: {
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    maxRecentProjects: 10,
    defaultProjectPath: '', // Will be set by Electron to user's Documents folder
  },
};

/**
 * Generate a unique ID for a project based on its file path
 */
export function generateProjectId(filePath: string): string {
  return Buffer.from(filePath).toString('base64').substring(0, 16);
}

/**
 * Create metadata entry from project and file path
 */
export function createProjectMetadata(
  project: Project,
  filePath: string,
  evalCount: number = 0
): ProjectMetadata {
  const provider = project.providers?.[0]?.providerId;

  return {
    id: generateProjectId(filePath),
    name: project.name,
    filePath,
    lastOpened: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    favorite: false,
    provider,
    evalCount,
  };
}

/**
 * Update or add project to recent list
 */
export function updateRecentProjects(
  store: MetadataStore,
  metadata: ProjectMetadata
): MetadataStore {
  const { recentProjects, settings } = store;

  // Remove existing entry if present
  const filtered = recentProjects.filter(p => p.id !== metadata.id);

  // Add to front of list
  const updated = [metadata, ...filtered];

  // Limit to maxRecentProjects (but keep favorites)
  const favorites = updated.filter(p => p.favorite);
  const nonFavorites = updated.filter(p => !p.favorite);
  const limitedNonFavorites = nonFavorites.slice(0, settings.maxRecentProjects - favorites.length);

  return {
    ...store,
    recentProjects: [...favorites, ...limitedNonFavorites],
  };
}

/**
 * Toggle favorite status for a project
 */
export function toggleFavorite(
  store: MetadataStore,
  projectId: string
): MetadataStore {
  return {
    ...store,
    recentProjects: store.recentProjects.map(p =>
      p.id === projectId ? { ...p, favorite: !p.favorite } : p
    ),
  };
}

/**
 * Remove project from recent list
 */
export function removeFromRecent(
  store: MetadataStore,
  projectId: string
): MetadataStore {
  return {
    ...store,
    recentProjects: store.recentProjects.filter(p => p.id !== projectId),
  };
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'week' : 'weeks'} ago`;

  return date.toLocaleDateString();
}

/**
 * Sort projects: favorites first, then by last opened
 */
export function sortProjects(projects: ProjectMetadata[]): ProjectMetadata[] {
  return [...projects].sort((a, b) => {
    // Favorites first
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;

    // Then by last opened (most recent first)
    return new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime();
  });
}
