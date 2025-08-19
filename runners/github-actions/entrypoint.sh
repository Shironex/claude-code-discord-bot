#!/bin/bash
set -e

# GitHub Actions Self-Hosted Runner Entrypoint Script
# Handles runner registration, execution, and cleanup

echo "🚀 Starting GitHub Actions Self-Hosted Runner"

# Check required environment variables
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN environment variable is required"
    exit 1
fi

if [ -z "$GITHUB_REPOSITORY" ]; then
    echo "❌ Error: GITHUB_REPOSITORY environment variable is required (format: owner/repo)"
    exit 1
fi

# Set default values
RUNNER_NAME=${RUNNER_NAME:-"claude-runner-$(hostname)"}
RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,claude-workflows,docker"}
RUNNER_GROUP=${RUNNER_GROUP:-"default"}
RUNNER_WORK_DIR=${RUNNER_WORK_DIR:-"/home/runner/_work"}

echo "📝 Configuration:"
echo "   Repository: $GITHUB_REPOSITORY"
echo "   Runner Name: $RUNNER_NAME"
echo "   Labels: $RUNNER_LABELS"
echo "   Group: $RUNNER_GROUP"
echo "   Work Directory: $RUNNER_WORK_DIR"

# Create work directory
mkdir -p "$RUNNER_WORK_DIR"

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up runner registration..."
    if [ -f ".runner" ]; then
        ./config.sh remove --unattended --token "$GITHUB_TOKEN" 2>/dev/null || echo "⚠️  Runner removal failed"
    fi
    echo "✅ Cleanup completed"
}

# Set trap for cleanup on script exit - only on specific signals, not EXIT
trap cleanup SIGTERM SIGINT

# Get registration token
echo "🔑 Getting registration token..."
echo "🔍 Debug: Making API call to GitHub..."
echo "🔍 Debug: Repository: $GITHUB_REPOSITORY"
echo "🔍 Debug: Token starts with: ${GITHUB_TOKEN:0:4}..."

# Make API call and capture full response
API_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/runners/registration-token")

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$API_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$API_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "🔍 Debug: HTTP Status: $HTTP_STATUS"
echo "🔍 Debug: Response Body: $RESPONSE_BODY"

# Extract token from response
REGISTRATION_TOKEN=$(echo "$RESPONSE_BODY" | jq -r .token 2>/dev/null)

if [ "$HTTP_STATUS" != "201" ]; then
    echo "❌ Error: GitHub API returned HTTP $HTTP_STATUS"
    echo "📋 Full API Response: $RESPONSE_BODY"
    
    # Parse common error messages
    ERROR_MESSAGE=$(echo "$RESPONSE_BODY" | jq -r .message 2>/dev/null)
    if [ "$ERROR_MESSAGE" != "null" ] && [ -n "$ERROR_MESSAGE" ]; then
        echo "💬 GitHub Error Message: $ERROR_MESSAGE"
    fi
    
    # Provide specific troubleshooting based on status code
    case $HTTP_STATUS in
        401)
            echo "🔑 HTTP 401: Authentication failed"
            echo "   - Check if GITHUB_TOKEN is valid and not expired"
            echo "   - Verify token format (should start with 'ghp_' or 'github_pat_')"
            ;;
        403)
            echo "🚫 HTTP 403: Forbidden - Permission denied"
            echo "   - Check if token has 'repo' and 'workflow' scopes"
            echo "   - Verify token has admin access to repository"
            echo "   - Check if GitHub Actions are enabled in repository settings"
            ;;
        404)
            echo "📂 HTTP 404: Repository not found"
            echo "   - Verify GITHUB_REPOSITORY format: owner/repo"
            echo "   - Check if repository exists and is accessible"
            echo "   - Verify token has access to this repository"
            ;;
        422)
            echo "📝 HTTP 422: Validation failed"
            echo "   - Repository might not have Actions enabled"
            echo "   - Check repository settings under Actions → General"
            ;;
        *)
            echo "❓ HTTP $HTTP_STATUS: Unexpected error"
            echo "   - Check GitHub API status: https://www.githubstatus.com/"
            ;;
    esac
    
    exit 1
fi

if [ "$REGISTRATION_TOKEN" == "null" ] || [ -z "$REGISTRATION_TOKEN" ]; then
    echo "❌ Error: Failed to extract registration token from response"
    echo "📋 Response was: $RESPONSE_BODY"
    exit 1
fi

echo "✅ Registration token obtained"

# Configure the runner
echo "⚙️  Configuring GitHub Actions Runner..."
./config.sh \
    --url "https://github.com/$GITHUB_REPOSITORY" \
    --token "$REGISTRATION_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --runnergroup "$RUNNER_GROUP" \
    --work "$RUNNER_WORK_DIR" \
    --unattended \
    --replace

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to configure runner"
    exit 1
fi

echo "✅ Runner configured successfully"

# Function to handle signals gracefully
handle_signal() {
    echo "🛑 Received shutdown signal, stopping runner gracefully..."
    if pgrep -f "Runner.Listener" > /dev/null; then
        pkill -f "Runner.Listener"
        wait
    fi
    cleanup
    exit 0
}

# Set up signal handlers
trap handle_signal SIGTERM SIGINT SIGHUP

# Start the runner
echo "🏃 Starting GitHub Actions Runner..."
echo "Runner is ready to execute Claude workflows!"

# Run the listener with error handling
while true; do
    ./run.sh || {
        echo "⚠️  Runner exited with error code $?"
        echo "🔄 Attempting to restart in 10 seconds..."
        sleep 10
        continue
    }
    break
done

echo "🏁 Runner stopped"