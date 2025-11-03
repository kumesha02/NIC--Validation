FROM node:18

WORKDIR /usr/src/app

COPY backend/shared /usr/src/shared

COPY backend/nic-validation-service/package*.json ./
RUN npm install --production

COPY backend/nic-validation-service/src ./src

ENV NODE_ENV=production
EXPOSE 8082

CMD ["node", "src/index.js"]
