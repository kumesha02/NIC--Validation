FROM node:18

WORKDIR /usr/src/app

COPY frontend/package*.json ./
RUN npm install

COPY frontend ./

ENV VITE_API_URL=http://api-gateway:8080/api
EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
