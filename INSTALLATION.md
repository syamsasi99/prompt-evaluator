# Installation Guide

## macOS Installation

### Download

Download the latest DMG file from the [Releases page](https://github.com/carousell/prompt-evaluator/releases/latest).

---

## ⚠️ Important: macOS Gatekeeper Warning

When you first open Prompt Evaluator, macOS may show an error:

> **"Prompt Evaluator" is damaged and can't be opened. You should move it to the Trash.**

This happens because the app is not signed with an Apple Developer certificate. **The app is safe to use** - this is a security feature of macOS for unsigned applications.

---

## 🛠️ How to Install (3 Methods)

### Method 1: Right-Click to Open (Recommended)

1. Download and open the DMG file
2. **Don't drag to Applications yet**
3. **Right-click** (or Control+click) on "Prompt Evaluator"
4. Select **"Open"** from the context menu
5. Click **"Open"** in the security dialog
6. The app will launch successfully
7. Now drag it to your Applications folder
8. You won't see this warning again

**Video guide:** [How to open unsigned apps on Mac](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac)

---

### Method 2: Remove Quarantine Attribute (Terminal)

If you're comfortable with Terminal:

```bash
# After mounting the DMG:
xattr -cr "/Volumes/Prompt Evaluator 1.0.1/Prompt Evaluator.app"

# Or after copying to Applications:
xattr -cr "/Applications/Prompt Evaluator.app"
```

Then double-click to open normally.

---

### Method 3: System Settings

1. Try to open the app (it will fail with an error)
2. Open **System Settings** → **Privacy & Security**
3. Scroll to the **Security** section at the bottom
4. You'll see: _"Prompt Evaluator was blocked from use because it is not from an identified developer"_
5. Click **"Open Anyway"**
6. Confirm by clicking **"Open"** again

---

## 🔒 Why Does This Happen?

macOS **Gatekeeper** is a security feature that checks if apps are:
1. Downloaded from the Mac App Store, OR
2. Signed by a registered Apple Developer

Prompt Evaluator uses **ad-hoc signing** (self-signed) which:
- ✅ Verifies the app hasn't been tampered with after build
- ✅ Ensures the app bundle integrity
- ❌ Is not recognized by Apple as a "known developer"

This approach is common for open-source projects that don't want to pay $99/year for Apple Developer membership.

**The app is safe** - it's ad-hoc signed and you can review the source code at [github.com/carousell/prompt-evaluator](https://github.com/carousell/prompt-evaluator)

---

## ✅ After First Launch

Once you've opened the app using one of the methods above:
- ✅ macOS will remember your choice
- ✅ You can open it normally from Applications
- ✅ No more security warnings

---

## 🐛 Still Having Issues?

If you continue to see errors:

1. **Check macOS version**: Requires macOS 10.12+ (Sierra or later)
2. **Check architecture**: This is an Apple Silicon (M1/M2/M3) build
3. **Remove and reinstall**:
   ```bash
   rm -rf "/Applications/Prompt Evaluator.app"
   # Then reinstall from DMG
   ```

---

## 🔐 For Developers: Building from Source

The app is **automatically ad-hoc signed** during the build process:

```bash
# Clone the repository
git clone https://github.com/carousell/prompt-evaluator.git
cd prompt-evaluator

# Install dependencies
npm install

# Build DMG (automatically includes ad-hoc signing)
npm run dist:mac

# The signed app will be in: release/Prompt Evaluator-VERSION-arm64.dmg
```

The build process runs `scripts/adhoc-sign.js` automatically via the `afterSign` hook in `package.json`.

---

## 📞 Support

- **GitHub Issues**: [Report a problem](https://github.com/carousell/prompt-evaluator/issues)
- **Documentation**: [README.md](README.md)

---

## 🎯 Quick Start (After Installation)

1. Launch Prompt Evaluator from Applications
2. Configure your LLM provider (Google Gemini, Anthropic, OpenAI)
3. Add your prompts and test cases
4. Run evaluations
5. View results and export reports

Enjoy! 🚀
