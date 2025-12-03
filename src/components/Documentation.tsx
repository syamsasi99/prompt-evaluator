import React, { useState } from 'react';

type DocSection =
  | 'overview'
  | 'prompts'
  | 'providers'
  | 'dataset'
  | 'assertions'
  | 'running'
  | 'results'
  | 'history'
  | 'comparison'
  | 'bigquery'
  | 'settings';

interface DocumentationProps {
  onClose: () => void;
}

export function Documentation({ onClose }: DocumentationProps) {
  const [activeSection, setActiveSection] = useState<DocSection>('overview');

  const sections = [
    { id: 'overview' as DocSection, name: 'Overview', icon: '📖' },
    { id: 'prompts' as DocSection, name: 'Prompts', icon: '✍️' },
    { id: 'providers' as DocSection, name: 'Providers', icon: '🤖' },
    { id: 'dataset' as DocSection, name: 'Dataset', icon: '📊' },
    { id: 'assertions' as DocSection, name: 'Assertions', icon: '✓' },
    { id: 'running' as DocSection, name: 'Running Tests', icon: '▶️' },
    { id: 'results' as DocSection, name: 'Results', icon: '📈' },
    { id: 'history' as DocSection, name: 'History', icon: '📜' },
    { id: 'comparison' as DocSection, name: 'Comparison', icon: '⚖️' },
    { id: 'bigquery' as DocSection, name: 'BigQuery', icon: '☁️' },
    { id: 'settings' as DocSection, name: 'Settings', icon: '⚙️' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Prompt Evaluator</h2>
            <p className="text-gray-700 mb-4">
              Prompt Evaluator is an intelligent AI testing tool designed to help you test, evaluate,
              and improve your LLM applications with confidence.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Key Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Multi-Provider Testing:</strong> Test across Google Gemini, OpenAI, Anthropic, and more</li>
              <li><strong>Powerful Assertions:</strong> Validate outputs with built-in and custom assertions</li>
              <li><strong>AI-Assisted Tools:</strong> Generate datasets and assertions using AI</li>
              <li><strong>Visual Results:</strong> Interactive charts and detailed breakdowns</li>
              <li><strong>History & Comparison:</strong> Track progress and compare runs side-by-side</li>
              <li><strong>BigQuery Integration:</strong> Centralized history across teams</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Getting Started</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Configure your <strong>Providers</strong> (LLM models)</li>
              <li>Create <strong>Prompts</strong> to test</li>
              <li>Add test <strong>Dataset</strong> with variables</li>
              <li>Define <strong>Assertions</strong> to validate outputs</li>
              <li>Click <strong>Run Evaluation</strong> and review results</li>
            </ol>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> Click on any section in the sidebar to learn more about specific features.
              </p>
            </div>
          </div>
        );

      case 'prompts':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Prompts</h2>
            <p className="text-gray-700 mb-4">
              Prompts are the instructions you send to LLMs. You can create multiple prompt variations
              to test which performs best.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Creating Prompts</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Go to the <strong>Prompts</strong> tab</li>
              <li>Click <strong>Add Prompt</strong></li>
              <li>Enter a descriptive label</li>
              <li>Write your prompt text</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Using Variables</h3>
            <p className="text-gray-700 mb-2">
              Use variables in your prompts with double curly braces: <code className="bg-gray-100 px-2 py-1 rounded">{'{{variable_name}}'}</code>
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm font-mono text-gray-800">
                Analyze this product: {'{{product_name}}'}<br/>
                Category: {'{{category}}'}<br/>
                Generate a description...
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Best Practices</h3>
            <ul className="space-y-2 text-gray-700">
              <li>Be specific and clear in your instructions</li>
              <li>Include examples for complex tasks</li>
              <li>Test multiple prompt variations</li>
              <li>Use consistent variable names across prompts</li>
            </ul>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900">
                <strong>✨ Pro Tip:</strong> Create prompt variations with different tones, structures,
                or instructions to find the most effective approach.
              </p>
            </div>
          </div>
        );

      case 'providers':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Providers (LLM Models)</h2>
            <p className="text-gray-700 mb-4">
              Providers are the AI models you want to test. You can test multiple models simultaneously
              to compare their performance.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Supported Providers</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Google Gemini:</strong> gemini-2.0-flash-exp, gemini-2.5-flash, gemini-2.5-pro</li>
              <li><strong>OpenAI:</strong> gpt-4o, gpt-4-turbo, gpt-3.5-turbo</li>
              <li><strong>Anthropic:</strong> claude-3.5-sonnet, claude-3-opus, claude-3-haiku</li>
              <li><strong>Ollama:</strong> Local models like llama3, mistral, codellama</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Adding Providers</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Go to the <strong>Providers</strong> tab</li>
              <li>Click <strong>Add Provider</strong></li>
              <li>Select a provider from the dropdown</li>
              <li>Configure model-specific settings (optional)</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Configuration Options</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Temperature:</strong> Controls randomness (0.0 = deterministic, 1.0 = creative)</li>
              <li><strong>Max Tokens:</strong> Maximum length of generated response</li>
              <li><strong>Top P:</strong> Nucleus sampling parameter</li>
            </ul>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <strong>⚠️ API Keys:</strong> Configure API keys in Settings before running evaluations.
              </p>
            </div>
          </div>
        );

      case 'dataset':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dataset</h2>
            <p className="text-gray-700 mb-4">
              The dataset contains test cases with input variables that will be injected into your prompts.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Creating Dataset</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Go to the <strong>Dataset</strong> tab</li>
              <li>Click <strong>Add Row</strong> to add test cases</li>
              <li>Define variables for each row</li>
              <li>Add expected outputs (optional)</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">AI-Assisted Generation</h3>
            <p className="text-gray-700 mb-2">
              Use the <strong>AI Generate Dataset</strong> button to automatically create test cases:
            </p>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Click <strong>AI Generate Dataset</strong></li>
              <li>Describe what kind of test cases you need</li>
              <li>Review and edit generated rows</li>
              <li>Add more rows as needed</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Best Practices</h3>
            <ul className="space-y-2 text-gray-700">
              <li>Include edge cases and boundary conditions</li>
              <li>Test with diverse inputs (different lengths, formats, languages)</li>
              <li>Add expected outputs for automatic validation</li>
              <li>Use consistent variable names matching your prompts</li>
            </ul>

            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900">
                <strong>🎯 Example:</strong> If testing a product categorizer, include normal products,
                edge cases (missing info), and challenging examples (ambiguous categories).
              </p>
            </div>
          </div>
        );

      case 'assertions':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assertions</h2>
            <p className="text-gray-700 mb-4">
              Assertions are rules that validate LLM outputs. They automatically determine if a test passed or failed.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Built-in Assertions</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>is-json:</strong> Output is valid JSON</li>
              <li><strong>contains:</strong> Output contains specific text</li>
              <li><strong>not-contains:</strong> Output does NOT contain specific text</li>
              <li><strong>regex:</strong> Output matches a regular expression</li>
              <li><strong>starts-with:</strong> Output starts with specific text</li>
              <li><strong>equals:</strong> Output exactly matches expected value</li>
              <li><strong>length:</strong> Output length is within range</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">AI-Generated Assertions</h3>
            <p className="text-gray-700 mb-2">
              Let AI suggest relevant assertions based on your prompts and dataset:
            </p>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Configure prompts, providers, and dataset first</li>
              <li>Click <strong>AI Generate Assertions</strong></li>
              <li>Review suggested assertions</li>
              <li>Edit or remove unwanted assertions</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Examples</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">JSON Validation:</p>
                <p className="text-sm text-gray-700">Type: <code>is-json</code> - Ensures output is valid JSON</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">Content Check:</p>
                <p className="text-sm text-gray-700">Type: <code>contains</code> - Value: "product_name"</p>
                <p className="text-xs text-gray-600 mt-1">Ensures the output mentions product_name</p>
              </div>
            </div>
          </div>
        );

      case 'running':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Running Evaluations</h2>
            <p className="text-gray-700 mb-4">
              Once you've configured everything, run your evaluation to test your prompts across all providers and dataset.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Running Tests</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Verify all tabs (Prompts, Providers, Dataset, Assertions) are configured</li>
              <li>Click the <strong>▶ Run Evaluation</strong> button in the top bar</li>
              <li>Watch real-time progress as tests run</li>
              <li>View results automatically when complete</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Progress Tracking</h3>
            <p className="text-gray-700 mb-2">During evaluation, you'll see:</p>
            <ul className="space-y-2 text-gray-700">
              <li>Overall progress bar</li>
              <li>Test counter (e.g., "5 / 20")</li>
              <li>Live logs of each test execution</li>
              <li>Abort button to cancel if needed</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">What Happens During Evaluation</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>For each dataset row, variables are injected into prompts</li>
              <li>Prompts are sent to all configured providers</li>
              <li>Responses are collected from each model</li>
              <li>Assertions are evaluated against outputs</li>
              <li>Results are aggregated and scored</li>
            </ol>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> Larger datasets and multiple providers will take longer to run.
                Start with a small dataset to validate your setup.
              </p>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Results</h2>
            <p className="text-gray-700 mb-4">
              After running an evaluation, view comprehensive results with charts, breakdowns, and AI analysis.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Results Overview</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Score Chart:</strong> Visual comparison of provider performance</li>
              <li><strong>Statistics:</strong> Pass/fail counts, average scores, costs, latency</li>
              <li><strong>Test Results:</strong> Detailed breakdown of each test case</li>
              <li><strong>AI Analysis:</strong> Insights and recommendations</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Interpreting Scores</h3>
            <p className="text-gray-700 mb-2">
              Scores range from 0.0 to 1.0:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li><strong>1.0:</strong> All assertions passed</li>
              <li><strong>0.5:</strong> Half of assertions passed</li>
              <li><strong>0.0:</strong> All assertions failed</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Test Details</h3>
            <p className="text-gray-700 mb-2">Click on any test to see:</p>
            <ul className="space-y-2 text-gray-700">
              <li>Input variables used</li>
              <li>Prompt sent to the model</li>
              <li>Full LLM response</li>
              <li>Assertion results (passed/failed)</li>
              <li>Performance metrics (latency, tokens)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Export Options</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Save to History:</strong> Automatic - view in History tab</li>
              <li><strong>BigQuery:</strong> Auto-export if configured</li>
            </ul>
          </div>
        );

      case 'history':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">History</h2>
            <p className="text-gray-700 mb-4">
              Track all your evaluation runs over time. View past results, compare runs, and monitor progress.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Viewing History</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Click the <strong>History</strong> tab</li>
              <li>Browse your evaluation history</li>
              <li>Use search to find specific runs</li>
              <li>Sort by date, score, or project name</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">History Cards</h3>
            <p className="text-gray-700 mb-2">Each card shows:</p>
            <ul className="space-y-2 text-gray-700">
              <li>Project name and timestamp</li>
              <li>Pass/fail summary</li>
              <li>Average score</li>
              <li>Performance metrics (cost, latency)</li>
              <li>Providers and prompts used</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Actions</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>View:</strong> See full results for that run</li>
              <li><strong>Compare:</strong> Select multiple runs to compare side-by-side</li>
            </ul>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>💡 Restore History:</strong> If BigQuery is enabled and history is empty,
                go to Settings → BigQuery Integration and click "Sync Now from BigQuery".
              </p>
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Comparison</h2>
            <p className="text-gray-700 mb-4">
              Compare multiple evaluation runs side-by-side to track improvements and understand changes.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Creating Comparisons</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Go to the <strong>History</strong> tab</li>
              <li>Select 2 or more runs using checkboxes</li>
              <li>Click <strong>Compare Selected</strong></li>
              <li>View side-by-side comparison</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Comparison Views</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Overview:</strong> Score trends, pass/fail changes</li>
              <li><strong>Configuration:</strong> Prompt, provider, and assertion changes</li>
              <li><strong>Test-by-Test:</strong> Detailed diff of each test result</li>
              <li><strong>Performance:</strong> Cost and latency comparisons</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Understanding Changes</h3>
            <p className="text-gray-700 mb-2">The comparison highlights:</p>
            <ul className="space-y-2 text-gray-700">
              <li><strong className="text-green-600">Green:</strong> Improvements</li>
              <li><strong className="text-red-600">Red:</strong> Regressions</li>
              <li><strong className="text-blue-600">Blue:</strong> Changes detected</li>
              <li><strong className="text-gray-600">Gray:</strong> No change</li>
            </ul>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900">
                <strong>✨ Use Case:</strong> Compare runs before and after prompt changes to measure
                the impact of your optimizations.
              </p>
            </div>
          </div>
        );

      case 'bigquery':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">BigQuery Integration</h2>
            <p className="text-gray-700 mb-4">
              Connect to Google BigQuery for centralized evaluation history across your team.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Setup</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Go to <strong>Settings → BigQuery Integration</strong></li>
              <li>Enter your BigQuery credentials:
                <ul className="ml-6 mt-2 space-y-1">
                  <li>Project ID</li>
                  <li>Dataset ID</li>
                  <li>Table ID</li>
                </ul>
              </li>
              <li>Click <strong>Test Connection</strong> to verify</li>
              <li>Enable <strong>Auto-export Results</strong></li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Auto-Export:</strong> Automatically save evaluation results to BigQuery</li>
              <li><strong>History Sync:</strong> Use BigQuery as centralized history source</li>
              <li><strong>Team Sharing:</strong> Share evaluation results across your team</li>
              <li><strong>Data Analysis:</strong> Query evaluation data with SQL</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Using BigQuery History</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Enable <strong>Use BigQuery as History Source</strong></li>
              <li>Click <strong>Sync Now from BigQuery</strong></li>
              <li>Wait for sync to complete</li>
              <li>View BigQuery evaluations in History tab</li>
            </ol>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <strong>🔑 API Token:</strong> Add BQ_API_TOKEN to your .env file for authentication.
              </p>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-700 mb-4">
              Configure global settings, API keys, and advanced options.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">General Settings</h3>
            <ul className="space-y-2 text-gray-700">
              <li><strong>HTML Output Path:</strong> Where to save HTML result reports</li>
              <li><strong>JSON Output Path:</strong> Where to save JSON result files (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">AI Model Configuration</h3>
            <p className="text-gray-700 mb-2">
              Configure which AI model to use for:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>Dataset generation</li>
              <li>Assertion suggestions</li>
              <li>Results analysis</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              Default: Google Gemini 2.5 Flash (fast and cost-effective)
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">BigQuery Integration</h3>
            <p className="text-gray-700 mb-2">
              Configure BigQuery for centralized history and auto-export. See the BigQuery section for details.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">API Keys</h3>
            <p className="text-gray-700 mb-2">
              API keys are stored in environment variables. Add them to your <code>.env</code> file:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm mb-4">
              GOOGLE_API_KEY=your_key_here<br/>
              OPENAI_API_KEY=your_key_here<br/>
              ANTHROPIC_API_KEY=your_key_here<br/>
              BQ_API_TOKEN=your_bigquery_token
            </div>

            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                <strong>🔒 Security:</strong> Never commit API keys to git. Keep them in .env files only.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📚</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Documentation</h2>
              <p className="text-sm text-gray-600">Learn how to use Prompt Evaluator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-gray-50 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="font-medium">{section.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
