# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Community health files (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md)
- GitHub issue templates for bug reports, feature requests, and questions

## [0.0.1] - 2024-01-15

### Added
- Initial release of Prompt Evaluator
- Visual interface for creating and managing LLM evaluation projects
- Multi-provider support (Google Gemini, OpenAI, Anthropic Claude, Azure, Replicate, Hugging Face)
- Visual prompt management with syntax highlighting and variable interpolation
- Dataset builder with CSV import and AI-powered generation
- Comprehensive assertion framework with built-in and custom assertions
- OWASP LLM security testing capabilities
- Results visualization with detailed metrics and scoring
- AI-powered analysis using Gemini for prompt improvement suggestions
- Evaluation history tracking (stores up to 500 evaluations)
- Dashboard analytics with metrics, trends, and project filtering
- Advanced run comparison with side-by-side analysis
- Multi-project management with recent projects tracking
- Real-time progress monitoring with live logs
- YAML preview before test execution
- PDF export for evaluation results and comparisons
- Electron-based desktop application for macOS, Windows, and Linux
- First-launch dependency checking and setup wizard
- Interactive tutorial for new users
- Toast notification system
- Structured logging system
- Comprehensive test suite with Vitest
- CI/CD pipeline with GitHub Actions
- Code coverage reporting with Codecov
- Automated releases with electron-builder

### Technical Details
- React 18 with TypeScript for UI
- Electron 28 for desktop framework
- Tailwind CSS for styling
- Monaco Editor for code editing
- Vite for build tooling
- Integration with Promptfoo CLI for evaluation execution
- Local file system storage for projects and history
- IPC communication between Electron main and renderer processes
- Context-isolated preload script for security

### Supported Platforms
- macOS (Intel and Apple Silicon)
- Windows (x64)
- Linux (x64, AppImage and .deb)

---

## Template for Future Releases

When releasing new versions, use the following template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features and capabilities

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future releases

### Removed
- Features that have been removed

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes
```

### Version Number Guidelines

- **Major version (X.0.0)**: Breaking changes, major new features
- **Minor version (0.X.0)**: New features, backward compatible
- **Patch version (0.0.X)**: Bug fixes, minor improvements

---

[Unreleased]: https://github.com/syamsasi99/prompt-evaluator/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/syamsasi99/prompt-evaluator/releases/tag/v0.0.1
