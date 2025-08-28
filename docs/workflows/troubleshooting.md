# Troubleshooting

Common issues and solutions for development and deployment.

## Common Issues & Solutions

### Commit Message Rejected by Commitlint

**Problem**: `commit-msg hook failed (add --no-verify to bypass)`

**Solution**:
- Check message format: `type(scope): description`
- Use valid type and scope from lists in [commit guidelines](./commit-guidelines.md)
- Use lowercase for description
- Example: `feat(discord-bot): add new feature`

```bash
# ❌ Rejected
git commit -m "Add new feature"

# ✅ Fixed
git commit -m "feat(discord-bot): add new feature"
```

### Pre-commit Hooks Failing

**Problem**: Code quality checks blocking commits

**Solution**:
```bash
pnpm lint     # Fix linting issues
pnpm format   # Fix formatting  
pnpm build    # Ensure it builds cleanly
```

**Force bypass** (not recommended):
```bash
git commit --no-verify -m "message"
```

### Build or Type Errors

**Problem**: TypeScript compilation or build failures

**Solution**:
```bash
pnpm typecheck  # Check TypeScript errors
pnpm lint       # Check and fix code style
pnpm build      # Verify successful compilation

# If shared package changes
pnpm build --filter=@claude-code/shared
pnpm build
```

### Changeset Confusion

**Problem**: Unsure when to create changesets

**Guidelines**:
- **Create changeset** if changes affect end users
- **Skip changeset** for docs-only, tests-only, or CI changes
- **When in doubt, create one** - releases can be managed later
- Use **patch** for most bug fixes and small improvements
- Use **minor** for new features that don't break existing functionality
- Use **major** only for breaking changes that require user action

### Discord Bot Not Responding

**Problem**: Bot doesn't respond to commands

**Solution**:
1. **Check Discord token**:
   ```bash
   # Verify token in .env
   cat apps/discord-bot/.env | grep DISCORD_TOKEN
   ```

2. **Check bot permissions**:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Attach Files

3. **Check application logs**:
   ```bash
   tail -f apps/discord-bot/logs/combined.log
   ```

4. **Verify guild registration**:
   ```bash
   # Check DEV_GUILD in .env for development
   cat apps/discord-bot/.env | grep DEV_GUILD
   ```

### GitHub API Errors

**Problem**: GitHub API rate limits or authentication errors

**Solution**:
1. **Check GitHub token**:
   ```bash
   # Test token validity
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

2. **Verify token scopes**:
   - `repo` - Repository access
   - `public_repo` - Public repositories
   - `actions:write` - Workflow dispatch

3. **Check rate limits**:
   ```bash
   curl -I -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
   ```

### Dependency Issues

**Problem**: Package installation or version conflicts

**Solution**:
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Update dependencies
pnpm update

# Check for security issues
pnpm audit
```

### Docker Build Issues

**Problem**: Docker build failures or container issues

**Solution**:
```bash
# Clean Docker build
docker system prune -f
docker build --no-cache -t app-name .

# Check container logs
docker logs container-name

# Debug container
docker run -it --entrypoint /bin/bash app-name
```

### Image Service Connection Issues

**Problem**: Image uploads failing or service unavailable

**Solution**:
1. **Check service health**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Verify API keys**:
   ```bash
   cd apps/image-service
   bash scripts/generate-keys.sh
   ```

3. **Check Redis connection**:
   ```bash
   docker exec redis-container redis-cli ping
   ```

### Memory Issues

**Problem**: High memory usage or out of memory errors

**Solution**:
```bash
# Check memory usage
node --max_old_space_size=4096 app.js

# Monitor memory
docker stats

# Check for memory leaks
node --inspect app.js
```

### Session Timeout Issues

**Problem**: User sessions expiring too quickly

**Solution**:
- Sessions expire after 30 minutes by default
- Check session service logs:
  ```bash
  tail -f apps/discord-bot/logs/services/SessionService.log
  ```
- Verify automatic cleanup is working

### File Permission Issues

**Problem**: Permission denied errors

**Solution**:
```bash
# Fix log directory permissions
sudo chown -R $(whoami) logs/
chmod 755 logs/

# Fix upload directory permissions (image service)
sudo chown -R $(whoami) apps/image-service/uploads/
chmod 755 apps/image-service/uploads/
```

## Development Environment Issues

### VS Code Configuration

**Problem**: TypeScript errors in editor

**Solution**:
1. **Use workspace TypeScript**:
   - Cmd/Ctrl + Shift + P
   - "TypeScript: Select TypeScript Version"
   - "Use Workspace Version"

2. **Reload window**:
   - Cmd/Ctrl + Shift + P
   - "Developer: Reload Window"

### Hot Reload Not Working

**Problem**: Changes not reflected during development

**Solution**:
```bash
# Restart development server
pnpm dev

# Clear Node.js cache
rm -rf dist/ && pnpm dev

# Check file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
```

## Production Issues

### High CPU Usage

**Problem**: High CPU utilization in production

**Solution**:
```bash
# Check process usage
top -p $(pgrep node)

# Profile application
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Optimize garbage collection
node --max_old_space_size=2048 --optimize_for_size app.js
```

### Database Connection Issues

**Problem**: Redis connection failures

**Solution**:
```bash
# Test Redis connection
redis-cli -h hostname -p port ping

# Check Redis logs
docker logs redis-container

# Verify Redis configuration
redis-cli CONFIG GET "*"
```

## Getting Additional Help

### Log Analysis
```bash
# Check all recent errors
grep -i "error" apps/discord-bot/logs/error.log | tail -20

# Check service-specific issues
ls apps/discord-bot/logs/services/
tail -f apps/discord-bot/logs/services/GitHubService.log
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev

# Enable Node.js debugging
node --inspect apps/discord-bot/dist/main.js
```

### Performance Monitoring
```bash
# Check system resources
top
htop
iostat

# Check Docker container performance
docker stats
docker exec container-name ps aux
```

## Related Documentation

- [Commit Guidelines](./commit-guidelines.md) - Commit format requirements
- [Release Process](./release-process.md) - Release workflow
- [Development Commands](../development/commands.md) - Available commands
- [Configuration](../configuration/) - Environment setup

[← Back to Workflows](./README.md)