# Release Process

This document explains how to create releases for Prompt Evaluator.

## Prerequisites

Before creating a release, ensure:
1. All tests pass: `npm test`
2. The application builds successfully: `npm run build`
3. You have the necessary permissions to create releases in the GitHub repository

## Creating a Release

There are two ways to trigger a release:

### Method 1: Git Tag (Recommended)

1. Update the version in `package.json`:
   ```bash
   npm version 0.0.1  # or your desired version
   ```

2. Push the tag to GitHub:
   ```bash
   git push origin v0.0.1
   ```

3. The GitHub Actions workflow will automatically:
   - Build installers for macOS, Windows, and Linux
   - Run tests
   - Create a GitHub release
   - Upload all installer files

### Method 2: Manual Trigger

1. Go to the GitHub repository
2. Click on "Actions" tab
3. Select "Build and Release" workflow
4. Click "Run workflow"
5. Enter the version number (e.g., `0.0.1`)
6. Click "Run workflow"

## Release Artifacts

The workflow creates the following installers:

### macOS
- `Prompt-Evaluator-{version}.dmg` - macOS disk image installer
- `Prompt-Evaluator-{version}-mac.zip` - Portable macOS app

### Windows
- `Prompt-Evaluator-Setup-{version}.exe` - Windows NSIS installer
- `Prompt-Evaluator-{version}-win.zip` - Portable Windows app

### Linux
- `Prompt-Evaluator-{version}.AppImage` - Universal Linux package
- `prompt-evaluator_{version}_amd64.deb` - Debian/Ubuntu package

## Version Numbering

We follow semantic versioning (semver):
- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- `0.0.x` - Initial development versions
- `0.x.0` - Beta versions
- `1.0.0` - First stable release

## Troubleshooting

### Build Fails on GitHub Actions

1. Check the workflow logs in the Actions tab
2. Common issues:
   - Missing dependencies
   - Test failures
   - Build script errors
   - Permission issues

### Release Not Created

1. Ensure you have write permissions to the repository
2. Check that `GITHUB_TOKEN` has the necessary permissions
3. Verify the workflow completed successfully

### Artifacts Missing

1. Check the "Upload artifacts" step in the workflow logs
2. Ensure the build step completed successfully
3. Verify file paths in the workflow match actual output locations

## Manual Local Testing

Before creating a release, test the builds locally:

```bash
# Test all platforms (requires appropriate OS)
npm run dist

# Test specific platform
npm run dist:mac      # macOS
npm run dist:win      # Windows
npm run dist:linux    # Linux
```

The built installers will be in the `release/` directory.

## Post-Release Checklist

After a release is created:

1. ✅ Verify all installer files are attached to the release
2. ✅ Test download and installation on each platform
3. ✅ Update the README if needed
4. ✅ Announce the release to users
5. ✅ Close related issues/milestones

## CI/CD Workflow Details

The GitHub Actions workflow:
1. **Trigger**: On tag push (`v*`) or manual dispatch
2. **Test Stage**: Runs first to validate code quality
   - Installs dependencies
   - Runs all unit tests
   - Uploads test results/coverage
   - **If tests fail, the entire workflow stops here**
3. **Build Stage**: Runs on 3 parallel jobs (macOS, Windows, Linux) only if tests pass
   - Installs dependencies
   - Builds the application
   - Creates platform-specific installers
   - Uploads artifacts
4. **Release Stage**: Runs after all builds complete
   - Downloads all artifacts
   - Creates a GitHub release
   - Attaches all installers to the release
   - Generates release notes

## Security Notes

- The workflow uses `GITHUB_TOKEN` for authentication
- No secrets (API keys, passwords) are exposed in the build process
- Installers are not signed by default (see INSTALLATION.md for user implications)
