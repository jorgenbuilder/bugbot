FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Set up working directory
WORKDIR /workspace

# Copy execution script
COPY execute.sh /usr/local/bin/execute
RUN chmod +x /usr/local/bin/execute

# Set up git config
RUN git config --global user.name "bugbot" && \
    git config --global user.email "bugbot@example.com"

# Expose health check endpoint (optional)
EXPOSE 8080

# Default command
CMD ["execute"]
