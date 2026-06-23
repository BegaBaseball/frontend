import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const defaultSeoFrontendRoot = path.resolve(__dirname, '..');
export const defaultSeoRepoRoot = path.resolve(defaultSeoFrontendRoot, '..');

const prodEnvFileNames = ['.env.prod', '.env.prod.local'];

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs.readFileSync(filePath, 'utf-8')
    .split(/\r?\n/)
    .reduce((env, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        return env;
      }

      const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
      const separatorIndex = normalizedLine.indexOf('=');
      if (separatorIndex <= 0) {
        return env;
      }

      const key = normalizedLine.slice(0, separatorIndex).trim();
      let value = normalizedLine.slice(separatorIndex + 1).trim();
      const quote = value[0];
      if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
        value = value.slice(1, -1);
      }

      return { ...env, [key]: value };
    }, {});
};

const loadProdEnvFiles = (rootDir) => (
  prodEnvFileNames.reduce((env, fileName) => ({
    ...env,
    ...parseEnvFile(path.join(rootDir, fileName)),
  }), {})
);

export const loadSeoFileEnv = ({
  frontendRoot = defaultSeoFrontendRoot,
  repoRoot = defaultSeoRepoRoot,
} = {}) => ({
  ...loadProdEnvFiles(repoRoot),
  ...loadProdEnvFiles(frontendRoot),
});

export const readSeoRuntimeEnvValue = (key, options = {}) => {
  const runtimeEnv = options.env ?? process.env;
  const processValue = String(runtimeEnv[key] || '').trim();
  if (processValue) {
    return { value: processValue, source: 'process' };
  }

  const fileEnv = options.fileEnv ?? loadSeoFileEnv(options);
  const fileValue = String(fileEnv[key] || '').trim();
  if (fileValue) {
    return { value: fileValue, source: 'file-fallback' };
  }

  return { value: '', source: 'missing' };
};

export const createSeoRuntimeEnvReader = (options = {}) => {
  const fileEnv = options.fileEnv ?? loadSeoFileEnv(options);
  const runtimeEnv = options.env ?? process.env;

  return (key) => readSeoRuntimeEnvValue(key, {
    ...options,
    env: runtimeEnv,
    fileEnv,
  });
};

export const formatSeoEnvSource = (source) => {
  if (source === 'process') {
    return 'runtime env';
  }
  if (source === 'file-fallback') {
    return '.env/.env.prod fallback';
  }
  return '미설정';
};
