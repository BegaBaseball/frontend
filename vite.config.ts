import fs from 'node:fs';
import { createLogger, defineConfig, loadEnv } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import { createBegaModuleFederationConfig } from './module-federation.config';

type BuildCommandEnv = {
  command: string;
  mode: string;
};

type MutableBuildEnv = Record<string, string | undefined>;

type ViteAliasConfigOptions = {
  hasDesignSystemRemoteEntry: boolean;
  rootDir: string;
  useHelmetShim: boolean;
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const designSystemFallbackAliases = {
  'design_system/Button': './src/components/moduleFederation/fallback/Button.tsx',
  'design_system/Modal': './src/components/moduleFederation/fallback/Modal.tsx',
  'design_system/ThemeProvider': './src/components/moduleFederation/fallback/ThemeProvider.tsx',
} as const;

export const isProductionBuildCommand = ({ command, mode }: BuildCommandEnv) =>
  command === 'build' && mode === 'production';

export const forceProductionBuildNodeEnv = (targetEnv: MutableBuildEnv) => {
  targetEnv.NODE_ENV = 'production';
  targetEnv.VITE_USER_NODE_ENV = 'production';
};

export const validateProductionPublicEnv = (targetEnv: MutableBuildEnv) => {
  const siteUrlValue = targetEnv.VITE_SITE_URL?.trim() ?? '';
  const apiBaseUrlValue = targetEnv.VITE_API_BASE_URL?.trim() ?? '';

  if (!siteUrlValue) {
    throw new Error('[vite] VITE_SITE_URL is required for production builds.');
  }
  if (!apiBaseUrlValue) {
    throw new Error('[vite] VITE_API_BASE_URL is required for production builds.');
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(siteUrlValue);
  } catch {
    throw new Error(`[vite] VITE_SITE_URL must be an absolute HTTP(S) URL: ${siteUrlValue}`);
  }

  if (!/^https?:$/.test(siteUrl.protocol)) {
    throw new Error(`[vite] VITE_SITE_URL must use HTTP(S): ${siteUrlValue}`);
  }

  const isLoopbackSite = LOOPBACK_HOSTS.has(siteUrl.hostname.toLowerCase());
  if (isLoopbackSite) {
    if (!/^https?:\/\//.test(apiBaseUrlValue)) {
      return targetEnv;
    }

    try {
      const apiUrl = new URL(apiBaseUrlValue);
      if (LOOPBACK_HOSTS.has(apiUrl.hostname.toLowerCase())) {
        return targetEnv;
      }
    } catch {
      // Fall through to the public production URL validation below.
    }
  }

  if (!/^https:\/\//.test(apiBaseUrlValue)) {
    throw new Error(
      `[vite] VITE_API_BASE_URL must be an absolute HTTPS URL for public production builds: ${apiBaseUrlValue}`,
    );
  }

  try {
    new URL(apiBaseUrlValue);
  } catch {
    throw new Error(`[vite] VITE_API_BASE_URL must be an absolute HTTPS URL: ${apiBaseUrlValue}`);
  }

  return targetEnv;
};

export const createViteAliasConfig = ({
  hasDesignSystemRemoteEntry,
  rootDir,
  useHelmetShim,
}: ViteAliasConfigOptions): Record<string, string> => {
  const alias: Record<string, string> = {
    sonner: path.resolve(rootDir, './src/shims/sonner.tsx'),
    '@': path.resolve(rootDir, './src'),
  };

  if (useHelmetShim) {
    alias['react-helmet-async'] = path.resolve(rootDir, './src/shims/react-helmet-async.tsx');
  }
  if (!hasDesignSystemRemoteEntry) {
    for (const [remoteModule, fallbackPath] of Object.entries(designSystemFallbackAliases)) {
      alias[remoteModule] = path.resolve(rootDir, fallbackPath);
    }
  }

  return alias;
};

export default defineConfig(({ mode, command }) => {
  const isProductionBuild = isProductionBuildCommand({ command, mode });
  if (isProductionBuild) {
    forceProductionBuildNodeEnv(process.env);
  }

  const envMode = mode === 'production' ? 'prod' : mode;
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...loadEnv(envMode, path.resolve(process.cwd(), '..'), ''),
  };
  if (isProductionBuild) {
    forceProductionBuildNodeEnv(env);
    forceProductionBuildNodeEnv(process.env);
    validateProductionPublicEnv({
      ...env,
      ...process.env,
    });
  }

  const nodeEnv = isProductionBuild ? 'production' : process.env.NODE_ENV ?? mode;
  const proxyTarget = env.VITE_PROXY_TARGET ?? 'http://localhost:8080';
  const suppressCypressProxyErrors = env.VITE_SUPPRESS_CYPRESS_PROXY_ERRORS === 'true';
  const enableCloudflarePlugin =
    command !== 'serve' || env.VITE_ENABLE_CLOUDFLARE_PLUGIN === 'true';
  const hasDesignSystemRemoteEntry = Boolean(env.VITE_MF_DESIGN_SYSTEM_ENTRY?.trim());
  const enableModuleFederationPlugin =
    env.VITE_ENABLE_MODULE_FEDERATION === 'true'
    || hasDesignSystemRemoteEntry;
  const helmetPackagePath = path.resolve(__dirname, 'node_modules/react-helmet-async/package.json');
  const useHelmetShim = !fs.existsSync(helmetPackagePath);
  const alias = createViteAliasConfig({
    hasDesignSystemRemoteEntry,
    rootDir: __dirname,
    useHelmetShim,
  });

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

  const moduleFederationPlugins = enableModuleFederationPlugin
    ? federation(createBegaModuleFederationConfig(env))
    : [];

  return {
    appType: 'spa',
    customLogger,
    plugins: [
      react(),
      ...moduleFederationPlugins,
      ...(enableCloudflarePlugin ? [cloudflare()] : []),
    ],

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias,
    },
    define: {
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
      'global.process.env.NODE_ENV': JSON.stringify(nodeEnv),
      'globalThis.process.env.NODE_ENV': JSON.stringify(nodeEnv),
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
            const normalizedId = id.split(path.sep).join('/');
            const homeFirstLoadCoreChunkModules = [
              '/src/api/homeCore.ts',
              '/src/utils/dateKey.ts',
              '/src/utils/homeSeasonLogic.ts',
              '/src/utils/manualBaseballDataContract.ts',
            ];
            if (homeFirstLoadCoreChunkModules.some((modulePath) => normalizedId.endsWith(modulePath))) {
              return 'home-first-load-core';
            }
            if (id.includes('/src/utils/predictionCoachPresentation')) {
              return 'coach-presentation';
            }
            if (id.includes('/src/utils/coachAnalysisText')) {
              return 'coach-analysis-text';
            }
            // App-code split: coach briefing 순수 캐시/파싱 util을 별도 청크로 분리해
            // CoachBriefingAutoRuntime 청크가 헬퍼 무게를 떠안지 않도록 한다(leaf util, 순환참조 없음).
            if (id.includes('/src/utils/coachBriefingCache')) {
              return 'coach-briefing-cache';
            }
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
