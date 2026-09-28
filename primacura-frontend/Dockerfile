# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Copy package management files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Accept the backend URL as a build argument and set it as an environment variable
ARG VITE_BACKEND_URL="http://127.0.0.1:8000"
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build the Vite application (outputs to /app/dist by default)
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the custom Nginx configuration for Single Page Applications
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to the host
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]