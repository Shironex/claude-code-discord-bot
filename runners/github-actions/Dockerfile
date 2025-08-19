# GitHub Actions Self-Hosted Runner for Claude Code Workflows
# Supports running Claude workflows from @apps/discord-bot/templates/

FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_ALLOW_RUNASROOT=1
ENV GITHUB_ACTIONS_RUNNER_VERSION=2.321.0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3 \
    python3-pip \
    python3-venv \
    jq \
    tar \
    unzip \
    sudo \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install pnpm globally
RUN npm install -g pnpm@latest

# Install Docker CLI (for actions that might need it)
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Create runner user first
RUN useradd -m -d /home/runner -s /bin/bash runner \
    && usermod -aG sudo runner \
    && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create runner directory
WORKDIR /home/runner

# Download and install GitHub Actions Runner as runner user
USER runner
RUN curl -o actions-runner-linux-x64-${GITHUB_ACTIONS_RUNNER_VERSION}.tar.gz \
    -L https://github.com/actions/runner/releases/download/v${GITHUB_ACTIONS_RUNNER_VERSION}/actions-runner-linux-x64-${GITHUB_ACTIONS_RUNNER_VERSION}.tar.gz \
    && tar xzf actions-runner-linux-x64-${GITHUB_ACTIONS_RUNNER_VERSION}.tar.gz \
    && rm actions-runner-linux-x64-${GITHUB_ACTIONS_RUNNER_VERSION}.tar.gz

# Install runner dependencies (needs sudo)
USER root
RUN cd /home/runner && ./bin/installdependencies.sh

# Ensure correct ownership
RUN chown -R runner:runner /home/runner

# Switch to runner user
USER runner

# Set working directory
WORKDIR /home/runner

# Copy entrypoint script
COPY --chown=runner:runner entrypoint.sh /home/runner/entrypoint.sh
RUN chmod +x /home/runner/entrypoint.sh

# Environment variables (to be set at runtime)
ENV GITHUB_TOKEN=""
ENV GITHUB_REPOSITORY=""
ENV RUNNER_NAME=""
ENV RUNNER_LABELS="self-hosted,claude-workflows"
ENV RUNNER_GROUP="default"

# Expose any ports if needed (optional)
# EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep -f "Runner.Listener" > /dev/null || exit 1

# Use entrypoint script
ENTRYPOINT ["/home/runner/entrypoint.sh"]