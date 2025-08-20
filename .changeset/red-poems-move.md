---
"@claude-code/discord-bot": patch
---

Fix workflow monitor incorrectly identifying running instances as completed

Resolves issue #9 where the workflow monitor service incorrectly identified newly spawned Claude Code instances as "already completed" when there were existing open pull requests on the repository.

The fix implements a unique tracking ID system that:
- Generates unique IDs for each workflow dispatch
- Uses intelligent polling to find the correct workflow run
- Filters runs by creation timestamp and status
- Supports multiple concurrent workflows without confusion
- Provides graceful fallback for older workflow configurations

This ensures accurate workflow status tracking even when multiple workflows are running or when repositories have existing open PRs.