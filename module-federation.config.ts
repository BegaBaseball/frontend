import {
  createModuleFederationConfig,
  type ModuleFederationOptions,
} from '@module-federation/vite';

type ModuleFederationEnv = Record<string, string | undefined>;

type DesignSystemRemoteEnv = {
  entry: string;
  name: string;
};

const isEntryUrlLike = (value: string) =>
  /^[a-z][a-z\d+.-]*:\/\//i.test(value) || value.startsWith('/');

const findEntrySeparatorIndex = (value: string) => {
  if (isEntryUrlLike(value)) {
    return -1;
  }

  for (let index = value.indexOf('@'); index >= 0; index = value.indexOf('@', index + 1)) {
    const candidateEntry = value.slice(index + 1).trim();
    if (isEntryUrlLike(candidateEntry)) {
      return index;
    }
  }

  return -1;
};

const shared: ModuleFederationOptions['shared'] = {
  react: {
    singleton: true,
    requiredVersion: '^18.3.1',
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^18.3.1',
  },
};

const optionalDesignSystemRemote = (
  env: ModuleFederationEnv,
): ModuleFederationOptions['remotes'] => {
  const remote = resolveDesignSystemRemoteEnv(env);

  if (!remote) {
    return undefined;
  }

  return {
    design_system: {
      type: 'module',
      name: remote.name,
      entry: remote.entry,
      shareScope: 'default',
    },
  };
};

export const resolveDesignSystemRemoteEnv = (
  env: ModuleFederationEnv,
): DesignSystemRemoteEnv | undefined => {
  const rawEntry = env.VITE_MF_DESIGN_SYSTEM_ENTRY?.trim();

  if (!rawEntry) {
    return undefined;
  }

  const entrySeparatorIndex = findEntrySeparatorIndex(rawEntry);
  const entryName = entrySeparatorIndex >= 0
    ? rawEntry.slice(0, entrySeparatorIndex).trim()
    : '';
  const entryUrl = entrySeparatorIndex >= 0
    ? rawEntry.slice(entrySeparatorIndex + 1).trim()
    : rawEntry;

  return {
    entry: entryUrl,
    name: env.VITE_MF_DESIGN_SYSTEM_NAME?.trim() || entryName || 'design_system',
  };
};

export const createBegaModuleFederationConfig = (
  env: ModuleFederationEnv = process.env,
) => createModuleFederationConfig({
  name: env.VITE_MF_APP_NAME?.trim() || 'bega_frontend',
  filename: 'remoteEntry.js',
  remotes: optionalDesignSystemRemote(env),
  shared,
  manifest: {
    fileName: 'mf-manifest.json',
  },
  dts: false,
  hostInitInjectLocation: 'html',
  moduleParseIdleTimeout: 20,
});

export default createBegaModuleFederationConfig();
