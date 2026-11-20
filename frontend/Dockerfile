FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY frontend/storefront/package.json frontend/storefront/
COPY frontend/admin/package.json frontend/admin/
RUN npm ci
COPY frontend ./frontend
ARG APP
RUN npm run build --workspace @novara/${APP} && cp -r frontend/${APP}/dist /output
FROM nginx:1.28-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /output /usr/share/nginx/html
EXPOSE 80
