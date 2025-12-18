FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm ci --production && npm cache clean --force

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=60s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

# Start the application
CMD ["npm", "start"]