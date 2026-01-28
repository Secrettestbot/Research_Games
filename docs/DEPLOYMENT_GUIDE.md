# Deployment Guide - Research Games Website

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- Minimum 2GB RAM available
- Port 80, 443, and 8080 available

## Quick Start (Local Development)

### 1. Clone and Setup

```bash
cd ~/research-games-website
cp .env.example .env
# Edit .env and change default passwords!
```

### 2. Start All Services

```bash
docker-compose up -d
```

This will start:
- **nginx** (port 80) - Web server + frontend
- **api** (port 3001) - Backend API
- **postgres** (port 5432) - Database
- **adminer** (port 8080) - Database admin UI

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check API health
curl http://localhost/api/health

# Check frontend
open http://localhost

# Access database admin
open http://localhost:8080
```

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f nginx
docker-compose logs -f postgres
```

---

## Production Deployment

### Security Checklist

Before deploying to production:

1. ✅ Change all default passwords in `.env`
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET` (min 32 random characters)
   - `ADMIN_PASSWORD`

2. ✅ Set appropriate CORS origin
   ```bash
   CORS_ORIGIN=https://yourdomain.com
   ```

3. ✅ Enable HTTPS
   - Uncomment HTTPS server block in `nginx.conf`
   - Add SSL certificates to `src/docker/nginx/ssl/`
   - Or use Let's Encrypt (instructions below)

4. ✅ Set `NODE_ENV=production`

5. ✅ Configure firewall
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw deny 5432/tcp  # Block external DB access
   ufw deny 8080/tcp  # Block external Adminer access
   ```

6. ✅ Set up automated backups (see below)

### SSL Certificate Setup (Let's Encrypt)

```bash
# Install certbot
docker-compose exec nginx apk add certbot certbot-nginx

# Generate certificate
docker-compose exec nginx certbot --nginx -d yourdomain.com

# Auto-renewal (add to crontab)
0 3 * * * docker-compose exec nginx certbot renew --quiet
```

### Environment Variables (Production)

Create `.env` file:

```bash
# Database
POSTGRES_DB=research_games_prod
POSTGRES_USER=research_admin_prod
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>

# API
NODE_ENV=production
JWT_SECRET=<GENERATE_WITH: openssl rand -base64 32>
CORS_ORIGIN=https://yourdomain.com

# Ports
HTTP_PORT=80
HTTPS_PORT=443
ADMINER_PORT=8080  # Only expose on localhost

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<STRONG_RANDOM_PASSWORD>
ADMIN_EMAIL=admin@yourdomain.com
```

---

## Data Management

### Backup Database

```bash
# Manual backup
docker-compose exec postgres pg_dump -U research_admin research_games > backup_$(date +%Y%m%d).sql

# Automated backup script (add to cron)
./src/docker/scripts/backup.sh
```

### Restore Database

```bash
# From SQL backup
docker-compose exec -T postgres psql -U research_admin research_games < backup.sql

# From Docker volume
docker run --rm -v research_games_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

### Export Research Data

```bash
# Via API (requires admin authentication)
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost/api/export/treasure_hunt/csv > data.csv

# Via Adminer
# 1. Open http://localhost:8080
# 2. Login: postgres / research_admin / <password>
# 3. Select table → Export → CSV

# Direct PostgreSQL export
docker-compose exec postgres psql -U research_admin research_games \
  -c "\copy experiment1_treasure TO '/tmp/exp1.csv' CSV HEADER"
```

---

## Monitoring

### Service Health

```bash
# Check service status
docker-compose ps

# Check resource usage
docker stats

# Check API health endpoint
curl http://localhost/api/health
```

### Application Logs

```bash
# All logs
docker-compose logs -f

# Filter by service
docker-compose logs -f api | grep ERROR
docker-compose logs -f nginx | grep 404

# Export logs for analysis
docker-compose logs --no-color > app_logs_$(date +%Y%m%d).txt
```

### Database Monitoring

```bash
# Active connections
docker-compose exec postgres psql -U research_admin research_games \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
docker-compose exec postgres psql -U research_admin research_games \
  -c "SELECT pg_size_pretty(pg_database_size('research_games'));"

# Participant counts per experiment
docker-compose exec postgres psql -U research_admin research_games \
  -c "SELECT experiment_type, COUNT(*) FROM participants GROUP BY experiment_type;"
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs <service-name>

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Errors

```bash
# Check postgres is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U research_admin -d research_games -c "SELECT 1;"
```

### Permission Errors

```bash
# Fix data directory permissions
sudo chown -R $USER:$USER ./data

# Fix inside container
docker-compose exec api chown -R node:node /app/data
```

### Port Already in Use

```bash
# Find process using port 80
sudo lsof -i :80

# Change port in docker-compose.yml
ports:
  - "8000:80"  # Use port 8000 instead of 80
```

---

## Updating the Application

### Update Code

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose down
docker-compose build
docker-compose up -d
```

### Update Database Schema

```bash
# Run migrations (if applicable)
docker-compose exec api npm run migrate

# Or manually apply SQL
docker-compose exec -T postgres psql -U research_admin research_games < migrations/001_add_column.sql
```

---

## Scaling

### Horizontal Scaling (Multiple API Instances)

Edit `docker-compose.yml`:

```yaml
api:
  # ... existing config ...
  deploy:
    replicas: 3  # Run 3 API instances

  # Add load balancing in nginx.conf
  upstream api_backend {
    server api_1:3001;
    server api_2:3001;
    server api_3:3001;
  }
```

### Vertical Scaling (Resource Limits)

```yaml
api:
  # ... existing config ...
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '0.5'
        memory: 512M
```

---

## Testing Checklist

Before going live:

- [ ] All three experiments load correctly
- [ ] Consent form captures agreement
- [ ] Condition assignment is balanced
- [ ] All data is saved to database
- [ ] Export functions work (CSV and JSON)
- [ ] Admin login works
- [ ] Stats dashboard shows accurate counts
- [ ] Firefox compatibility verified
- [ ] Mobile responsiveness checked
- [ ] SSL certificate is valid
- [ ] Backups are automated
- [ ] Monitoring alerts are configured

---

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Check database: http://localhost:8080
3. Check API health: `curl http://localhost/api/health`
4. Review environment variables in `.env`

For production issues, contact system administrator.
