# Release Checklist

Use this checklist when creating a new release.

## Pre-Release

- [ ] All tests pass locally (`npm test`)
- [ ] Application builds successfully (`npm run build`)
- [ ] All features are working as expected
- [ ] Version number updated in `package.json`
- [ ] README.md updated with new features (if any)
- [ ] All changes committed and pushed to master

## Creating Release

- [ ] Create git tag: `git tag -a v{version} -m "Release version {version}"`
- [ ] Push tag to GitHub: `git push origin v{version}`
- [ ] Monitor GitHub Actions workflow
- [ ] Wait for all build jobs to complete (~15-20 mins)

## Post-Release Verification

- [ ] Release created on GitHub
- [ ] All 6 installer files attached to release:
  - [ ] macOS .dmg
  - [ ] macOS .zip
  - [ ] Windows .exe
  - [ ] Windows .zip
  - [ ] Linux .AppImage
  - [ ] Linux .deb
- [ ] Release notes generated correctly
- [ ] Download and test one installer from each platform

## Distribution

- [ ] Announce release to users
- [ ] Update any external documentation
- [ ] Close related GitHub issues
- [ ] Update project board/milestones

## Version Numbers Reference

- **0.0.x** - Initial development versions
- **0.x.0** - Beta versions
- **1.0.0** - First stable release
- **x.y.z** - Follow semantic versioning

## Quick Commands

```bash
# Check current version
cat package.json | grep version

# Update version (updates package.json)
npm version 0.0.2  # or patch/minor/major

# Create and push tag
git tag -a v0.0.2 -m "Release version 0.0.2"
git push origin v0.0.2

# Delete tag if needed (before pushing)
git tag -d v0.0.2

# Delete remote tag
git push origin :refs/tags/v0.0.2
```

## Troubleshooting

If workflow fails:
1. Check the "Actions" tab for error messages
2. Review the failed job logs
3. Fix the issue locally
4. Delete the tag: `git push origin :refs/tags/v{version}`
5. Recreate and push the tag

If release is missing files:
1. Check the "Upload artifacts" step in workflow
2. Verify electron-builder configuration
3. Re-run the workflow if it was a transient issue

## Next Release Planning

After successful release:
- [ ] Create milestone for next version
- [ ] Plan features for next release
- [ ] Update project roadmap
- [ ] Collect user feedback
