# Stage 1: Build
FROM --platform=$BUILDPLATFORM node:20-slim AS builder

WORKDIR /app

ARG VITE_KAKAO_MAP_KEY
ARG VITE_API_BASE_URL
ARG VITE_PROXY_TARGET
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_KAKAO_MAP_KEY=$VITE_KAKAO_MAP_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PROXY_TARGET=$VITE_PROXY_TARGET
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy package files first for better caching
COPY package.json package-lock.json* .npmrc ./

# Install dependencies
RUN npm ci --legacy-peer-deps

COPY . ./

# Install platform-specific rollup binary if needed
RUN if [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then \
      npm install @rollup/rollup-linux-arm64-gnu --save-dev || true; \
    elif [ "$(uname -m)" = "x86_64" ]; then \
      npm install @rollup/rollup-linux-x64-gnu --save-dev || true; \
    fi

# Build the project
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:1.25-alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user for security
RUN adduser -D -H -u 1000 appuser && \
    chown -R appuser:appuser /var/cache/nginx /var/log/nginx /usr/share/nginx/html && \
    touch /var/run/nginx.pid && chown appuser:appuser /var/run/nginx.pid

USER appuser

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
