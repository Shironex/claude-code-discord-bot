# Production Deployment

Comprehensive production deployment guide covering all deployment scenarios and best practices.

## Deployment Platforms

### Coolify Platform Deployment
The Discord bot includes production-ready configuration optimized for Coolify:

```bash
# Use the Coolify-specific Docker Compose configuration
docker-compose -f docker-compose.coolify.yml up -d
```

### Traditional VPS Deployment
```bash
# Clone repository
git clone https://github.com/your-username/claude-code-discord-bot.git
cd claude-code-discord-bot

# Install dependencies
pnpm install

# Build applications
pnpm build

# Start production services
pnpm start --filter=@claude-code/discord-bot
```

### Container Orchestration
- **Docker Swarm**: Single-node and multi-node deployment
- **Kubernetes**: Enterprise-grade orchestration
- **Docker Compose**: Simple multi-service deployment

## Environment Configuration

### Production Environment Variables
```bash
# Discord Bot (.env)
DISCORD_TOKEN="your_production_discord_token"
GITHUB_TOKEN="your_production_github_token"
NODE_ENV="production"
LOG_LEVEL="info"

# Image Service (.env)
PORT=3001
NODE_ENV="production"
API_KEY="generated_production_api_key"
SECRET_KEY="generated_production_secret_key"
REDIS_HOST="your_redis_host"
REDIS_PASSWORD="your_redis_password"
```

### Security Configuration
- **Secrets Management**: Use Docker secrets or external secret management
- **SSL/TLS**: Implement HTTPS for image service API
- **Network Security**: Configure firewalls and network isolation
- **Access Control**: Implement proper user permissions

## High Availability Setup

### Load Balancing
```yaml
# nginx.conf for image service
upstream image_service {
    server image-service-1:3001;
    server image-service-2:3001;
    server image-service-3:3001;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://image_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database High Availability
```yaml
# Redis Cluster Configuration
services:
  redis-master:
    image: redis:alpine
    command: redis-server --appendonly yes
    
  redis-slave:
    image: redis:alpine
    command: redis-server --slaveof redis-master 6379
    depends_on:
      - redis-master
```

## Monitoring and Logging

### Application Monitoring
```yaml
# Prometheus monitoring
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Log Aggregation
```yaml
# ELK Stack for log aggregation
services:
  elasticsearch:
    image: elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
      
  logstash:
    image: logstash:7.14.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
      
  kibana:
    image: kibana:7.14.0
    ports:
      - "5601:5601"
```

## Backup and Recovery

### Data Backup Strategy
```bash
#!/bin/bash
# backup.sh

# Backup Redis data
docker exec redis-container redis-cli BGSAVE
docker cp redis-container:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb

# Backup application logs
tar -czf ./backups/logs-$(date +%Y%m%d).tar.gz ./logs/

# Upload to cloud storage
aws s3 cp ./backups/ s3://your-backup-bucket/ --recursive
```

### Disaster Recovery
1. **Data Recovery**: Restore from latest backup
2. **Service Recovery**: Restart services with health checks
3. **Configuration Recovery**: Version-controlled configurations
4. **Monitoring Recovery**: Verify all monitoring systems

## Performance Optimization

### Application Performance
- **Memory Management**: Optimize heap size and garbage collection
- **Connection Pooling**: Database and API connection pools
- **Caching Strategy**: Redis caching for frequently accessed data
- **Resource Limits**: Set appropriate container resource limits

### Infrastructure Performance
- **CDN Integration**: Content delivery for static assets
- **Database Optimization**: Query optimization and indexing
- **Network Optimization**: Minimize latency and maximize throughput
- **Auto-scaling**: Horizontal scaling based on metrics

## Security Hardening

### Container Security
```dockerfile
# Security best practices in Dockerfile
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

### Network Security
```yaml
# Docker network isolation
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

services:
  discord-bot:
    networks:
      - frontend
      - backend
      
  image-service:
    networks:
      - backend
```

### SSL/TLS Configuration
```nginx
# SSL configuration
ssl_certificate /etc/ssl/certs/yourdomain.crt;
ssl_certificate_key /etc/ssl/private/yourdomain.key;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

## Deployment Automation

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [master]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and Deploy
        run: |
          docker build -t discord-bot .
          docker tag discord-bot:latest registry.com/discord-bot:latest
          docker push registry.com/discord-bot:latest
          
      - name: Deploy to Production
        run: |
          ssh production-server "docker pull registry.com/discord-bot:latest"
          ssh production-server "docker-compose up -d"
```

### Health Checks
```bash
#!/bin/bash
# health-check.sh

# Check Discord bot health
if ! docker exec discord-bot curl -f http://localhost:3000/health; then
    echo "Discord bot health check failed"
    # Send alert
fi

# Check image service health
if ! curl -f http://localhost:3001/health; then
    echo "Image service health check failed"
    # Send alert
fi
```

## Troubleshooting Production Issues

### Common Issues

#### High Memory Usage
```bash
# Monitor memory usage
docker stats

# Check for memory leaks
docker exec discord-bot node --expose-gc -e "gc(); console.log(process.memoryUsage())"
```

#### Connection Issues
```bash
# Check network connectivity
docker exec discord-bot ping discord.com
docker exec discord-bot ping api.github.com

# Check DNS resolution
docker exec discord-bot nslookup discord.com
```

#### Performance Issues
```bash
# Check system resources
top
iostat
netstat -i

# Check Docker container performance
docker exec discord-bot ps aux
docker logs --tail 100 discord-bot
```

### Emergency Procedures
1. **Service Restart**: `docker-compose restart`
2. **Rollback Deployment**: Deploy previous stable version
3. **Scale Down**: Reduce resource usage temporarily
4. **Emergency Maintenance**: Enable maintenance mode

## Maintenance Windows

### Scheduled Maintenance
```bash
#!/bin/bash
# maintenance.sh

# Enable maintenance mode
echo "Starting maintenance at $(date)"

# Stop services gracefully
docker-compose down --timeout 30

# Perform updates
git pull origin master
pnpm install
pnpm build

# Start services
docker-compose up -d

# Verify health
./health-check.sh

echo "Maintenance completed at $(date)"
```

### Zero-Downtime Deployment
```bash
# Blue-green deployment
docker-compose -f docker-compose.blue.yml up -d
# Test blue environment
# Switch traffic to blue
# Stop green environment
```

## Related Documentation

- [Docker Configuration](./docker.md) - Container setup
- [GitHub Runners](./github-runners.md) - Self-hosted runners
- [Configuration](../configuration/) - Environment setup
- [Troubleshooting](../workflows/troubleshooting.md) - Issue resolution

[← Back to Deployment](./README.md)