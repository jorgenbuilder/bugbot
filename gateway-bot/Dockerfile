FROM node:20-slim

WORKDIR /app

# Copy from gateway-bot directory (Railway builds from repo root)
COPY gateway-bot/package*.json ./
RUN npm ci --production

COPY gateway-bot/ ./

EXPOSE 8080

CMD ["node", "index.js"]
