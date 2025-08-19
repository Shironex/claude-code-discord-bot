#!/bin/bash

# Health check script for Claude Code Runner container
# This script verifies that the container is healthy and ready for execution

# Check if required directories exist
if [ ! -d "/workspace" ]; then
    echo "UNHEALTHY: /workspace directory missing"
    exit 1
fi

if [ ! -d "/workspace/repo" ]; then
    echo "UNHEALTHY: /workspace/repo directory missing"
    exit 1
fi

if [ ! -d "/workspace/context" ]; then
    echo "UNHEALTHY: /workspace/context directory missing"
    exit 1
fi

if [ ! -d "/workspace/output" ]; then
    echo "UNHEALTHY: /workspace/output directory missing"
    exit 1
fi

if [ ! -d "/workspace/logs" ]; then
    echo "UNHEALTHY: /workspace/logs directory missing"
    exit 1
fi

# Check if required commands are available
if ! command -v git >/dev/null 2>&1; then
    echo "UNHEALTHY: git command not available"
    exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
    echo "UNHEALTHY: gh command not available"
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo "UNHEALTHY: node command not available"
    exit 1
fi

# Check if workspace is writable
if [ ! -w "/workspace" ]; then
    echo "UNHEALTHY: /workspace is not writable"
    exit 1
fi

# All checks passed
echo "HEALTHY: Container is ready for Claude Code execution"
exit 0