# Creating Your First Release (v0.0.1)

Follow these steps to create the first release of Prompt Evaluator:

## Step 1: Verify Everything Works

```bash
# Run all tests
npm test

# Build the application locally
npm run build

# Test the installer on your platform (optional)
npm run dist:mac    # or dist:win or dist:linux
```

## Step 2: Commit All Changes

Make sure all your changes are committed:

```bash
git add .
git commit -m "Prepare for v0.0.1 release"
git push origin master
```

## Step 3: Create and Push the Release Tag

```bash
# Create the tag
git tag -a v0.0.1 -m "Release version 0.0.1"

# Push the tag to GitHub
git push origin v0.0.1
```

## Step 4: Monitor the Build

1. Go to your GitHub repository
2. Click on the "Actions" tab
3. You should see a workflow run called "Build and Release"
4. Click on it to monitor the progress

The workflow will:
- ✅ Build installers for macOS, Windows, and Linux (in parallel)
- ✅ Run all tests
- ✅ Create a GitHub release
- ✅ Upload all installers to the release

This typically takes 15-20 minutes to complete.

## Step 5: Verify the Release

Once the workflow completes:

1. Go to the "Releases" section of your GitHub repository
2. You should see "Release v0.0.1"
3. Verify that all installer files are attached:
   - `Prompt-Evaluator-0.0.1.dmg` (macOS)
   - `Prompt-Evaluator-0.0.1-mac.zip` (macOS)
   - `Prompt-Evaluator-Setup-0.0.1.exe` (Windows)
   - `Prompt-Evaluator-0.0.1-win.zip` (Windows)
   - `Prompt-Evaluator-0.0.1.AppImage` (Linux)
   - `prompt-evaluator_0.0.1_amd64.deb` (Linux)

## Alternative: Manual Trigger

If you prefer not to use git tags, you can manually trigger the release:

1. Go to GitHub Actions
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Enter version: `0.0.1`
5. Click "Run workflow"

## What Happens Next?

Users can now:
1. Visit your GitHub releases page
2. Download the appropriate installer for their platform
3. Install and run Prompt Evaluator

## Troubleshooting

### Workflow Fails

Check the workflow logs:
- If tests fail, fix them and try again
- If build fails, check the build scripts
- If upload fails, check GitHub permissions

### Missing Files

If some installer files are missing:
1. Check the "Build installer" step logs
2. Verify the electron-builder configuration in `package.json`
3. Ensure all required build assets exist

### Can't Push Tag

If you get permission errors:
```bash
git push origin v0.0.1 --force  # Use with caution
```

Or delete and recreate the tag:
```bash
git tag -d v0.0.1
git push origin :refs/tags/v0.0.1
git tag -a v0.0.1 -m "Release version 0.0.1"
git push origin v0.0.1
```

## Next Steps

After creating v0.0.1:
1. Test the installers on different platforms
2. Get feedback from users
3. Plan for v0.0.2 with bug fixes and improvements
4. Update version in `package.json` for next release

## Notes

- The version in `package.json` is currently set to `0.0.1`
- Future releases: increment the version and create a new tag
- Release notes are automatically generated from commits
- You can edit the release description on GitHub after creation
