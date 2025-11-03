FROM node:18

WORKDIR /usr/src/app

COPY backend/shared /usr/src/shared

COPY backend/auth-service/package*.json ./
RUN npm install --production

COPY backend/auth-service/src ./src

ENV NODE_ENV=production
EXPOSE 8081

CMD ["node", "src/index.js"]
