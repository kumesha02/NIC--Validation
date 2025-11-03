FROM node:18

WORKDIR /usr/src/app

# Copy shared resources used by the microservice
COPY backend/shared /usr/src/shared

# Install dependencies
COPY backend/api-gateway/package*.json ./
RUN npm install --production

# Copy service source code
COPY backend/api-gateway/src ./src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/index.js"]
