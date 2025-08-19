#!/bin/bash

# Simplified GitHub Actions Self-Hosted Runner Entrypoint
# Works with the official GitHub Actions runner image

set -e

echo "🚀 Starting GitHub Actions Self-Hosted Runner"
echo "📋 Running as user: $(whoami) (UID: $(id -u))"

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
RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,claude-workflows"}
RUNNER_GROUP=${RUNNER_GROUP:-"default"}

echo "📝 Configuration:"
echo "   Repository: $GITHUB_REPOSITORY"
echo "   Runner Name: $RUNNER_NAME"
echo "   Labels: $RUNNER_LABELS"
echo "   Group: $RUNNER_GROUP"

# Get registration token
echo "🔑 Getting registration token..."
REGISTRATION_TOKEN=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/runners/registration-token" \
    | jq -r .token)

if [ "$REGISTRATION_TOKEN" == "null" ] || [ -z "$REGISTRATION_TOKEN" ]; then
    echo "❌ Error: Failed to get registration token. Check your GITHUB_TOKEN and repository access."
    exit 1
fi

echo "✅ Registration token obtained"

# Configure the runner using the official image's configuration script
echo "⚙️  Configuring GitHub Actions Runner..."
./config.sh \
    --url "https://github.com/$GITHUB_REPOSITORY" \
    --token "$REGISTRATION_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --runnergroup "$RUNNER_GROUP" \
    --unattended \
    --replace

echo "✅ Runner configured successfully"

# Cleanup function
cleanup() {
    echo "🧹 Shutting down runner gracefully..."
    if [ -f ./config.sh ]; then
        echo "🔄 Removing runner from GitHub..."
        ./config.sh remove --token "$REGISTRATION_TOKEN" || true
    fi
}

# Set trap for cleanup on script exit
trap cleanup SIGTERM SIGINT

# Start the runner
echo "🏃 Starting GitHub Actions Runner..."
echo "🎯 Runner is ready to execute Claude workflows!"

# Start the runner listener
./run.sh