---
"@claude-code/discord-bot": minor
---

Implement custom Winston logger with comprehensive file logging and enhanced console output

- Replace default NestJS logger with Winston-based custom logger
- Add file logging with daily rotation (error.log, combined.log, service-specific logs)
- Implement beautiful colored console output with service context
- Add performance logging and method-level tracking
- Support graceful shutdown with proper log flushing
- Fix MaxListeners warning by limiting global exception handling to main logger