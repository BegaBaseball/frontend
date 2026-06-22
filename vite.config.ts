import fs from 'node:fs';
import { createLogger, defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode, command }) => {
  const envMode = mode === 'production' ? 'prod' : mode;
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...loadEnv(envMode, path.resolve(process.cwd(), '..'), ''),
  };
  const proxyTarget = env.VITE_PROXY_TARGET ?? 'http://localhost:8080';
  const suppressCypressProxyErrors = env.VITE_SUPPRESS_CYPRESS_PROXY_ERRORS === 'true';
  const enableCloudflarePlugin =
    command !== 'serve' || env.VITE_ENABLE_CLOUDFLARE_PLUGIN === 'true';
  const helmetPackagePath = path.resolve(__dirname, 'node_modules/react-helmet-async/package.json');
  const useHelmetShim = !fs.existsSync(helmetPackagePath);
  const alias = {
    sonner: path.resolve(__dirname, './src/shims/sonner.tsx'),
    'lucide-react': path.resolve(__dirname, './src/shims/lucide-react.tsx'),
    '@': path.resolve(__dirname, './src'),
  };
  if (useHelmetShim) {
    alias['react-helmet-async'] = path.resolve(__dirname, './src/shims/react-helmet-async.tsx');
  }

  const viteLogger = createLogger();
  const customLogger = suppressCypressProxyErrors
    ? {
      ...viteLogger,
      error(message, options) {
        if (typeof message === 'string' && message.includes('http proxy error:')) {
          return;
        }
        viteLogger.error(message, options);
      },
    }
    : viteLogger;

  return {
    appType: 'spa',
    customLogger,
    plugins: [react(), ...(enableCloudflarePlugin ? [cloudflare()] : [])],

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias,
    },
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['sockjs-client'],
    },
    esbuild: {
      drop: mode === 'production' ? ['debugger'] : [],
      pure: mode === 'production' ? ['console.debug'] : [],
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      manifest: '.vite/client-manifest.json',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }
            const isPackage = (pkg: string) => id.includes(`/node_modules/${pkg}/`);
            if (
              isPackage('zustand') ||
              isPackage('use-sync-external-store')
            ) {
              return 'vendor-zustand';
            }
            if (
              isPackage('react') ||
              isPackage('react-dom') ||
              isPackage('scheduler') ||
              isPackage('redux')
            ) {
              return 'vendor-react-core';
            }
            if (
              isPackage('react-router') ||
              isPackage('react-router-dom') ||
              isPackage('@remix-run/router') ||
              isPackage('history') ||
              isPackage('react-is') ||
              isPackage('hoist-non-react-statics') ||
              isPackage('prop-types')
            ) {
              return 'vendor-router';
            }
            if (id.includes('/@tanstack/react-virtual')) {
              return 'vendor-virtual';
            }
            if (id.includes('/@tanstack/')) {
              return 'vendor-query';
            }
            if (
              id.includes('/sockjs-client/')
              || id.includes('/@stomp/')
            ) {
              return 'vendor-realtime';
            }
          },
        },
      },
    },
    environments: enableCloudflarePlugin ? {
      client: {
        build: {
          // Keep the client HTML at dist/index.html so SEO post-processing
          // and the final Cloudflare deploy artifact use the same root.
          outDir: 'dist',
          manifest: '.vite/client-manifest.json',
          // Preserve the worker bundle written just before the client build.
          emptyOutDir: false,
        },
      },
    } : undefined,

    server: {
      host: '0.0.0.0',
      port: 5176,
      allowedHosts: ['host.docker.internal'],
      open: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // cookieDomainRewrite: 'localhost',
        },
        '/ws': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
