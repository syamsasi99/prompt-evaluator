# Regression Test Cases - Prompt Evaluator

This document contains comprehensive regression test cases for Prompt Evaluator, organized by feature area. Use these as checkpoints to ensure the application works correctly after changes.

**Version:** 1.0.0
**Last Updated:** October 28, 2025

---

## Table of Contents

1. [Application Launch & Setup](#1-application-launch--setup)
2. [Project Management](#2-project-management)
3. [Provider Configuration](#3-provider-configuration)
4. [Prompt Management](#4-prompt-management)
5. [Dataset Management](#5-dataset-management)
6. [Assertions Configuration](#6-assertions-configuration)
7. [Evaluation Execution](#7-evaluation-execution)
8. [Results Visualization](#8-results-visualization)
9. [History & Comparison](#9-history--comparison)
10. [Dashboard Analytics](#10-dashboard-analytics)
11. [BigQuery Integration](#11-bigquery-integration)
12. [YAML Generation & Preview](#12-yaml-generation--preview)
13. [Security Testing](#13-security-testing)
14. [File Operations](#14-file-operations)
15. [Error Handling & Validation](#15-error-handling--validation)
16. [Tutorial & Help](#16-tutorial--help)
17. [Performance & Stability](#17-performance--stability)

---

## 1. Application Launch & Setup

### 1.1 First Launch
- [ ] Application launches successfully on macOS
- [ ] Application launches successfully on Windows
- [ ] Application launches successfully on Linux
- [ ] First launch wizard checks for dependencies (promptfoo, npm, node)
- [ ] Missing dependencies are detected and reported
- [ ] User is prompted to install missing dependencies
- [ ] .env file is created in user data directory if not exists
- [ ] Application window opens with correct size and position

### 1.2 Environment Variables
- [ ] GEMINI_API_KEY is loaded from .env file
- [ ] OPENAI_API_KEY is loaded from .env file
- [ ] ANTHROPIC_API_KEY is loaded from .env file
- [ ] BQ_API_TOKEN is loaded from .env file
- [ ] Environment variables from project root are loaded
- [ ] Environment variables from user data directory are loaded
- [ ] API key status is logged correctly (Set/Not Set)

### 1.3 Subsequent Launches
- [ ] Application remembers last window position
- [ ] Application remembers last window size
- [ ] Previously opened project is restored (if any)
- [ ] Tutorial does not show if already completed
- [ ] Settings are persisted between sessions

---

## 2. Project Management

### 2.1 Creating Projects
- [ ] New project can be created with valid name
- [ ] Project name validation rejects empty names
- [ ] Project name validation rejects whitespace-only names
- [ ] Project name accepts alphanumeric characters
- [ ] Project name accepts special characters (-, _, .)
- [ ] Project name accepts numbers
- [ ] New project initializes with empty providers, prompts, dataset, assertions

### 2.2 Saving Projects
- [ ] Project can be saved to file system
- [ ] Save dialog opens with correct default location
- [ ] Project is saved as JSON file
- [ ] Project file contains all configuration data
- [ ] Save operation shows success notification
- [ ] Save operation handles file write errors gracefully

### 2.3 Loading Projects
- [ ] Project can be loaded from JSON file
- [ ] Load dialog opens with correct file filters
- [ ] Loaded project populates all form fields correctly
- [ ] Providers are loaded correctly
- [ ] Prompts are loaded correctly
- [ ] Dataset is loaded correctly
- [ ] Assertions are loaded correctly
- [ ] Options are loaded correctly
- [ ] Invalid JSON files show appropriate error message

### 2.4 Project Validation
- [ ] Project name must be non-empty
- [ ] At least one provider is required
- [ ] At least one prompt is required
- [ ] Dataset is required when prompts have variables
- [ ] Dataset columns must match prompt variables
- [ ] At least one assertion is required (unless security-only tests)
- [ ] Validation errors are displayed clearly to user

### 2.5 Multi-Project Management
- [ ] "Browse All Projects" button opens project switcher modal
- [ ] All saved projects are listed with metadata
- [ ] Project list shows name, last modified date, and file size
- [ ] Projects can be searched/filtered by name
- [ ] Clicking project in list loads it immediately
- [ ] Current project is highlighted in list
- [ ] Projects can be deleted from switcher
- [ ] Delete operation removes project file permanently
- [ ] Deleted projects removed from recent projects list

### 2.6 Recent Projects
- [ ] Recent projects dropdown appears in top menu
- [ ] Up to 5 most recent projects shown
- [ ] Clicking recent project loads it immediately
- [ ] Recent projects list updates when project is loaded/saved
- [ ] "Clear Recent Projects" button removes all from list
- [ ] Clearing recent projects requires confirmation
- [ ] Cleared projects still exist in file system
- [ ] Recent projects persist between app sessions

---

## 3. Provider Configuration

### 3.1 Adding Providers
- [ ] "Add Provider" button opens provider form
- [ ] Provider can be added with valid providerId
- [ ] Provider list displays all added providers
- [ ] Each provider has unique ID
- [ ] Provider card shows provider type and model

### 3.2 Supported Providers
- [ ] Google Gemini providers can be added (gemini-2.5-flash, gemini-2.5-pro, gemini-exp-1206)
- [ ] OpenAI providers can be added (gpt-4o, gpt-4o-mini, o1, o1-mini)
- [ ] Anthropic providers can be added (claude-sonnet-4.5, claude-opus-4, claude-3.5-sonnet)
- [ ] Azure OpenAI providers can be added
- [ ] Custom providers can be added with custom endpoint
- [ ] Replicate providers can be added
- [ ] Hugging Face providers can be added

### 3.3 Provider Configuration
- [ ] Provider config can include temperature
- [ ] Provider config can include maxTokens/max_tokens
- [ ] Provider config can include apiKey
- [ ] Provider config can include custom headers
- [ ] Provider config can include custom URL
- [ ] Invalid provider IDs are rejected (must contain colon)
- [ ] Provider ID format validation works (prefix:model)

### 3.4 Provider Management
- [ ] Provider can be edited after creation
- [ ] Provider can be removed from list
- [ ] Provider changes update the provider list immediately
- [ ] Multiple providers can be configured for comparison
- [ ] API key can be entered inline or use environment variable

### 3.5 API Key Validation
- [ ] API key validation checks for required environment variables
- [ ] Gemini requires GEMINI_API_KEY or GOOGLE_API_KEY
- [ ] OpenAI requires OPENAI_API_KEY
- [ ] Anthropic requires ANTHROPIC_API_KEY
- [ ] Validation shows appropriate error for missing API keys
- [ ] API keys are redacted in logs and error messages

---

## 4. Prompt Management

### 4.1 Creating Prompts
- [ ] "Add Prompt" button creates new prompt
- [ ] Prompt requires label
- [ ] Prompt requires text content
- [ ] Prompt text supports multiline input
- [ ] Monaco editor provides syntax highlighting
- [ ] Multiple prompts can be added

### 4.2 Variable Interpolation
- [ ] Variables are detected using {{variable}} syntax
- [ ] Variables are extracted correctly from prompt text
- [ ] Multiple variables in single prompt are detected
- [ ] Variables with underscores are supported ({{user_name}})
- [ ] Variables with numbers are supported ({{var1}})
- [ ] Nested braces are handled correctly

### 4.3 Prompt Editing
- [ ] Existing prompt text can be edited
- [ ] Prompt label can be edited
- [ ] Changes are reflected immediately in UI
- [ ] Cursor position is maintained during editing
- [ ] Undo/redo works in Monaco editor

### 4.4 Prompt Management
- [ ] Prompts can be reordered
- [ ] Prompts can be deleted
- [ ] Prompt list shows all added prompts
- [ ] Empty prompt text is not allowed
- [ ] Prompt changes trigger validation

---

## 5. Dataset Management

### 5.1 Manual Dataset Creation
- [ ] Columns can be added manually
- [ ] Column names must match prompt variables
- [ ] Rows can be added manually
- [ ] Row data can be edited inline
- [ ] Rows can be deleted
- [ ] Empty cells are allowed
- [ ] Dataset table displays correctly

### 5.2 CSV Import
- [ ] "Import CSV" button opens file dialog
- [ ] CSV file can be selected and imported
- [ ] CSV headers are parsed correctly
- [ ] CSV data rows are imported correctly
- [ ] CSV with quoted fields is handled correctly
- [ ] CSV with commas in values is handled correctly
- [ ] Large CSV files are imported successfully
- [ ] Invalid CSV format shows error message
- [ ] Imported data overwrites existing dataset

### 5.3 AI-Generated Datasets
- [ ] "Generate with AI" button opens generation dialog
- [ ] User can specify column names
- [ ] User can specify number of rows to generate
- [ ] AI generates realistic test data
- [ ] Generated data matches specified columns
- [ ] Generated data is appended to existing dataset
- [ ] Generation errors are handled gracefully
- [ ] Requires GEMINI_API_KEY to be set

### 5.4 Dataset Validation
- [ ] Dataset columns are validated against prompt variables
- [ ] Missing required columns trigger validation error
- [ ] Extra columns are allowed
- [ ] Empty dataset is allowed when no variables in prompts
- [ ] Dataset with no rows shows warning
- [ ] Special column names (expected_output, expected, __expected) are recognized

### 5.5 Dataset Export
- [ ] Dataset can be exported to CSV
- [ ] Export preserves column order
- [ ] Export preserves data types
- [ ] Export handles special characters correctly

---

## 6. Assertions Configuration

### 6.1 Built-in Assertions
- [ ] "is-json" assertion can be added
- [ ] "contains" assertion can be added with value
- [ ] "equals" assertion can be added with value
- [ ] "regex" assertion can be added with pattern
- [ ] "llm-rubric" assertion can be added with criteria
- [ ] "latency" assertion can be added with threshold
- [ ] "cost" assertion can be added with threshold
- [ ] "factuality" assertion can be added
- [ ] "similarity" assertion can be added
- [ ] Multiple assertions can be configured

### 6.2 Assertion Configuration
- [ ] Assertion type can be selected from dropdown
- [ ] Assertion value field shows for applicable types
- [ ] Assertion weight can be configured
- [ ] Assertion threshold can be configured
- [ ] Assertion metric can be selected
- [ ] Invalid assertion values are rejected

### 6.3 AI-Generated Assertions
- [ ] "Generate Assertions with AI" analyzes prompts
- [ ] AI suggests relevant assertions based on prompt content
- [ ] User can review and accept suggested assertions
- [ ] User can reject suggested assertions
- [ ] Generated assertions are valid and properly formatted
- [ ] Requires GEMINI_API_KEY to be set

### 6.4 Assertion Validation
- [ ] At least one assertion required for functional tests
- [ ] Assertions requiring expected_output check for column presence
- [ ] Factuality assertions require expected_output column
- [ ] Invalid assertion types are rejected
- [ ] Validation errors show specific missing columns

### 6.5 Assertion Management
- [ ] Assertions can be edited after creation
- [ ] Assertions can be removed
- [ ] Assertion list updates immediately
- [ ] Assertion order can be changed

---

## 7. Evaluation Execution

### 7.1 Running Evaluations
- [ ] "Run" button initiates evaluation
- [ ] Validation occurs before evaluation starts
- [ ] Validation errors prevent evaluation from starting
- [ ] Progress modal opens when evaluation starts
- [ ] Live logs stream to progress modal
- [ ] Progress indicator shows current status

### 7.2 Functional Tests
- [ ] Functional tests execute when assertions exist
- [ ] All provider-prompt-dataset combinations are tested
- [ ] Test count calculation is correct (rows × providers × prompts)
- [ ] Assertion results are captured
- [ ] Token usage is tracked
- [ ] Latency is measured
- [ ] Cost is calculated

### 7.3 Security Tests
- [ ] Security tests execute when enabled in settings
- [ ] Security tests only run when prompts have variables
- [ ] OWASP LLM tests are executed
- [ ] Prompt injection tests run
- [ ] PII leakage tests run
- [ ] Security test results are separate from functional tests
- [ ] Security test runId has "-security" suffix

### 7.4 Evaluation Progress
- [ ] Progress modal shows real-time logs
- [ ] Logs are prefixed with [Functional] or [Security]
- [ ] Current test number is displayed
- [ ] Total test count is displayed
- [ ] Elapsed time is shown
- [ ] "Abort" button is available during execution

### 7.5 Abort Functionality
- [ ] "Abort" button cancels running evaluation
- [ ] Partial results are preserved when aborted
- [ ] Abort is confirmed with user
- [ ] Aborted evaluation shows appropriate status
- [ ] Application remains responsive after abort

### 7.6 Evaluation Completion
- [ ] Success notification shown on completion
- [ ] Results are automatically displayed
- [ ] Results are saved to history
- [ ] BigQuery export triggers if enabled
- [ ] Progress modal closes automatically
- [ ] HTML output file is generated
- [ ] JSON output file is generated

### 7.7 Error Handling
- [ ] API errors are caught and displayed
- [ ] Network errors are handled gracefully
- [ ] Invalid API keys trigger clear error messages
- [ ] Rate limiting errors are reported
- [ ] Promptfoo CLI errors are captured in logs
- [ ] Evaluation failures don't crash the app

---

## 8. Results Visualization

### 8.1 Results Display
- [ ] Results tab activates after evaluation
- [ ] Pass/fail statistics are displayed
- [ ] Overall score is shown
- [ ] Test case breakdown is visible
- [ ] Provider comparison is available
- [ ] Results grid shows all test combinations

### 8.2 Test Case Details
- [ ] Each test case shows input variables
- [ ] Each test case shows prompt used
- [ ] Each test case shows provider response
- [ ] Each test case shows assertion results
- [ ] Pass/fail status is color-coded (green/red)
- [ ] Scores are displayed as percentages
- [ ] Token counts are shown
- [ ] Latency values are displayed
- [ ] Cost per test is calculated

### 8.3 Provider Comparison
- [ ] Side-by-side comparison of provider outputs
- [ ] Highlighting of differences between outputs
- [ ] Token usage comparison across providers
- [ ] Latency comparison across providers
- [ ] Cost comparison across providers
- [ ] Best performing provider is highlighted

### 8.4 Assertion Results
- [ ] Each assertion shows pass/fail status
- [ ] Assertion scores are displayed
- [ ] Failed assertions show reason for failure
- [ ] LLM-rubric results show detailed feedback
- [ ] Assertion weights affect overall score

### 8.5 AI Analysis
- [ ] "Analyze with AI" button triggers analysis
- [ ] AI analyzes results and identifies patterns
- [ ] AI provides prompt improvement suggestions
- [ ] Analysis results are displayed in modal
- [ ] Suggestions can be applied to prompts
- [ ] Re-run evaluation with improved prompts
- [ ] Requires GEMINI_API_KEY to be set

### 8.6 Export Results
- [ ] Results can be exported to PDF
- [ ] PDF includes all test cases and metrics
- [ ] PDF formatting is readable and professional
- [ ] Charts and graphs are included in PDF
- [ ] HTML results can be opened in browser
- [ ] JSON results can be exported

---

## 9. History & Comparison

### 9.1 Evaluation History
- [ ] History tab shows all past evaluations
- [ ] History stores up to 500 evaluations
- [ ] Oldest evaluations are removed when limit reached
- [ ] Evaluations are sorted by timestamp (newest first)
- [ ] Each history entry shows project name
- [ ] Each entry shows evaluation date/time
- [ ] Each entry shows overall score
- [ ] Each entry shows number of tests
- [ ] Each entry shows pass/fail counts
- [ ] Each entry shows cost and token usage
- [ ] History persists between app sessions
- [ ] History file stored in user data directory

### 9.2 History Filtering & Search
- [ ] Search box filters evaluations by project name
- [ ] Project name filter dropdown available
- [ ] Date range filtering works correctly
- [ ] Filters can be combined
- [ ] Filter results update immediately
- [ ] Clear filters button resets all filters

### 9.3 Loading Historical Results
- [ ] Clicking history entry loads that evaluation
- [ ] Loaded results display in Results tab
- [ ] Historical project configuration is preserved
- [ ] All metrics and scores are restored
- [ ] Provider outputs are available
- [ ] Can navigate between history entries

### 9.4 Comparison Mode
- [ ] Comparison mode toggle button available
- [ ] Multiple evaluations (2-10) can be selected
- [ ] Selection count is displayed
- [ ] "Compare Selected" button appears when 2+ selected
- [ ] Comparison view opens in new view
- [ ] Comparison shows side-by-side metrics
- [ ] Test case differences are highlighted
- [ ] Score changes shown with indicators (↑ improved, ↓ degraded, → stable)
- [ ] Color coding: green=improved, red=degraded, gray=stable
- [ ] Provider output differences visible with text diff
- [ ] Statistical comparison provided
- [ ] Detailed line-by-line text diff view

### 9.5 Configuration Change Tracking
- [ ] Configuration Changes section shows all changes
- [ ] Prompt changes detected (added/removed/modified)
- [ ] Modified prompts show text diff view
- [ ] Assertion changes detected (added/removed/modified)
- [ ] Provider/model changes detected
- [ ] Dataset row count changes shown
- [ ] Expand/collapse functionality for each change type
- [ ] Changes highlighted with appropriate colors
- [ ] No changes message when configurations identical

### 9.6 Comparison Analysis
- [ ] "Analyze Comparison with AI" button available
- [ ] AI analysis generates insights on performance changes
- [ ] AI suggests reasons for regressions
- [ ] AI recommends improvements
- [ ] Analysis displayed in chat interface
- [ ] Follow-up questions can be asked
- [ ] Chat history maintained during session
- [ ] Analysis considers all selected runs
- [ ] Requires GEMINI_API_KEY to be set

### 9.7 Volatility & Regression Detection
- [ ] Test volatility is automatically detected
- [ ] Volatile tests are flagged with warning
- [ ] Regressions are highlighted
- [ ] Most improved tests identified
- [ ] Most regressed tests identified
- [ ] Improvement/regression percentages shown
- [ ] Trend indicators show performance direction

### 9.8 Comparison Export
- [ ] Comparison results can be exported to PDF
- [ ] PDF includes all compared runs
- [ ] PDF shows configuration differences
- [ ] PDF includes metrics comparison
- [ ] PDF shows test result changes
- [ ] PDF formatting is professional
- [ ] Export progress is shown

### 9.9 History Management
- [ ] Individual history entries can be deleted
- [ ] Delete operation requires confirmation
- [ ] Deleted entries are removed permanently
- [ ] Deletion updates history list immediately
- [ ] History file is updated after deletion

---

## 10. Dashboard Analytics

### 10.1 Dashboard Display
- [ ] Dashboard tab accessible from main navigation
- [ ] Dashboard shows aggregate statistics
- [ ] Total evaluations count is displayed
- [ ] Average pass rate is shown as percentage
- [ ] Total cost displayed with 4 decimal places ($0.0000)
- [ ] Average score shown as percentage
- [ ] Total token usage displayed
- [ ] Statistics update when new evaluations added
- [ ] Empty state shown when no evaluations exist

### 10.2 Recent Activity Widget
- [ ] Recent evaluations section shows last 5 runs
- [ ] Each entry shows timestamp
- [ ] Each entry shows project name
- [ ] Each entry shows overall score
- [ ] Each entry shows pass/fail status
- [ ] Click entry to view detailed results
- [ ] Entries sorted by most recent first

### 10.3 Performance Trends
- [ ] Trend charts appear when 2+ evaluations exist
- [ ] Pass rate trend chart shows percentage over time
- [ ] Multi-metric comparison chart available
- [ ] Cost trend chart shows spending over time (4 decimal precision)
- [ ] Token usage trend chart shows consumption
- [ ] Charts use time-series x-axis
- [ ] Charts show data points for each evaluation
- [ ] Hover shows exact values in tooltip
- [ ] Charts are responsive and resize properly
- [ ] Chart legends are clear and accurate

### 10.4 Project Filtering
- [ ] Project filter dropdown appears when multiple projects exist
- [ ] "All Projects" option shows aggregate data
- [ ] Dropdown lists all unique project names
- [ ] Selecting project filters all dashboard metrics
- [ ] Statistics update based on selected project
- [ ] Trend charts update based on project filter
- [ ] Recent activity updates based on project filter
- [ ] Filter selection persists during session
- [ ] Filter resets to "All Projects" on refresh

### 10.5 Metrics Accuracy
- [ ] Pass rate calculation is correct
- [ ] Cost totals match sum of individual evaluations
- [ ] Token totals match sum of individual evaluations
- [ ] Average score calculation is accurate
- [ ] Filtered metrics match selected project data
- [ ] Trends show correct direction (up/down)

---

## 11. BigQuery Integration

### 11.1 Configuration
- [ ] BigQuery can be enabled in Options
- [ ] Project ID can be configured
- [ ] Dataset ID can be configured
- [ ] Table ID can be configured
- [ ] BQ_API_TOKEN environment variable is required
- [ ] Service account key validation works
- [ ] Invalid credentials show error

### 11.2 Export Functionality
- [ ] Results export to BigQuery after evaluation
- [ ] Export includes all test case data
- [ ] Export includes metadata (timestamp, project name)
- [ ] Export includes provider information
- [ ] Export includes assertion results
- [ ] Export includes token usage and costs
- [ ] USER_EMAIL and USER_NAME are included if set

### 11.3 Table Schema
- [ ] Table is created if it doesn't exist
- [ ] Schema matches expected structure
- [ ] All required fields are present
- [ ] Data types are correct
- [ ] Null handling works correctly

### 11.4 Error Handling
- [ ] Authentication errors are caught
- [ ] Network errors are handled
- [ ] Invalid table/dataset errors are reported
- [ ] Quota exceeded errors are handled
- [ ] Export failures don't block result viewing
- [ ] Retry logic works for transient errors

---

## 11. YAML Generation & Preview

### 11.1 YAML Generation
- [ ] YAML is generated from project configuration
- [ ] Generated YAML is valid promptfoo format
- [ ] Providers section is correct
- [ ] Prompts section includes all prompts
- [ ] Tests section includes dataset rows
- [ ] Assertions section is properly formatted
- [ ] Output paths are included
- [ ] Transform functions are included

### 11.2 YAML Preview
- [ ] "Preview YAML" button opens preview modal
- [ ] Generated YAML is syntax-highlighted
- [ ] YAML can be copied to clipboard
- [ ] Preview shows current project state
- [ ] Preview updates when project changes
- [ ] Preview includes comments for clarity

### 11.3 Security YAML
- [ ] Security YAML is generated separately
- [ ] Security plugins are included
- [ ] Security test types are configured
- [ ] Security config is valid promptfoo format
- [ ] Variables are properly mapped

### 11.4 API Key Handling
- [ ] API keys can be excluded from YAML preview
- [ ] includeApiKeys option works correctly
- [ ] API keys are redacted when excluded
- [ ] Other config values are preserved
- [ ] Environment variable references are used when available

### 11.5 Dataset Handling
- [ ] Inline dataset is used when CSV not saved
- [ ] CSV path is used when dataset saved to file
- [ ] Dataset variables match prompt variables
- [ ] Empty dataset is handled correctly
- [ ] Large datasets use CSV reference

---

## 12. Security Testing

### 12.1 Security Configuration
- [ ] Security tests can be enabled in Options
- [ ] Security test types can be selected
- [ ] Prompt injection tests can be enabled
- [ ] PII leakage tests can be enabled
- [ ] Overreliance tests can be enabled
- [ ] Custom security plugins can be added

### 12.2 Security Execution
- [ ] Security tests run separately from functional tests
- [ ] Security tests only run when prompts have variables
- [ ] Security test progress is shown separately
- [ ] Security logs are prefixed with [Security]
- [ ] Security results are merged with functional results

### 12.3 Security Results
- [ ] Security test results are displayed separately
- [ ] Each security test shows pass/fail status
- [ ] Security vulnerabilities are highlighted
- [ ] Severity levels are shown
- [ ] Remediation suggestions are provided

### 12.4 OWASP LLM Tests
- [ ] LLM01 (Prompt Injection) tests work
- [ ] LLM02 (Insecure Output) tests work
- [ ] LLM06 (Sensitive Info Disclosure) tests work
- [ ] LLM07 (Insecure Plugin Design) tests work
- [ ] LLM09 (Overreliance) tests work
- [ ] Test results are categorized by OWASP type

---

## 13. File Operations

### 13.1 Save Operations
- [ ] "Save" menu item works
- [ ] "Save As" menu item works
- [ ] Keyboard shortcut (Cmd/Ctrl+S) works
- [ ] File dialog shows correct default location
- [ ] File is saved with .json extension
- [ ] Overwrite confirmation is shown
- [ ] Save errors are handled gracefully

### 13.2 Open Operations
- [ ] "Open" menu item works
- [ ] Keyboard shortcut (Cmd/Ctrl+O) works
- [ ] File dialog filters for .json files
- [ ] Selected file is loaded correctly
- [ ] Current project is replaced
- [ ] Unsaved changes prompt is shown
- [ ] Invalid files show error message

### 13.3 New Project
- [ ] "New Project" menu item works
- [ ] Current project is cleared
- [ ] Unsaved changes prompt is shown
- [ ] All forms are reset to empty state
- [ ] Tutorial doesn't re-trigger

### 13.4 Recent Files
- [ ] Recent files list is maintained
- [ ] Recent files show in File menu
- [ ] Recent files can be opened directly
- [ ] Invalid paths are removed from recent list
- [ ] Recent files persist between sessions

---

## 14. Error Handling & Validation

### 14.1 Form Validation
- [ ] Empty fields show validation errors
- [ ] Invalid formats are rejected
- [ ] Required fields are marked clearly
- [ ] Validation errors are cleared when fixed
- [ ] Multiple validation errors can be shown
- [ ] Form submission blocked when invalid

### 14.2 Runtime Errors
- [ ] Uncaught exceptions are logged
- [ ] Error boundaries catch React errors
- [ ] Application doesn't crash on errors
- [ ] User-friendly error messages are shown
- [ ] Technical details available in console
- [ ] Errors can be reported to developers

### 14.3 Network Errors
- [ ] API timeouts are handled
- [ ] Connection failures show retry option
- [ ] Rate limiting is detected and reported
- [ ] Offline mode is detected
- [ ] Network errors don't lose user data

### 14.4 Data Validation
- [ ] JSON parsing errors are caught
- [ ] Schema validation works
- [ ] Type checking prevents invalid data
- [ ] Missing required fields are detected
- [ ] Invalid data types are rejected

---

## 15. Tutorial & Help

### 15.1 Tutorial System
- [ ] Tutorial starts on first launch
- [ ] Tutorial can be skipped
- [ ] Tutorial highlights UI elements correctly
- [ ] Tutorial steps advance properly
- [ ] Tutorial can be restarted from Help menu
- [ ] Tutorial completion is persisted

### 15.2 Help Documentation
- [ ] Help menu is accessible
- [ ] Help topics are organized logically
- [ ] Documentation links open correctly
- [ ] Tooltips provide contextual help
- [ ] Keyboard shortcuts are documented

### 15.3 About Dialog
- [ ] About dialog shows version number
- [ ] License information is displayed
- [ ] Credits are shown
- [ ] Links to repository/documentation work

---

## 16. Performance & Stability

### 16.1 Performance
- [ ] Application starts in < 3 seconds
- [ ] UI is responsive during evaluations
- [ ] Large datasets (1000+ rows) load quickly
- [ ] Monaco editor handles large prompts
- [ ] Results render efficiently
- [ ] No memory leaks during long sessions
- [ ] File I/O is non-blocking

### 16.2 Stability
- [ ] No crashes during normal operation
- [ ] Concurrent operations don't cause issues
- [ ] Rapid clicking doesn't break UI
- [ ] Window resize works smoothly
- [ ] Minimize/maximize works correctly
- [ ] App can be quit cleanly

### 16.3 Resource Usage
- [ ] CPU usage reasonable during idle
- [ ] Memory usage stays under 500MB
- [ ] Disk I/O is minimal
- [ ] Network requests are optimized
- [ ] Cleanup occurs after operations

### 16.4 Cross-Platform
- [ ] macOS build works on all supported versions
- [ ] Windows build works on Windows 10/11
- [ ] Linux build works on Ubuntu/Debian
- [ ] All features work on all platforms
- [ ] Platform-specific UI looks native
- [ ] Keyboard shortcuts work on all platforms

---

## Test Execution Guidelines

### How to Use This Document

1. **Pre-Release Testing**: Run through all checkpoints before releasing a new version
2. **Feature Development**: Test relevant sections after implementing new features
3. **Bug Fix Verification**: Verify related test cases after fixing bugs
4. **Regression Detection**: Regular testing catches unintended side effects
5. **Continuous Integration**: Automate as many tests as possible in CI/CD

### Test Environment Setup

1. Clean install of the application
2. Fresh .env file with valid API keys
3. Test datasets in CSV format
4. Access to BigQuery (for integration tests)
5. Multiple LLM provider accounts

### Reporting Issues

When a test case fails:
- Note the specific checkpoint that failed
- Document steps to reproduce
- Capture screenshots/logs
- Check console for errors
- File issue with test case reference

### Priority Levels

- **P0 Critical**: Application launch, core evaluation flow, data integrity
- **P1 High**: Provider config, prompt editing, results display
- **P2 Medium**: Advanced features, integrations, export functions
- **P3 Low**: UI polish, tutorial, optional features

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-28 | Added Dashboard Analytics, Enhanced History & Comparison, Multi-Project Management |
| 1.0.0 | 2025-10-27 | Initial regression test cases document |

---

**End of Document**
