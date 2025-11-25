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

COPY package.json package-lock.json* .npmrc ./

# Install dependencies with optional packages
RUN npm install

COPY . ./

# Install platform-specific rollup binary if needed
RUN if [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then \
      npm install @rollup/rollup-linux-arm64-gnu --save-dev || true; \
    elif [ "$(uname -m)" = "x86_64" ]; then \
      npm install @rollup/rollup-linux-x64-gnu --save-dev || true; \
    fi

# Build the project
RUN npm run build

# Stage 2: Runtime (serve with Vite dev server)
FROM --platform=$TARGETPLATFORM node:20-slim AS runner

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

# Copy built node_modules and source files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/index.html ./index.html
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/tsconfig*.json ./

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
