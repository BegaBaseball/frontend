import fs from 'node:fs';
import { createLogger, defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET ?? 'http://localhost:8080';
  const suppressCypressProxyErrors = env.VITE_SUPPRESS_CYPRESS_PROXY_ERRORS === 'true';
  const enableCloudflarePlugin =
    command !== 'serve' || env.VITE_ENABLE_CLOUDFLARE_PLUGIN === 'true';
  const helmetPackagePath = path.resolve(__dirname, 'node_modules/react-helmet-async/package.json');
  const useHelmetShim = !fs.existsSync(helmetPackagePath);
  const alias = {
    sonner: path.resolve(__dirname, './src/shims/sonner.tsx'),
    'lucide-react': path.resolve(__dirname, './src/shims/lucide-react.tsx'),
    'figma:asset/f552d9266ac817e0c86b657dead0069395c6da11.png': path.resolve(__dirname, './src/assets/f552d9266ac817e0c86b657dead0069395c6da11.png'),
    'figma:asset/e2bd5a0f58df48e435d03f049811638d849de606.png': path.resolve(__dirname, './src/assets/e2bd5a0f58df48e435d03f049811638d849de606.png'),
    'figma:asset/d97539563d3c93f568cb7a4331c9e607cfafe914.png': path.resolve(__dirname, './src/assets/d97539563d3c93f568cb7a4331c9e607cfafe914.png'),
    'figma:asset/d94cd6cb1a915d591b57bbca900f8268281068e3.png': path.resolve(__dirname, './src/assets/d94cd6cb1a915d591b57bbca900f8268281068e3.png'),
    'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png': path.resolve(__dirname, './src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png'),
    'figma:asset/bb63ace90c2b7b74e708cae2f562fbca654538ec.png': path.resolve(__dirname, './src/assets/bb63ace90c2b7b74e708cae2f562fbca654538ec.png'),
    'figma:asset/b414fb1229152a89657a33002953975be2a9217b.png': path.resolve(__dirname, './src/assets/b414fb1229152a89657a33002953975be2a9217b.png'),
    'figma:asset/9e7d58fab40f3e586f2a0aaf6ee3c59993bcf101.png': path.resolve(__dirname, './src/assets/9e7d58fab40f3e586f2a0aaf6ee3c59993bcf101.png'),
    'figma:asset/7642c88659d68a93b809e39f4c56d9c284123115.png': path.resolve(__dirname, './src/assets/7642c88659d68a93b809e39f4c56d9c284123115.png'),
    'figma:asset/691ca553a888de6b3262d9c3c63d03f37db27b4a.png': path.resolve(__dirname, './src/assets/691ca553a888de6b3262d9c3c63d03f37db27b4a.png'),
    'figma:asset/560639a3d1481dca02309d52b06d0efe43f355f7.png': path.resolve(__dirname, './src/assets/560639a3d1481dca02309d52b06d0efe43f355f7.png'),
    'figma:asset/51e88fde588eb7cf7d5390b0fce1bb07ff440d2e.png': path.resolve(__dirname, './src/assets/51e88fde588eb7cf7d5390b0fce1bb07ff440d2e.png'),
    'figma:asset/5162bdc3599041e7b7b1da494d7d0dcc490e5893.png': path.resolve(__dirname, './src/assets/5162bdc3599041e7b7b1da494d7d0dcc490e5893.png'),
    'figma:asset/4b5cf234f729d37970ba7ab9c5a1134fcd8e70b6.png': path.resolve(__dirname, './src/assets/4b5cf234f729d37970ba7ab9c5a1134fcd8e70b6.png'),
    'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png': path.resolve(__dirname, './src/assets/3aa01761d11828a81213baa8e622fec91540199d.png'),
    'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png': path.resolve(__dirname, './src/assets/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png'),
    'figma:asset/24a312517fb1be189f3fae2611b33f19a72d9401.png': path.resolve(__dirname, './src/assets/24a312517fb1be189f3fae2611b33f19a72d9401.png'),
    'figma:asset/202a55c2e2083b7f096b21380d22d1769e56d762.png': path.resolve(__dirname, './src/assets/202a55c2e2083b7f096b21380d22d1769e56d762.png'),
    'figma:asset/19b0bb1cde805dc5d6e6af053a4bd1622a1a4fad.png': path.resolve(__dirname, './src/assets/19b0bb1cde805dc5d6e6af053a4bd1622a1a4fad.png'),
    'figma:asset/01cb53a9197c5457e6d7dd7460bdf1cd27b5440b.png': path.resolve(__dirname, './src/assets/01cb53a9197c5457e6d7dd7460bdf1cd27b5440b.png'),
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
              isPackage('react') ||
              isPackage('react-dom') ||
              isPackage('scheduler') ||
              isPackage('use-sync-external-store') ||
              isPackage('zustand') ||
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
            if (id.includes('/@tanstack/')) {
              return 'vendor-query';
            }
            if (
              id.includes('/sockjs-client/')
              || id.includes('/@stomp/')
            ) {
              return 'vendor-realtime';
            }
            if (
              id.includes('/axios/')
            ) {
              return 'vendor-network';
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
