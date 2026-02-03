FROM node:20-slim

# For Cloudflare Containers
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Expose port for health checks
EXPOSE 8080

CMD ["node", "index.js"]
