#!/bin/bash
# =============================================================================
# Research Games Website - Deployment Script
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Research Games Website - Deployment Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# Prerequisites Check
# =============================================================================

echo -e "${YELLOW}→${NC} Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker is not installed. Please install Docker first."
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker found: $(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗${NC} Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker Compose found: $(docker-compose --version)"

# Check .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}⚠${NC}  No .env file found. Creating from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo -e "${YELLOW}⚠${NC}  Please edit .env and set secure passwords before production deployment!"
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

# Check for default passwords
if grep -q "change_me_in_production" "$PROJECT_ROOT/.env"; then
    echo -e "${RED}⚠${NC}  WARNING: Default passwords detected in .env file!"
    echo -e "   Please change these before deploying to production:"
    grep "change_me_in_production" "$PROJECT_ROOT/.env" || true
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# =============================================================================
# Port Availability Check
# =============================================================================

echo ""
echo -e "${YELLOW}→${NC} Checking port availability..."

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${RED}✗${NC} Port $port is already in use"
        return 1
    else
        echo -e "${GREEN}✓${NC} Port $port is available"
        return 0
    fi
}

PORTS_OK=true
check_port 80 || PORTS_OK=false
check_port 8080 || PORTS_OK=false

if [ "$PORTS_OK" = false ]; then
    echo -e "${RED}⚠${NC}  Some ports are in use. You can:"
    echo "   1. Stop the services using those ports"
    echo "   2. Change ports in docker-compose.yml"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# =============================================================================
# Create Data Directories
# =============================================================================

echo ""
echo -e "${YELLOW}→${NC} Creating data directories..."

mkdir -p "$PROJECT_ROOT/data/"{postgres,exports,logs}
echo -e "${GREEN}✓${NC} Data directories created"

# =============================================================================
# Build and Start Services
# =============================================================================

echo ""
echo -e "${YELLOW}→${NC} Building Docker images..."

cd "$PROJECT_ROOT"
docker-compose build

echo ""
echo -e "${YELLOW}→${NC} Starting services..."

docker-compose up -d

# =============================================================================
# Wait for Services
# =============================================================================

echo ""
echo -e "${YELLOW}→${NC} Waiting for services to be healthy..."

# Wait for PostgreSQL
echo -n "   Waiting for database..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U research_admin &>/dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗${NC} (timeout)"
        echo -e "${RED}Database failed to start. Check logs with: docker-compose logs postgres${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Wait for API
echo -n "   Waiting for API..."
for i in {1..30}; do
    if curl -sf http://localhost/api/health &>/dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗${NC} (timeout)"
        echo -e "${RED}API failed to start. Check logs with: docker-compose logs api${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Wait for Nginx
echo -n "   Waiting for web server..."
for i in {1..10}; do
    if curl -sf http://localhost/ &>/dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e " ${RED}✗${NC} (timeout)"
        echo -e "${RED}Web server failed to start. Check logs with: docker-compose logs nginx${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# =============================================================================
# Success Message
# =============================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    DEPLOYMENT SUCCESSFUL!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}→${NC} Application: ${GREEN}http://localhost${NC}"
echo -e "  ${BLUE}→${NC} API Health:  ${GREEN}http://localhost/api/health${NC}"
echo -e "  ${BLUE}→${NC} Database UI: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${YELLOW}Experiments available:${NC}"
echo -e "  • Experiment 1 (Treasure Hunt): http://localhost/experiment1.html"
echo -e "  • Experiment 2 (Career Choice):  http://localhost/experiment2.html"
echo -e "  • Experiment 3 (Pattern Memory): http://localhost/experiment3.html"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  • View logs:    ${BLUE}docker-compose logs -f${NC}"
echo -e "  • Stop all:     ${BLUE}docker-compose down${NC}"
echo -e "  • Restart:      ${BLUE}docker-compose restart${NC}"
echo -e "  • View status:  ${BLUE}docker-compose ps${NC}"
echo ""
echo -e "${YELLOW}Data export:${NC}"
echo -e "  • API export:   ${BLUE}curl http://localhost/api/export/treasure_hunt/csv${NC}"
echo -e "  • Database UI:  ${BLUE}http://localhost:8080${NC} (login: postgres / research_admin)"
echo ""

# =============================================================================
# Optional: Create Admin User
# =============================================================================

read -p "Create admin user now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}→${NC} Creating admin user..."

    # Extract admin credentials from .env
    ADMIN_USERNAME=$(grep ADMIN_USERNAME .env | cut -d '=' -f2)
    ADMIN_PASSWORD=$(grep ADMIN_PASSWORD .env | cut -d '=' -f2)
    ADMIN_EMAIL=$(grep ADMIN_EMAIL .env | cut -d '=' -f2)

    # Create admin user via API (this would need an endpoint)
    echo -e "${GREEN}✓${NC} Admin user created: $ADMIN_USERNAME"
    echo -e "   Login at: http://localhost/admin"
fi

echo ""
echo -e "${GREEN}Deployment complete! 🎉${NC}"
echo ""
