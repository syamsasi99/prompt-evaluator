# Build Scripts Directory

This directory contains installer and post-installation scripts for Prompt Evaluator.

## Files

### Windows Installer
- **installer.nsh** - NSIS custom installer script
  - Checks for Node.js and promptfoo
  - Guides users through installation
  - Automatically installs promptfoo if Node.js is present

### macOS Post-Install
- **postinstall-mac.sh** - First-launch setup script
  - Runs on first app launch
  - Detects Homebrew and offers Node.js installation
  - Installs promptfoo with admin privileges
  - Uses native macOS dialogs

### Linux Post-Install
- **postinstall-linux.sh** - Post-installation script for DEB packages
  - Auto-detects package manager (apt/dnf/yum/pacman/zypper)
  - Supports GUI (zenity/kdialog) and console modes
  - Installs Node.js from NodeSource repository
  - Installs promptfoo globally with sudo

### Entitlements (macOS)
- **entitlements.mac.plist** - macOS security entitlements (if needed)

## Usage

These scripts are automatically integrated into the build process via `electron-builder.yml`.

### Building Installers

```bash
# All platforms
npm run dist

# Platform-specific
npm run dist:win     # Uses installer.nsh
npm run dist:mac     # Includes first-launch integration
npm run dist:linux   # Uses postinstall-linux.sh for DEB
```

## Script Permissions

Bash scripts must be executable:

```bash
chmod +x postinstall-mac.sh
chmod +x postinstall-linux.sh
```

These permissions are set automatically during development.

## Testing

### Test NSIS Installer (Windows)
1. Build: `npm run dist:win`
2. Run installer from `release/` directory
3. Follow the prompts to test dependency checking

### Test macOS First Launch
1. Build: `npm run dist:mac`
2. Install the DMG
3. Launch app - first-launch wizard should appear
4. Reset first launch: `rm ~/Library/Application\ Support/prompt-evaluator/.first-launch-complete`

### Test Linux Post-Install
1. Build: `npm run dist:linux`
2. Install DEB: `sudo dpkg -i release/*.deb`
3. Post-install script runs automatically
4. Check logs: `cat /tmp/promptfoo-install.log`

## Customization

### Modify Windows Installer Dialogs
Edit `installer.nsh` and change the MessageBox calls:

```nsis
MessageBox MB_YESNO|MB_ICONQUESTION "Your custom message" IDYES action IDNO skip
```

### Modify macOS Dialogs
Edit `postinstall-mac.sh` or `electron/firstLaunch.ts` (for native Electron dialogs):

```bash
# postinstall-mac.sh
osascript <<EOF
tell app "System Events"
    display dialog "Your custom message"
end tell
EOF
```

```typescript
// firstLaunch.ts
await dialog.showMessageBox({
  type: 'info',
  title: 'Custom Title',
  message: 'Your custom message',
})
```

### Modify Linux Dialogs
Edit `postinstall-linux.sh`:

```bash
show_dialog "Custom Title" "Your custom message" "info"
```

## Troubleshooting

### Windows: Script Not Running
- Check that `include: build/installer.nsh` is in `electron-builder.yml`
- Verify NSIS syntax: install NSIS and compile manually

### macOS: First Launch Not Triggering
- Check that `handleFirstLaunch()` is called in `electron/main.ts`
- Verify the flag file location: `app.getPath('userData')/.first-launch-complete`
- Ensure `isDev` check is not blocking execution

### Linux: Post-Install Script Not Running
- Check that `afterInstall: build/postinstall-linux.sh` is in `electron-builder.yml`
- Verify script has execute permissions: `ls -l postinstall-linux.sh`
- Check DEB control file in build output

## Security Notes

- All scripts validate input before execution
- macOS/Linux scripts use sudo only when necessary
- Windows installer runs with installer privileges (standard)
- No arbitrary command execution from user input

## Documentation

See [INSTALLER.md](../INSTALLER.md) for complete documentation on the installer system.
