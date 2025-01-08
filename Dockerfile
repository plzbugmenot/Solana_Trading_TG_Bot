# Step 1: Build the React app
# FROM node:18 AS builder
FROM --platform=linux/amd64 alpine:latest 

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]