#!/bin/bash
# Post-install script for Linux (DEB package)
# Checks and installs Node.js and promptfoo

set -e

APP_NAME="Promptfoo++"
LOG_FILE="/tmp/promptfoo-install.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to detect the package manager
detect_package_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v pacman &> /dev/null; then
        echo "pacman"
    elif command -v zypper &> /dev/null; then
        echo "zypper"
    else
        echo "unknown"
    fi
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
    if command -v promptfoo &> /dev/null; then
        PROMPTFOO_VERSION=$(promptfoo --version 2>/dev/null || echo "unknown")
        log "${GREEN}promptfoo detected: $PROMPTFOO_VERSION${NC}"
        return 0
    else
        log "${YELLOW}promptfoo not detected${NC}"
        return 1
    fi
}

# Function to check if running with GUI
has_gui() {
    if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
        return 0
    else
        return 1
    fi
}

# Function to show GUI dialog
show_dialog() {
    local title="$1"
    local message="$2"
    local type="${3:-info}" # info, question, warning, error

    if command -v zenity &> /dev/null; then
        case "$type" in
            question)
                zenity --question --title="$title" --text="$message" --width=400
                ;;
            warning)
                zenity --warning --title="$title" --text="$message" --width=400
                ;;
            error)
                zenity --error --title="$title" --text="$message" --width=400
                ;;
            *)
                zenity --info --title="$title" --text="$message" --width=400
                ;;
        esac
    elif command -v kdialog &> /dev/null; then
        case "$type" in
            question)
                kdialog --title "$title" --yesno "$message"
                ;;
            warning)
                kdialog --title "$title" --sorry "$message"
                ;;
            error)
                kdialog --title "$title" --error "$message"
                ;;
            *)
                kdialog --title "$title" --msgbox "$message"
                ;;
        esac
    else
        # Fallback to console
        echo -e "\n=== $title ===\n$message\n"
        if [ "$type" = "question" ]; then
            read -p "Continue? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                return 0
            else
                return 1
            fi
        fi
    fi
}

# Function to install Node.js
install_nodejs() {
    local pkg_mgr=$(detect_package_manager)
    log "Detected package manager: $pkg_mgr"

    local message="Node.js (v16+) is required but not installed.\n\n"
    local install_cmd=""

    case "$pkg_mgr" in
        apt)
            message+="Would you like to install Node.js using apt?\n\nThis will run:\ncurl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\nsudo apt-get install -y nodejs"
            install_cmd="curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
            ;;
        dnf|yum)
            message+="Would you like to install Node.js using $pkg_mgr?\n\nThis will run:\ncurl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -"
            install_cmd="curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -"
            ;;
        pacman)
            message+="Would you like to install Node.js using pacman?\n\nThis will run:\nsudo pacman -S nodejs npm"
            install_cmd="sudo pacman -S --noconfirm nodejs npm"
            ;;
        zypper)
            message+="Would you like to install Node.js using zypper?\n\nThis will run:\nsudo zypper install nodejs npm"
            install_cmd="sudo zypper install -y nodejs npm"
            ;;
        *)
            show_dialog "$APP_NAME Setup" "Node.js (v16+) is required but not installed.\n\nPlease install Node.js from: https://nodejs.org\n\nAfter installation, run:\nnpm install -g promptfoo" "warning"
            return 1
            ;;
    esac

    if has_gui; then
        if show_dialog "$APP_NAME Setup" "$message" "question"; then
            log "Installing Node.js..."
            eval "$install_cmd" 2>&1 | tee -a "$LOG_FILE"
            return $?
        else
            log "User cancelled Node.js installation"
            return 1
        fi
    else
        echo -e "$message"
        read -p "Install Node.js? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "Installing Node.js..."
            eval "$install_cmd" 2>&1 | tee -a "$LOG_FILE"
            return $?
        else
            return 1
        fi
    fi
}

# Function to install promptfoo
install_promptfoo() {
    log "Attempting to install promptfoo..."

    local message="The 'promptfoo' CLI tool is required.\n\nWould you like to install it now?\n\nThis will run:\nnpm install -g promptfoo"

    if has_gui; then
        if show_dialog "$APP_NAME Setup" "$message" "question"; then
            log "Installing promptfoo..."
            sudo npm install -g promptfoo 2>&1 | tee -a "$LOG_FILE"
            return $?
        else
            log "User cancelled promptfoo installation"
            return 1
        fi
    else
        echo -e "$message"
        read -p "Install promptfoo? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "Installing promptfoo..."
            sudo npm install -g promptfoo 2>&1 | tee -a "$LOG_FILE"
            return $?
        else
            return 1
        fi
    fi
}

# Function to show completion message
show_completion() {
    local nodejs_status=$1
    local promptfoo_status=$2
    local message=""

    if [ "$nodejs_status" -eq 0 ] && [ "$promptfoo_status" -eq 0 ]; then
        message="Installation complete!\n\nAll dependencies are installed:\n✓ Node.js\n✓ promptfoo\n\nYou can now launch $APP_NAME."
        show_dialog "$APP_NAME Setup" "$message" "info"
    elif [ "$nodejs_status" -ne 0 ]; then
        message="Setup incomplete.\n\nNode.js is required but not installed.\n\nPlease install Node.js from:\nhttps://nodejs.org\n\nThen install promptfoo:\nnpm install -g promptfoo"
        show_dialog "$APP_NAME Setup" "$message" "warning"
    elif [ "$promptfoo_status" -ne 0 ]; then
        message="Setup incomplete.\n\npromptfoo is required but not installed.\n\nPlease run in terminal:\nnpm install -g promptfoo"
        show_dialog "$APP_NAME Setup" "$message" "warning"
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
