# Health Check System

## Overview

The health check system provides comprehensive real-time monitoring of all bot components through the `/doctor` command. This feature helps administrators and users quickly diagnose issues and understand the operational status of the bot.

## Features

- **Real-time health monitoring** across all bot components
- **Color-coded status indicators** for quick visual assessment
- **Intelligent caching** (5-minute TTL) to reduce system load
- **Manual refresh** capability via button interaction
- **Component isolation** - failures in one component don't crash the entire check
- **Response time guarantees** - all checks complete within 5 seconds

## Usage

### Basic Command

```
/doctor
```

Execute this slash command in any channel where the bot is present. The response is ephemeral (only visible to you).

### Status Indicators

The health check uses color-coded emoji indicators:

- 🟢 **Operational** - Component is functioning normally
- 🟡 **Degraded** - Component is working but experiencing issues
- 🔴 **Critical** - Component has failed or is experiencing severe issues
- ⚪ **Unavailable** - Component is not configured or disabled

### Refresh Button

Click the **🔄 Refresh** button to force a fresh health check, bypassing the 5-minute cache. Use this when:
- Investigating an issue that may have been resolved
- Verifying fixes after configuration changes
- Getting up-to-date metrics after heavy usage

## Monitored Components

### 1. Bot Runtime

**What it checks:**
- Process uptime (how long the bot has been running)
- Memory usage (heap used vs total)
- Memory pressure percentage

**Status thresholds:**
- 🟢 Operational: Memory < 75%
- 🟡 Degraded: Memory 75-90%
- 🔴 Critical: Memory > 90%

**Example output:**
```
🟢 Bot Runtime
Status: Bot runtime is healthy
Response: 12ms
Memory: 145MB / 200MB (72%)
Uptime: 5h 32m
```

### 2. GitHub Integration

**What it checks:**
- GitHub token validity
- API rate limit status
- API connectivity and response time

**Status thresholds:**
- 🟢 Operational: Rate limit > 100 calls remaining
- 🟡 Degraded: Rate limit < 100 calls remaining
- 🔴 Critical: Rate limit exhausted or API errors
- ⚪ Unavailable: No token configured

**Example output:**
```
🟢 GitHub Integration
Status: GitHub integration is healthy
Response: 234ms
Rate Limit: 4891/5000
```

### 3. Session Health

**What it checks:**
- Number of active user sessions
- Session memory utilization

**Status thresholds:**
- 🟢 Operational: < 50 active sessions
- 🟡 Degraded: 50-100 active sessions
- 🔴 Critical: > 100 active sessions

**Example output:**
```
🟢 Session Health
Status: Session health is good
Response: 5ms
Sessions: 12
```

### 4. Image Service

**What it checks:**
- Image service connectivity
- Health endpoint response
- Service version and uptime

**Status thresholds:**
- 🟢 Operational: Connection successful, response < 2s
- 🟡 Degraded: Connection successful, response > 2s
- 🔴 Critical: Connection failed or timeout
- ⚪ Unavailable: Service not configured

**Example output:**
```
🟢 Image Service
Status: Image service is healthy
Response: 156ms
Version: 1.0.0
Uptime: 2h 15m
```

## Implementation Details

### Architecture

```
/doctor command
    ↓
DoctorCommand (apps/discord-bot/src/commands/health/doctor.command.ts)
    ↓
HealthCheckService (apps/discord-bot/src/services/health-check.service.ts)
    ↓
[Parallel Execution]
    ├─ checkBotRuntime()
    ├─ checkGitHubIntegration()
    ├─ checkSessionHealth()
    └─ checkImageService()
    ↓
EmbedService.createHealthCheckEmbed()
    ↓
Discord Embed with Refresh Button
```

### Caching Strategy

**Cache Duration:** 5 minutes (300,000ms)

**Cache Invalidation:**
- Automatic expiration after 5 minutes
- Manual refresh via button click
- Service restart

**Why caching?**
- Reduces load on external APIs (GitHub)
- Prevents rate limit exhaustion
- Improves response time for frequent checks

### Timeout Protection

Each component check has a **3-second timeout** (configurable). If a check exceeds this:
1. The check is aborted
2. Component status is marked as **critical**
3. Error is logged for debugging
4. Other checks continue unaffected

### Configuration

The health check system supports optional environment variables for customization:

