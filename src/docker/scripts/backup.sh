#!/bin/bash
# =============================================================================
# Research Games Website - Backup Script
# =============================================================================

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
else
    echo "Error: .env file not found"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}→${NC} Starting backup: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# =============================================================================
# Backup PostgreSQL Database
# =============================================================================

echo -e "${YELLOW}→${NC} Backing up PostgreSQL database..."

docker-compose exec -T postgres pg_dump \
    -U ${POSTGRES_USER:-research_admin} \
    -d ${POSTGRES_DB:-research_games} \
    --format=custom \
    > "$BACKUP_DIR/postgres_${TIMESTAMP}.dump"

echo -e "${GREEN}✓${NC} Database backup: postgres_${TIMESTAMP}.dump"

# Also create CSV exports of key tables
docker-compose exec -T postgres psql \
    -U ${POSTGRES_USER:-research_admin} \
    -d ${POSTGRES_DB:-research_games} \
    -c "\copy participants TO STDOUT CSV HEADER" \
    > "$BACKUP_DIR/participants_${TIMESTAMP}.csv"

docker-compose exec -T postgres psql \
    -U ${POSTGRES_USER:-research_admin} \
    -d ${POSTGRES_DB:-research_games} \
    -c "\copy experiment1_treasure TO STDOUT CSV HEADER" \
    > "$BACKUP_DIR/experiment1_${TIMESTAMP}.csv" 2>/dev/null || true

docker-compose exec -T postgres psql \
    -U ${POSTGRES_USER:-research_admin} \
    -d ${POSTGRES_DB:-research_games} \
    -c "\copy experiment2_career TO STDOUT CSV HEADER" \
    > "$BACKUP_DIR/experiment2_${TIMESTAMP}.csv" 2>/dev/null || true

docker-compose exec -T postgres psql \
    -U ${POSTGRES_USER:-research_admin} \
    -d ${POSTGRES_DB:-research_games} \
    -c "\copy experiment3_pattern TO STDOUT CSV HEADER" \
    > "$BACKUP_DIR/experiment3_${TIMESTAMP}.csv" 2>/dev/null || true

echo -e "${GREEN}✓${NC} CSV exports created"

# =============================================================================
# Backup Docker Volumes
# =============================================================================

echo -e "${YELLOW}→${NC} Backing up Docker volumes..."

# Backup postgres data volume
docker run --rm \
    -v research-games-website_postgres_data:/data \
    -v "$BACKUP_DIR":/backup \
    alpine \
    tar czf /backup/postgres_volume_${TIMESTAMP}.tar.gz -C /data .

echo -e "${GREEN}✓${NC} Volume backup: postgres_volume_${TIMESTAMP}.tar.gz"

# =============================================================================
# Backup Configuration Files
# =============================================================================

echo -e "${YELLOW}→${NC} Backing up configuration..."

cd "$PROJECT_ROOT"
tar czf "$BACKUP_DIR/config_${TIMESTAMP}.tar.gz" \
    .env \
    docker-compose.yml \
    src/docker/ \
    --exclude='src/docker/scripts/backups'

echo -e "${GREEN}✓${NC} Config backup: config_${TIMESTAMP}.tar.gz"

# =============================================================================
# Clean Old Backups
# =============================================================================

echo -e "${YELLOW}→${NC} Cleaning old backups (older than $RETENTION_DAYS days)..."

find "$BACKUP_DIR" -type f -name "*.dump" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.csv" -mtime +$RETENTION_DAYS -delete

echo -e "${GREEN}✓${NC} Old backups cleaned"

# =============================================================================
# Backup Summary
# =============================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    BACKUP COMPLETE!                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Backup location: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "Timestamp: ${YELLOW}$TIMESTAMP${NC}"
echo ""
echo "Files created:"
ls -lh "$BACKUP_DIR"/*${TIMESTAMP}* | awk '{print "  • " $9 " (" $5 ")"}'
echo ""
echo "To restore:"
echo "  Database:  docker-compose exec -T postgres pg_restore -U research_admin -d research_games < backup.dump"
echo "  Volume:    docker run --rm -v postgres_data:/data -v \$(pwd):/backup alpine tar xzf /backup/postgres_volume.tar.gz -C /data"
echo ""
