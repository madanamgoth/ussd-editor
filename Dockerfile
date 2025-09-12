# Multi-stage Dockerfile for USSD Editor with Git Integration
# Supports deployment on any platform with Docker

# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine as production

# Install git for Git integration
RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/git-workflow-server.js ./
COPY --from=builder /app/src ./src

# Create workflow data directory
RUN mkdir -p workflow-data

# Initialize git repository if needed
RUN git init . || true && \
    git config --global user.email "docker@ussd-editor.local" && \
    git config --global user.name "USSD Editor Docker"

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "run", "start"]
