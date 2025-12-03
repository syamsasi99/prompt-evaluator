# Contributing to Prompt Evaluator

Thank you for your interest in contributing to Prompt Evaluator! We welcome contributions from the community and appreciate your efforts to make this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- **Git**

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/prompt-evaluator.git
   cd prompt-evaluator
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/syamsasi99/prompt-evaluator.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start development mode**:
   ```bash
   npm run dev
   ```

   This launches the Electron app with hot reload enabled.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, etc.)
- Any relevant logs or screenshots

### Suggesting Features

For feature requests, use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml). Provide:
- Clear description of the feature
- Use case and benefits
- Any alternative solutions you've considered

### Asking Questions

For questions or support, use the [Question template](.github/ISSUE_TEMPLATE/question.yml).

## Pull Request Process

1. **Create a new branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Follow the coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   # Run linter
   npm run lint

   # Run type check
   npm run type-check

   # Run tests
   npm run test:run

   # Run tests with coverage
   npm run test:coverage
   ```

4. **Commit your changes**:
   - Follow the commit message guidelines (see below)
   - Keep commits atomic and focused

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**:
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue numbers
     - Screenshots (if UI changes)
     - Testing performed

7. **Address review feedback**:
   - Respond to comments
   - Make requested changes
   - Push additional commits to the same branch

8. **Merge**:
   - Once approved, a maintainer will merge your PR
   - Your branch can be deleted after merging

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary

### Code Style

- **Indentation**: 2 spaces
- **Line length**: Maximum 100 characters (soft limit)
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for types, interfaces, and classes
  - `UPPER_SNAKE_CASE` for constants
- **File naming**:
  - `PascalCase.tsx` for React components
  - `camelCase.ts` for utilities and services
  - `kebab-case.test.ts` for test files

### React

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use meaningful prop names
- Add PropTypes or TypeScript types

### Project Structure

```
src/
├── components/       # React UI components
├── contexts/        # React contexts
├── lib/             # Utilities and helpers
├── services/        # Business logic services
└── test/            # Test utilities and setup
```

### Comments

- Write self-documenting code when possible
- Add comments for complex logic
- Document public APIs and functions
- Use JSDoc for function documentation:
  ```typescript
  /**
   * Validates the project configuration
   * @param config - The project configuration to validate
   * @returns Validation result with errors if any
   */
  function validateConfig(config: ProjectConfig): ValidationResult {
    // implementation
  }
  ```

## Testing Guidelines

### Unit Tests

- Write tests for all new functionality
- Test edge cases and error conditions
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

Example:
```typescript
describe('ValidationService', () => {
  it('should return error when providers array is empty', () => {
    // Arrange
    const config = { providers: [], prompts: [], dataset: {} };

    // Act
    const result = validateConfig(config);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one provider is required');
  });
});
```

### Component Tests

- Test user interactions
- Test component rendering
- Use React Testing Library
- Avoid testing implementation details

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Coverage Requirements

- Aim for at least 80% code coverage
- Critical paths should have 100% coverage
- Services and utilities should be thoroughly tested

## Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

### Examples

```
feat(dataset): add AI-powered dataset generation

Implemented new feature to generate test datasets using Gemini AI.
Users can now specify column names and row count to automatically
generate realistic test data.

Closes #123
```

```
fix(validation): handle empty provider configuration

Fixed a bug where empty provider arrays were not properly validated,
causing runtime errors during evaluation.

Fixes #456
```

### Best Practices

- Keep the subject line under 50 characters
- Use imperative mood ("add" not "added")
- Capitalize the first letter
- Don't end with a period
- Reference issues in the footer

## Documentation

### Update Documentation When:

- Adding new features
- Changing existing functionality
- Modifying public APIs
- Adding configuration options

### Documentation Locations

- **README.md**: Overview, features, quick start
- **Code comments**: Inline documentation
- **JSDoc**: Function and API documentation
- **Issue templates**: For standardized issue reporting

## Project Architecture

Understanding the architecture helps when contributing:

### Electron Main Process
- **[main.ts](electron/main.ts)**: App entry point
- **[ipc.ts](electron/ipc.ts)**: IPC handlers
- **[preload.ts](electron/preload.ts)**: Context bridge

### React Renderer Process
- **[App.tsx](src/App.tsx)**: Root component
- **[components/](src/components/)**: UI components
- **[services/](src/services/)**: Business logic
- **[lib/](src/lib/)**: Utilities and types

### Key Files

- **[types.ts](src/lib/types.ts)**: TypeScript definitions
- **[buildYaml.ts](src/lib/buildYaml.ts)**: YAML generation
- **[ValidationService.ts](src/services/ValidationService.ts)**: Input validation
- **[EvaluationService.ts](src/services/EvaluationService.ts)**: Test execution

## Building and Packaging

### Development Build
```bash
npm run dev
```

### Production Build
```bash
# Build renderer and electron
npm run build

# Create distribution packages
npm run dist        # All platforms
npm run dist:mac    # macOS only
npm run dist:win    # Windows only
npm run dist:linux  # Linux only
```

## Getting Help

If you need help:
- Check existing [documentation](README.md)
- Search [existing issues](https://github.com/syamsasi99/prompt-evaluator/issues)
- Ask a question using the [Question template](.github/ISSUE_TEMPLATE/question.yml)
- Review [Promptfoo documentation](https://promptfoo.dev)

## Recognition

Contributors will be:
- Listed in release notes
- Mentioned in the project README
- Recognized in the community

Thank you for contributing to Prompt Evaluator! Your efforts help make LLM evaluation more accessible to everyone.
