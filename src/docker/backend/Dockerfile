FROM node:18-alpine

# Install dependencies for node-gyp and PostgreSQL client
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Create app directory
WORKDIR /app

# Copy package files
COPY src/backend/package*.json ./

# Install dependencies
RUN npm install --only=production && \
    npm cache clean --force

# Copy application code
COPY src/backend/src ./src

# Create data directory
RUN mkdir -p /app/data && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "src/server.js"]
