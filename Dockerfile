# Step 1: Build the React app
FROM node:18 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Expose port 80
EXPOSE 5000
# Start Nginx
CMD ["npm", "start"]