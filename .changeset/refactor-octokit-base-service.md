---
"@claude-code/discord-bot": minor
---

Refactor Octokit initialization to BaseService

- **BREAKING**: Services now require LoggerFactory injection alongside ConfigService
- Add centralized Octokit client initialization to BaseService
- Remove duplicate GitHub token management across GitHubService, WorkflowService, and FileExplorerService
- Add validateGitHubAccess() helper method for consistent GitHub access validation
- Add configurable requireGitHub parameter to enforce GitHub token requirements
- Eliminate 60+ lines of duplicate initialization code
- Maintain backward compatibility for services not requiring GitHub access
- Enhanced error handling with consistent GitHub token validation