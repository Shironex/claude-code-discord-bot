#!/bin/bash
set -e

# GitHub Repository Cloning Script
# This script handles the GitHub authentication and repository cloning:
# 1. Authenticate with GitHub
# 2. Clone the repository
# 3. Verify cloning success

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOGS_DIR/execution.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOGS_DIR/execution.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOGS_DIR/execution.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOGS_DIR/execution.log"
}

# Environment validation
validate_environment() {
    log_info "Validating environment variables..."
    
    if [ -z "$GITHUB_TOKEN" ]; then
        log_error "GITHUB_TOKEN environment variable is required"
        exit 1
    fi
    
    if [ -z "$REPO_FULL_NAME" ]; then
        log_error "REPO_FULL_NAME environment variable is required"
        exit 1
    fi
    
    
    log_success "Environment validation passed"
}

# GitHub authentication
authenticate_github() {
    log_info "Authenticating with GitHub..."
    
    # Check if GitHub CLI is available
    log_info "Checking GitHub CLI availability..."
    if ! command -v gh >/dev/null 2>&1; then
        log_error "GitHub CLI (gh) is not available"
        exit 1
    fi
    log_info "GitHub CLI found: $(gh --version | head -1)"
    
    # Set up GitHub CLI authentication using environment variable method
    log_info "Setting up GitHub CLI authentication using GH_TOKEN environment variable..."
    export GH_TOKEN="$GITHUB_TOKEN"
    
    # Verify authentication works
    log_info "Testing GitHub CLI authentication..."
    if gh auth status 2>&1; then
        log_success "GitHub authentication successful using GH_TOKEN"
        
        # Get authenticated user info
        log_info "Getting user information..."
        if GITHUB_USER=$(gh api user --jq '.login' 2>&1); then
            log_info "Authenticated as: $GITHUB_USER"
        else
            log_warning "Could not get user info, trying without jq..."
            if gh api user 2>&1; then
                log_info "User API call successful (without parsing)"
            else
                log_error "User API call failed"
                exit 1
            fi
        fi
    else
        log_error "GitHub authentication failed with GH_TOKEN method"
        
        # Fallback to token file method
        log_info "Trying fallback authentication method with token file..."
        echo "$GITHUB_TOKEN" > /tmp/gh_token
        if gh auth login --with-token < /tmp/gh_token 2>&1; then
            log_info "Fallback authentication successful"
            rm -f /tmp/gh_token
        else
            log_error "All authentication methods failed"
            rm -f /tmp/gh_token
            
            # Test basic connectivity
            log_info "Testing network connectivity to GitHub..."
            if ping -c 1 github.com >/dev/null 2>&1; then
                log_info "Network connectivity to GitHub: OK"
            else
                log_warning "Network connectivity to GitHub: FAILED"
            fi
            
            # Test if token format looks correct
            if [ ${#GITHUB_TOKEN} -lt 10 ]; then
                log_error "GitHub token appears to be too short (${#GITHUB_TOKEN} characters)"
            else
                log_info "GitHub token length: ${#GITHUB_TOKEN} characters (appears reasonable)"
            fi
            
            exit 1
        fi
    fi
}

# Repository cloning
clone_repository() {
    log_info "Cloning repository: $REPO_FULL_NAME"
    
    # Change to repo directory
    cd "$REPO_DIR"
    
    # Clone the repository with correct gh CLI syntax
    log_info "Using GitHub CLI to clone with shallow depth..."
    if gh repo clone "$REPO_FULL_NAME" . -- --depth 1; then
        log_success "Repository cloned successfully"
        
        # Get repository information
        REPO_SIZE=$(du -sh . | cut -f1)
        FILE_COUNT=$(find . -type f | wc -l)
        log_info "Repository size: $REPO_SIZE, Files: $FILE_COUNT"
    else
        log_warning "Shallow clone failed, trying full clone..."
        # Fallback to full clone without depth
        if gh repo clone "$REPO_FULL_NAME" .; then
            log_success "Repository cloned successfully (full clone)"
            
            # Get repository information
            REPO_SIZE=$(du -sh . | cut -f1)
            FILE_COUNT=$(find . -type f | wc -l)
            log_info "Repository size: $REPO_SIZE, Files: $FILE_COUNT"
        else
            log_error "Failed to clone repository: $REPO_FULL_NAME"
            exit 1
        fi
    fi
}

# Verify repository clone success
verify_clone() {
    log_info "Verifying repository clone..."
    
    cd "$REPO_DIR"
    
    # Check if .git directory exists
    if [ ! -d ".git" ]; then
        log_error "Repository clone verification failed: .git directory not found"
        exit 1
    fi
    
    # Check if we can read Git info
    if git rev-parse --git-dir >/dev/null 2>&1; then
        log_success "Repository clone verified successfully"
        
        # Get additional repository information
        CURRENT_BRANCH=$(git branch --show-current)
        LATEST_COMMIT=$(git rev-parse --short HEAD)
        COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s")
        
        log_info "Current branch: $CURRENT_BRANCH"
        log_info "Latest commit: $LATEST_COMMIT"
        log_info "Commit message: $COMMIT_MESSAGE"
    else
        log_error "Repository clone verification failed: unable to read Git information"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Performing cleanup..."
    
    # Clear sensitive environment variables
    unset GITHUB_TOKEN
    
    # Clean up temporary files if needed
    # (Most cleanup will be handled by container removal)
    
    log_info "Cleanup completed"
}

# Error handler
handle_error() {
    local exit_code=$?
    log_error "Script failed with exit code: $exit_code"
    cleanup
    exit $exit_code
}

# Set up error handling
trap handle_error ERR

# Main execution flow
main() {
    log_info "Starting GitHub repository cloning pipeline..."
    log_info "Container: $(hostname)"
    log_info "Timestamp: $(date)"
    
    # Create logs directory
    mkdir -p "$LOGS_DIR"
    
    # Execute pipeline steps
    validate_environment
    authenticate_github
    clone_repository
    verify_clone
    
    cleanup
    
    log_success "GitHub repository cloning pipeline completed successfully!"
}

# Run main function
main "$@"