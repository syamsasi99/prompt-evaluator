#!/bin/bash
# Post-install script for macOS
# Checks and installs Node.js and promptfoo

set -e

APP_NAME="Prompt Evaluator"
LOG_FILE="/tmp/promptfoo-install.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log "${GREEN}Node.js detected: $NODE_VERSION${NC}"

        # Extract major version
        MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')

        if [ "$MAJOR_VERSION" -ge 16 ]; then
            log "${GREEN}Node.js version is compatible (v16+)${NC}"
            return 0
        else
            log "${YELLOW}Node.js version is too old (need v16+)${NC}"
            return 1
        fi
    else
        log "${RED}Node.js not detected${NC}"
        return 1
    fi
}

# Function to check if promptfoo is installed
check_promptfoo() {
    # Check in multiple common locations
    if command -v promptfoo &> /dev/null; then
        PROMPTFOO_VERSION=$(promptfoo --version 2>/dev/null || echo "unknown")
        log "${GREEN}promptfoo detected: $PROMPTFOO_VERSION${NC}"
        return 0
    else
        log "${YELLOW}promptfoo not detected${NC}"
        return 1
    fi
}

# Function to install Node.js
install_nodejs() {
    log "Node.js is required but not installed."

    # Check if Homebrew is installed
    if command -v brew &> /dev/null; then
        log "Homebrew detected. Attempting to install Node.js..."

        osascript <<EOF
tell app "System Events"
    display dialog "Node.js (v16+) is required but not installed.\n\nWould you like to install it using Homebrew?\n\nThis will run: brew install node" buttons {"Cancel", "Install"} default button "Install" with icon caution
    if button returned of result is "Install" then
        do shell script "brew install node" with administrator privileges
    end if
end tell
EOF

        if [ $? -eq 0 ]; then
            log "${GREEN}Node.js installation initiated${NC}"
            return 0
        else
            log "${YELLOW}User cancelled Node.js installation${NC}"
            return 1
        fi
    else
        # Homebrew not available, guide user to download
        osascript <<EOF
tell app "System Events"
    display dialog "Node.js (v16+) is required but not installed.\n\nPlease download and install it from:\nhttps://nodejs.org\n\nAfter installing Node.js, you'll need to install promptfoo using:\nnpm install -g promptfoo" buttons {"Open Download Page", "Cancel"} default button "Open Download Page" with icon caution
    if button returned of result is "Open Download Page" then
        open location "https://nodejs.org/en/download/"
    end if
end tell
EOF
        return 1
    fi
}

# Function to install promptfoo
install_promptfoo() {
    log "Attempting to install promptfoo..."

    osascript <<EOF
tell app "System Events"
    display dialog "The 'promptfoo' CLI tool is required.\n\nWould you like to install it now?\n\nThis will run: npm install -g promptfoo" buttons {"Cancel", "Install"} default button "Install" with icon note
    if button returned of result is "Install" then
        do shell script "npm install -g promptfoo" with administrator privileges
    end if
end tell
EOF

    if [ $? -eq 0 ]; then
        log "${GREEN}promptfoo installation completed${NC}"
        return 0
    else
        log "${YELLOW}promptfoo installation cancelled or failed${NC}"
        return 1
    fi
}

# Function to show completion message
show_completion() {
    local nodejs_status=$1
    local promptfoo_status=$2

    if [ "$nodejs_status" -eq 0 ] && [ "$promptfoo_status" -eq 0 ]; then
        osascript <<EOF
tell app "System Events"
    display dialog "Installation complete!\n\nAll dependencies are installed:\n✓ Node.js\n✓ promptfoo\n\nYou can now launch $APP_NAME." buttons {"OK"} default button "OK" with icon note with title "$APP_NAME Setup"
end tell
EOF
    elif [ "$nodejs_status" -ne 0 ]; then
        osascript <<EOF
tell app "System Events"
    display dialog "Setup incomplete.\n\nNode.js is required but not installed.\n\nPlease install Node.js from:\nhttps://nodejs.org\n\nThen install promptfoo:\nnpm install -g promptfoo" buttons {"OK"} default button "OK" with icon caution with title "$APP_NAME Setup"
end tell
EOF
    elif [ "$promptfoo_status" -ne 0 ]; then
        osascript <<EOF
tell app "System Events"
    display dialog "Setup incomplete.\n\npromptfoo is required but not installed.\n\nPlease run in Terminal:\nnpm install -g promptfoo" buttons {"OK"} default button "OK" with icon caution with title "$APP_NAME Setup"
end tell
EOF
    fi
}

# Main installation flow
main() {
    log "========================================="
    log "$APP_NAME - Dependency Setup"
    log "========================================="

    # Check Node.js
    nodejs_ok=0
    if ! check_nodejs; then
        install_nodejs
        nodejs_ok=$?
        # Re-check after installation attempt
        check_nodejs
        nodejs_ok=$?
    fi

    # Check promptfoo (only if Node.js is available)
    promptfoo_ok=0
    if [ $nodejs_ok -eq 0 ]; then
        if ! check_promptfoo; then
            install_promptfoo
            promptfoo_ok=$?
            # Re-check after installation attempt
            check_promptfoo
            promptfoo_ok=$?
        fi
    else
        promptfoo_ok=1
    fi

    # Show completion message
    show_completion $nodejs_ok $promptfoo_ok

    log "Setup process completed"
    log "Log file: $LOG_FILE"
}

# Run main function
main
