FROM node:18

WORKDIR /usr/src/app

COPY backend/shared /usr/src/shared

COPY backend/dashboard-service/package*.json ./
RUN npm install --production

COPY backend/dashboard-service/src ./src

ENV NODE_ENV=production
EXPOSE 8084

CMD ["node", "src/index.js"]
