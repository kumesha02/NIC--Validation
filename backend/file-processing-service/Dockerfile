FROM node:18

WORKDIR /usr/src/app

COPY backend/shared /usr/src/shared

COPY backend/file-processing-service/package*.json ./
RUN npm install --production

COPY backend/file-processing-service/src ./src

ENV NODE_ENV=production
EXPOSE 8083

CMD ["node", "src/index.js"]
