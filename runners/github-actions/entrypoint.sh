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
        ./config.sh remove --unattended --token "$GITHUB_TOKEN"
    fi
    echo "✅ Cleanup completed"
}

# Set trap for cleanup on script exit
trap cleanup EXIT

# Get registration token
echo "🔑 Getting registration token..."
REGISTRATION_TOKEN=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/runners/registration-token" \
    | jq -r .token)

if [ "$REGISTRATION_TOKEN" == "null" ] || [ -z "$REGISTRATION_TOKEN" ]; then
    echo "❌ Error: Failed to get registration token"
    echo "Please check:"
    echo "   - GITHUB_TOKEN has 'repo' and 'admin:repo_hook' permissions"
    echo "   - GITHUB_REPOSITORY format is correct (owner/repo)"
    echo "   - Repository exists and token has access"
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