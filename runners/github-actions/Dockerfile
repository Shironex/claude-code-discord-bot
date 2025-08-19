# GitHub Actions Self-Hosted Runner for Claude Code Workflows
# Built on official GitHub Actions runner image for reliability

FROM ghcr.io/actions/actions-runner:latest

# Switch to root to install additional dependencies
USER root

# Install additional tools for Claude Code workflows
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@latest

# Install GitHub CLI (if not already present)
RUN if ! command -v gh &> /dev/null; then \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*; \
    fi

# Switch back to runner user
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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep -f "Runner.Listener" > /dev/null || exit 1

# Use entrypoint script
ENTRYPOINT ["bash", "/home/runner/entrypoint.sh"]