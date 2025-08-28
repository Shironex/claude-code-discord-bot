# GitHub Permissions

GitHub token requirements and scopes for repository operations.

## Required Token Scopes

The GitHub personal access token requires these specific scopes:

### Repository Access
- **`repo`** - Full repository access (required for private repositories)
- **`public_repo`** - Public repository access (alternative to `repo` for public-only)

### Workflow Management
- **`actions:write`** - Required for dispatching GitHub Actions workflows

## Token Creation

### Step-by-Step Setup
1. **Navigate to GitHub Settings**:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"

2. **Configure Token**:
   - **Note**: "Claude Code Discord Bot"
   - **Expiration**: Choose appropriate expiration (90 days recommended)
   - **Select Scopes**: Check the required scopes above

3. **Copy Token**:
   - Copy the generated token immediately
   - Store securely in your environment variables

### Fine-Grained Tokens (Beta)
For fine-grained personal access tokens:

1. **Repository Access**: Select specific repositories or all repositories
2. **Permissions**:
   - **Repository permissions**:
     - Contents: Read
     - Metadata: Read
     - Actions: Write
   - **Account permissions**:
     - None required

## Token Validation

### Test Token Access
```bash
# Test basic token validity
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Test repository access
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/owner/repo

# Test workflow dispatch capability
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/owner/repo/actions/workflows/claude.yml/dispatches \
  -d '{"ref":"main","inputs":{"prompt":"test"}}'
```

### Common Permission Errors

#### "Resource not accessible by integration"
**Problem**: Token lacks required scopes
**Solution**: Regenerate token with proper scopes (repo + actions:write)

#### "Not Found" for existing repository
**Problem**: Token doesn't have access to repository
**Solution**: 
- For private repos: Ensure `repo` scope is enabled
- For organization repos: Check organization access policy

#### "Workflow file not found"
**Problem**: Repository lacks `.github/workflows/claude.yml`
**Solution**: Add Claude Code workflow template to repository

## Repository Requirements

### Workflow File
Repositories must contain `.github/workflows/claude.yml`:

```yaml
name: Claude Code Analysis
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Analysis prompt'
        required: true
        type: string
      files:
        description: 'Selected files JSON'
        required: false
        type: string
      images:
        description: 'Image URLs JSON'
        required: false
        type: string

jobs:
  analyze:
    runs-on: ubuntu-latest  # or self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Run Analysis
        run: |
          echo "Prompt: ${{ github.event.inputs.prompt }}"
          # Your analysis logic here
```

### Repository Access
The bot user must have access to repositories:
- **Public repositories**: Accessible with `public_repo` scope
- **Private repositories**: Requires `repo` scope and repository access
- **Organization repositories**: May require organization approval

## Security Best Practices

### Token Security
- **Use environment variables**: Never hardcode tokens
- **Limit scope**: Use minimum required permissions
- **Set expiration**: Use reasonable expiration periods
- **Monitor usage**: Review token usage in GitHub settings
- **Rotate regularly**: Update tokens periodically

### Organization Policies
- **SSO Requirements**: Configure SAML SSO if required
- **IP Restrictions**: Whitelist deployment server IPs
- **Audit Logs**: Monitor token usage in organization audit logs

### Storage Security
```bash
# Secure environment variable storage
echo "GITHUB_TOKEN=your_token_here" >> .env
chmod 600 .env

# Production deployment
# Use secrets management (Docker secrets, Kubernetes secrets, etc.)
```

## Troubleshooting

### Rate Limiting
GitHub API has rate limits:
- **Authenticated requests**: 5000 per hour
- **Workflow dispatches**: 1000 per hour

Check current limits:
```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

### Token Expiration
Monitor token expiration:
```bash
# Check token expiration (if available in response)
curl -I -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Organization Access
For organization repositories:
1. **Personal Access**: User must have repository access
2. **Organization Policy**: May require admin approval
3. **SAML/SSO**: Configure if organization requires it

## Integration Testing

### Test Repository Access
```bash
#!/bin/bash
# test-github-access.sh

GITHUB_TOKEN="your_token_here"
REPO_OWNER="owner"
REPO_NAME="repo"

# Test user access
echo "Testing user access..."
curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Test repository access
echo "Testing repository access..."
curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/$REPO_OWNER/$REPO_NAME

# Test workflow file existence
echo "Testing workflow file..."
curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/contents/.github/workflows/claude.yml

# Test workflow dispatch
echo "Testing workflow dispatch..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/claude.yml/dispatches \
  -d '{"ref":"main","inputs":{"prompt":"test"}}'
```

## Related Documentation

- [Environment Variables](./environment-vars.md) - Token configuration
- [GitHub Service](../services/github-service.md) - Service implementation
- [Workflow Automation](../features/workflow-automation.md) - Workflow features

[← Back to Configuration](./README.md)