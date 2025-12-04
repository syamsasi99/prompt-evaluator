#!/bin/bash
# Ad-hoc code signing for local DMG builds
# This creates a self-signed signature that reduces Gatekeeper warnings

set -e

APP_PATH="${1:-release/mac-arm64/prompt-evaluator.app}"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: App not found at $APP_PATH"
    exit 1
fi

echo "🔐 Ad-hoc signing: $APP_PATH"

# Sign with ad-hoc signature
codesign --force --deep --sign - "$APP_PATH"

echo "✅ App signed successfully"
echo ""
echo "ℹ️  Note: This is an ad-hoc signature (not from Apple Developer)"
echo "   Users will still need to right-click → Open on first launch"
