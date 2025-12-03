# Prompt Evaluator 🚀
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.0.1-green.svg)
![CI](https://github.com/syamsasi99/prompt-evaluator/workflows/CI/badge.svg)
![Release](https://github.com/syamsasi99/prompt-evaluator/workflows/Build%20and%20Release/badge.svg)
[![codecov](https://codecov.io/gh/syamsasi99/prompt-evaluator/branch/master/graph/badge.svg)](https://codecov.io/gh/syamsasi99/prompt-evaluator)

## Overview

Prompt Evaluator provides an intuitive graphical interface for creating and managing LLM evaluation projects. It eliminates the need to manually write YAML configuration files by offering a visual workflow for defining prompts, providers, datasets, and assertions.

### Key Features

- 🤖 **Multi-Provider Support**: Test prompts across Google Gemini, OpenAI, Anthropic Claude, and more
- 📝 **Visual Prompt Management**: Create and edit prompts with syntax highlighting and variable interpolation
- 📊 **Dataset Builder**: Import CSV files or generate test datasets using AI assistance
- ✅ **Assertion Framework**: Define test criteria with built-in and custom assertions
- 🔒 **Security Testing**: Run OWASP LLM security tests (prompt injection, PII leakage, etc.)
- 📈 **Results Visualization**: View detailed test results with scoring, pass/fail status, and performance metrics
- 🤖 **AI-Powered Analysis**: Get automated insights and prompt improvement suggestions using Gemini
- 📜 **Evaluation History**: Track and compare test runs over time (stores up to 500 evaluations)
- 📊 **Dashboard Analytics**: Comprehensive dashboard with metrics, trends, and project filtering
- 🔍 **Run Comparison**: Advanced side-by-side comparison with configuration change tracking
- 📁 **Multi-Project Management**: Browse, switch between, and manage multiple projects with recent projects tracking
- 🎯 **Real-time Progress**: Monitor evaluation execution with live logs and progress tracking
- 📄 **YAML Preview**: View generated configuration before running tests
- 📤 **PDF Export**: Export evaluation results and comparisons to PDF format

## Architecture

Prompt Evaluator follows a modern desktop application architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Electron Main Process                   │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ main.ts    │  │  ipc.ts      │  │  firstLaunch.ts      │   │
│  │ (App Entry)│  │  (IPC Bridge)│  │  (Dependency Check)  │   │
│  └────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ IPC (Inter-Process Communication)
┌─────────────────────────────────────────────────────────────────┐
│                      Electron Renderer Process                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                        React UI Layer                     │  │
│  │  ┌────────────┐  ┌──────────────────────────────────┐   │  │
│  │  │  App.tsx   │  │     Components/                   │   │  │
│  │  │  (Root)    │  │  • ProvidersForm                  │   │  │
│  │  │            │  │  • PromptsForm                    │   │  │
│  │  │            │  │  • DatasetForm                    │   │  │
│  │  │            │  │  • AssertionsForm                 │   │  │
│  │  │            │  │  • RunResults                     │   │  │
│  │  │            │  │  • History                        │   │  │
│  │  │            │  │  • FileBar, YamlPreview, etc.     │   │  │
│  │  └────────────┘  └──────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Services Layer                       │  │
│  │  • ValidationService   - Input validation & error checks  │  │
│  │  • EvaluationService   - Test execution & orchestration   │  │
│  │  • HistoryService      - Evaluation history management    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Utilities Layer                      │  │
│  │  • buildYaml.ts        - YAML configuration generation    │  │
│  │  • logger.ts           - Structured logging               │  │
│  │  • datasetUtils.ts     - CSV parsing & data manipulation  │  │
│  │  • providerUtils.ts    - Provider configuration helpers   │  │
│  │  • textDiff.ts         - Text comparison utilities        │  │
│  │  • comparison.ts       - Result comparison logic          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  External Services  │
                    │  • Promptfoo CLI    │
                    │  • LLM APIs         │
                    └─────────────────────┘
```

### Component Architecture

#### Main Process (Electron)
- **[main.ts](electron/main.ts)**: Application entry point, window management, and security configuration
- **[ipc.ts](electron/ipc.ts)**: IPC handler registration for communication between main and renderer processes
- **[preload.ts](electron/preload.ts)**: Context-isolated bridge for exposing safe APIs to renderer
- **[firstLaunch.ts](electron/firstLaunch.ts)**: First-run dependency checks and setup

#### Renderer Process (React)

**Core Application**
- **[App.tsx](src/App.tsx)**: Root component managing application state, navigation, and workflow orchestration

**UI Components**
- **[ProvidersForm.tsx](src/components/ProvidersForm.tsx)**: Configure LLM providers (Gemini, OpenAI, Anthropic, etc.)
- **[PromptsForm.tsx](src/components/PromptsForm.tsx)**: Create and edit prompt templates with variable interpolation
- **[DatasetForm.tsx](src/components/DatasetForm.tsx)**: Build test datasets (manual, CSV import, AI-generated)
- **[AssertionsForm.tsx](src/components/AssertionsForm.tsx)**: Define test assertions and success criteria
- **[OptionsForm.tsx](src/components/OptionsForm.tsx)**: Configure evaluation settings and integrations
- **[RunResults.tsx](src/components/RunResults.tsx)**: Display evaluation results with AI analysis and PDF export
- **[History.tsx](src/components/History.tsx)**: Browse past evaluations with filtering and comparison mode
- **[Dashboard.tsx](src/components/Dashboard.tsx)**: Analytics dashboard with metrics, trends, and project filtering
- **[ComparisonView.tsx](src/components/ComparisonView.tsx)**: Side-by-side comparison with AI-powered analysis
- **[FileBar.tsx](src/components/FileBar.tsx)**: Top menu bar with project management and recent projects
- **[ProjectSwitcher.tsx](src/components/ProjectSwitcher.tsx)**: Browse and manage all projects with metadata tracking

**Services Layer**
- **[ValidationService.ts](src/services/ValidationService.ts)**: Validates project configuration before evaluation
- **[EvaluationService.ts](src/services/EvaluationService.ts)**: Orchestrates test execution via Promptfoo CLI
- **[HistoryService.ts](src/services/HistoryService.ts)**: Manages evaluation history storage and retrieval

**Core Utilities**
- **[buildYaml.ts](src/lib/buildYaml.ts)**: Generates Promptfoo YAML configuration from project state
- **[logger.ts](src/lib/logger.ts)**: Structured logging with categories and metadata
- **[types.ts](src/lib/types.ts)**: TypeScript type definitions for all data structures

### Data Flow

1. **User Input** → UI Components collect configuration
2. **Validation** → ValidationService checks for errors
3. **YAML Generation** → buildYaml.ts creates Promptfoo config
4. **Evaluation** → EvaluationService executes via Promptfoo CLI
5. **Results** → Parsed and displayed in RunResults component
6. **Storage** → HistoryService saves to local file system

### State Management

- **React State Hooks**: Component-level state management
- **Context API**:
  - `ToastContext`: Global toast notifications
  - `TutorialContext`: Interactive tutorial state
- **Props Drilling**: Parent-child component communication
- **Electron Store**: Persistent application settings

## Getting Started

### Download Pre-built Installers (Recommended)

The easiest way to get started is to download a pre-built installer from the [GitHub Releases](https://github.com/syamsasi99/prompt-evaluator/releases) page.

**Available Downloads:**
- **macOS**: `.dmg` installer or `.zip` archive
- **Windows**: `.exe` installer or `.zip` archive
- **Linux**: `.AppImage` or `.deb` package

#### Installation Instructions

**macOS:**
1. Download the `.dmg` file
2. Open it and drag "Prompt Evaluator" to Applications
3. If you see a Gatekeeper warning, right-click the app and select "Open"

**Windows:**
1. Download the `.exe` installer
2. Run the installer and follow the wizard
3. Or download the `.zip` for portable usage

**Linux:**
1. Download the `.AppImage` file
2. Make it executable: `chmod +x Prompt-Evaluator-*.AppImage`
3. Run it: `./Prompt-Evaluator-*.AppImage`
4. Or install the `.deb` package: `sudo dpkg -i prompt-evaluator_*.deb`

### Build and Install from Source

If you want to build and install the application from source code:

#### Prerequisites
- Node.js 18+ and npm
- Git

#### Build Steps

1. **Clone the repository**
```bash
git clone https://github.com/syamsasi99/prompt-evaluator.git
cd prompt-evaluator
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the application**

For your platform:
```bash
# macOS
npm run dist:mac

# Windows
npm run dist:win

# Linux
npm run dist:linux

# All platforms
npm run dist
```

The built application packages will be in the `release/` directory.

#### Platform-Specific Installation

**macOS:**
- Open the generated `.dmg` file from `release/`
- Drag "Prompt Evaluator" to Applications
- If you see a Gatekeeper warning (unsigned app), right-click the app and select "Open"

**Windows:**
- Run the `.exe` installer from `release/`
- Follow the installation wizard
- Or extract the `.zip` for portable usage

**Linux:**
- Install the `.AppImage`: `chmod +x *.AppImage && ./Prompt*.AppImage`
- Or install the `.deb` package: `sudo dpkg -i prompt-evaluator_*.deb`

#### Development Build
For testing during development without creating installers:
```bash
npm run dev
```
This launches the app with hot reload enabled.

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## How to Use

### 1. Create a Project

1. Launch Prompt Evaluator
2. Enter a project name in the sidebar
3. Configure your evaluation components through the tabs

### 2. Configure Providers

Navigate to the **Providers** tab:
- Click "Add Provider"
- Select provider type (e.g., `google:gemini-2.5-flash`)
- Configure provider settings if needed
- Add multiple providers to compare results

**Supported Providers:**
- Google Gemini (gemini-2.5-flash, gemini-2.5-pro, gemini-exp-1206)
- OpenAI (gpt-4o, gpt-4o-mini, o1, o1-mini)
- Anthropic (claude-sonnet-4.5, claude-opus-4, claude-3.5-sonnet)
- Azure OpenAI
- Replicate
- Hugging Face
- Custom endpoints

### 3. Create Prompts

Navigate to the **Prompts** tab:
- Add prompts with labels and template text
- Use `{{variable}}` syntax for variable interpolation
- Example:
  ```
  You are a helpful assistant. Answer this question: {{question}}

  Return your answer in JSON format.
  ```

### 4. Build a Dataset

Navigate to the **Dataset** tab:

**Option A: Manual Entry**
- Add columns (must match prompt variables)
- Add rows with test data

**Option B: Import CSV**
- Click "Import CSV"
- Select a CSV file with matching columns

**Option C: AI Generation**
- Click "Generate with AI"
- Specify column names and row count
- AI generates realistic test data

### 5. Add Assertions

Navigate to the **Assertions** tab:

**Built-in Assertions:**
- `is-json`: Validates JSON output
- `contains`: Checks for specific text
- `equals`: Exact match comparison
- `regex`: Pattern matching
- `llm-rubric`: LLM-based grading with criteria
- `latency`: Response time threshold
- `cost`: Token usage cost threshold

**AI-Generated Assertions:**
- Click "Generate Assertions with AI"
- AI analyzes your prompts and suggests relevant assertions

**Security Assertions:**
- Enable security testing in Settings
- Select OWASP LLM tests (prompt injection, PII leakage, etc.)

### 6. Run Evaluation

1. Click the **Run** button in the top menu bar
2. Watch live progress in the logs modal
3. View results automatically when complete

### 7. Analyze Results

The **Results** tab shows:
- Overall pass/fail statistics
- Individual test case results with scores
- Token usage and latency metrics
- Cost calculations per provider
- Output comparisons across providers

**AI Analysis:**
- Click "Analyze with AI" for automated insights
- Get suggestions for prompt improvements
- Apply suggestions and re-run tests

### 8. View Dashboard

Navigate to the **Dashboard** tab:
- See aggregate statistics across all evaluations
- View performance trends (pass rate, cost, token usage)
- Filter metrics by project
- Monitor quality metrics over time
- Quick access to recent evaluations

### 9. Compare Results

Navigate to the **History** tab:
- View all past evaluation runs (up to 500)
- Filter by project, date range, or search query
- Enable comparison mode to select 2-10 runs
- Click "Compare Selected" for detailed analysis
- View side-by-side differences with:
  - Configuration changes (prompts, assertions, providers)
  - Performance metrics comparison
  - Test result changes
  - AI-powered insights on improvements
- Export comparison to PDF

### 10. Manage Projects

**Recent Projects**:
- Access up to 5 most recent projects from the top menu
- Click project name to quickly switch
- Clear recent projects list if needed

**Browse All Projects**:
- Click "Browse All Projects" to view all saved projects
- See project metadata (name, last modified, size)
- Load, delete, or create new projects
- Projects marked as favorites appear at the top

## Configuration Files

### Project Configuration

Projects are saved as JSON files containing:
```json
{
  "name": "My Project",
  "providers": [...],
  "prompts": [...],
  "dataset": {...},
  "assertions": [...],
  "options": {...}
}
```

### Evaluation History

Stored in `~/Library/Application Support/prompt-evaluator/eval-history.json` (macOS) with:
- Timestamp
- Project configuration snapshot
- Full evaluation results
- Performance metrics

### YAML Generation

The app generates Promptfoo-compatible YAML configurations:
- **Functional tests**: Standard evaluation config
- **Security tests**: OWASP LLM security testing config

## Advanced Features

### Security Testing

Run OWASP LLM security tests:
- **LLM01**: Prompt Injection
- **LLM02**: Insecure Output Handling
- **LLM03**: Training Data Poisoning
- **LLM06**: Sensitive Information Disclosure
- **LLM07**: Insecure Plugin Design
- **LLM09**: Overreliance

Enable in Settings → Security Testing

### Custom Providers

Add custom API endpoints:
```typescript
{
  providerId: 'custom:my-model',
  config: {
    url: 'https://api.example.com/v1/chat',
    headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
  }
}
```

## Development

### Project Structure

```
prompt-evaluator/
├── electron/              # Electron main process
│   ├── main.ts           # App entry point
│   ├── ipc.ts            # IPC handlers
│   ├── preload.ts        # Preload script
│   └── firstLaunch.ts    # Setup wizard
├── src/                  # React renderer process
│   ├── App.tsx           # Root component
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── lib/              # Utilities and helpers
│   ├── services/         # Business logic services
│   └── test/             # Test utilities
├── build/                # Build assets
├── assets/               # Application icons
├── dist/                 # Built renderer files
├── dist-electron/        # Built main process files
└── release/              # Distribution packages
```

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Monaco Editor for code editing
- Vite for fast development

**Backend:**
- Electron 28 for desktop framework
- Node.js for file system and process management
- Promptfoo CLI for evaluation execution

**Testing:**
- Vitest for unit and integration tests
- React Testing Library for component tests
- Coverage reporting with c8

**Build Tools:**
- TypeScript compiler
- Electron Builder for packaging
- Vite for bundling

### Adding New Features

1. **Create component** in `src/components/`
2. **Add service logic** in `src/services/` if needed
3. **Update types** in `src/lib/types.ts`
4. **Add tests** in `*.test.tsx` or `*.test.ts`
5. **Integrate** into App.tsx workflow

### Code Style

- Use TypeScript for type safety
- Follow React Hooks best practices
- Write unit tests for services
- Document complex logic
- Use meaningful variable names

## Troubleshooting

### Application won't start
- Check that Node.js 18+ is installed
- Run `npm install` to ensure dependencies are current
- Check console logs for error messages

### API calls failing
- Verify API keys in `.env` file
- Check internet connectivity
- Ensure provider endpoints are accessible

### Evaluation errors
- Validate YAML configuration (use Preview button)
- Check that dataset columns match prompt variables
- Ensure providers are properly configured
- Review logs for specific error messages

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

For issues and questions:
- File an issue on GitHub
- Check existing documentation
- Review the Promptfoo documentation at [promptfoo.dev](https://promptfoo.dev)

## Acknowledgments

Built on top of [Promptfoo](https://promptfoo.dev) - the open-source LLM evaluation framework.

---

**Copyright © syamsasi**
