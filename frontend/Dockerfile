# Multi-stage Docker build for React.js Vite Frontend
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy frontend source code and build production bundle
COPY . ./
RUN npm run build

# Serve static build artifacts using Nginx Alpine
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