**`HEALTH_CHECK_CACHE_TTL_MS`** (optional)
- Default: `300000` (5 minutes)
- Description: How long to cache health check results (in milliseconds)
- Example: `HEALTH_CHECK_CACHE_TTL_MS=600000` (10 minutes)
- Use case: Increase for less frequent health checks, decrease for more real-time monitoring

**`HEALTH_CHECK_TIMEOUT_MS`** (optional)
- Default: `3000` (3 seconds)
- Description: Maximum time allowed for each component check (in milliseconds)
- Example: `HEALTH_CHECK_TIMEOUT_MS=5000` (5 seconds)
- Use case: Increase for slower networks or environments, decrease for faster failure detection

**Note:** All health check thresholds (memory %, session counts, rate limits) are defined as constants in the service and can be customized by modifying the `HEALTH_CHECK_THRESHOLDS` object in the source code.

### Performance

- **Parallel execution**: All component checks run simultaneously
- **Response time target**: < 5 seconds total
- **Actual performance**: Typically 200-500ms (cached) or 1-2s (fresh)

## Troubleshooting

### "GitHub integration not configured"

**Cause:** `GITHUB_TOKEN` environment variable is not set.

**Solution:**
1. Add your GitHub personal access token to `.env`
2. Restart the bot
3. Run `/doctor` again

### "Image service not configured"

**Cause:** `DISCORD_BOT_API_KEY` or `IMAGE_SERVICE_BASE_URL` not set.

**Solution:**
1. Configure image service environment variables (see [Environment Variables](../configuration/environment-vars.md))
2. Ensure image service is running
3. Restart the bot

### "Rate limit exceeded"

**Cause:** GitHub API rate limit has been exhausted (5000 requests/hour for authenticated users).

**Solution:**
1. Wait for rate limit reset (shown in health check details)
2. Reduce frequency of GitHub operations
3. Consider using GitHub Apps for higher rate limits

### High memory usage (degraded/critical)

**Cause:** Possible memory leak or high session count.

**Solution:**
1. Check active sessions count
2. Restart the bot if memory > 90%
3. Monitor for memory leaks in logs
4. Consider implementing session cleanup

### Slow response times

**Cause:** Network latency, slow external APIs, or system resource constraints.

**Investigation:**
1. Check individual component response times
2. Review GitHub API status
3. Verify network connectivity
4. Check system resources (CPU, memory)

## Related Files

### Source Code
- `apps/discord-bot/src/commands/health/doctor.command.ts` - Main command
- `apps/discord-bot/src/services/health-check.service.ts` - Health check logic
- `apps/discord-bot/src/interactions/buttons/refresh-health.button.ts` - Refresh handler
- `apps/discord-bot/src/interfaces/models/health.interface.ts` - Type definitions

### Documentation
- [Discord Commands](./discord-commands.md) - All available commands
- [Services](../services/README.md) - Service architecture
- [Environment Variables](../configuration/environment-vars.md) - Configuration guide

## Future Enhancements

### Planned Features

1. **Self-Hosted Runner Monitoring** (GitHub Issue #14)
   - Check runner registration status
   - Monitor runner activity (idle/busy/offline)
   - Track runner job queue
   - Alert on runner failures

2. **Historical Health Metrics**
   - Store health check history
   - Generate uptime statistics
   - Identify patterns and trends

3. **Alerting System**
   - Automatic notifications on critical status
   - Discord channel alerts for admins
   - Integration with monitoring services

4. **Extended Diagnostics**
   - Network connectivity tests
   - Dependency health checks
   - Database connection monitoring (if added)

## FAQ

**Q: How often should I run health checks?**
A: The caching system makes it efficient to check frequently. However, every 5-10 minutes is reasonable for monitoring.

**Q: Does the health check affect bot performance?**
A: No. Checks run in parallel with timeouts, and results are cached. Impact is minimal.

**Q: Can other users see my health check results?**
A: No. Health check responses are ephemeral (only visible to you).

**Q: What happens if all components are critical?**
A: The bot continues running. Health checks are diagnostic only and don't affect bot operations.

**Q: How do I automate health monitoring?**
A: Currently manual only. Future versions may include webhooks or monitoring integrations.

## Version History

- **v1.1.0** (2025-01-31) - Initial implementation
  - Added `/doctor` command
  - Implemented 4 component checks
  - Added caching and refresh functionality
  - Created comprehensive documentation
