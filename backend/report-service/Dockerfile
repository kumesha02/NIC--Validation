FROM node:18

WORKDIR /usr/src/app

COPY backend/shared /usr/src/shared

COPY backend/report-service/package*.json ./
RUN npm install --production

COPY backend/report-service/src ./src

ENV NODE_ENV=production
EXPOSE 8085

CMD ["node", "src/index.js"]
