FROM nginx:alpine

# Install certbot for SSL (optional, for production)
RUN apk add --no-cache certbot certbot-nginx

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY src/docker/nginx/nginx.conf /etc/nginx/nginx.conf

# Copy frontend files
COPY src/frontend /usr/share/nginx/html

# Create necessary directories
RUN mkdir -p /var/log/nginx /var/cache/nginx

# Set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
