import React from 'react';
import Editor from '@monaco-editor/react';
import type { Project } from '../lib/types';
import { buildPromptfooYaml, buildSecurityTestYaml } from '../lib/buildYaml';
import { useDarkMode } from '../contexts/DarkModeContext';

interface YamlPreviewProps {
  project: Project;
  yamlType?: 'main' | 'security';
}

export function YamlPreview({ project, yamlType = 'main' }: YamlPreviewProps) {
  const [showCopySuccess, setShowCopySuccess] = React.useState(false);
  const { isDarkMode } = useDarkMode();

  const yamlContent = React.useMemo(() => {
    try {
      // Preview YAML without API keys for security
      if (yamlType === 'security') {
        return buildSecurityTestYaml(project, { includeApiKeys: false });
      }
      return buildPromptfooYaml(project, { includeApiKeys: false });
    } catch (error: any) {
      return `# Error generating YAML:\n# ${error.message}`;
    }
  }, [project, yamlType]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(yamlContent);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 3000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {yamlType === 'security' ? 'Security Test YAML Preview' : 'Main Config YAML Preview'}
        </h2>
        <div className="relative">
          <button
            onClick={handleCopyToClipboard}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
          >
            Copy to Clipboard
          </button>
          {showCopySuccess && (
            <div className="absolute right-0 top-full mt-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md shadow-lg whitespace-nowrap animate-fade-in z-50">
              Successfully copied YAML data
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={yamlContent}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
