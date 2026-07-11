import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const TSCONFIG_PATH = resolve(PROJECT_ROOT, 'tsconfig.json');
const REMOTE_DECLARATION_PATH = resolve(PROJECT_ROOT, 'src/types/module-federation.d.ts');
const REPORTS_DIR = resolve(PROJECT_ROOT, 'reports');
const TYPE_CONTRACT_FIXTURE_PATH = resolve(REPORTS_DIR, 'module-federation-type-contract.fixture.tsx');

const readTsConfig = () => {
  const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext([configFile.error], formatHost));
  }

  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, PROJECT_ROOT);
};

const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => PROJECT_ROOT,
  getNewLine: () => '\n',
};

const formatDiagnostics = (diagnostics) => (
  ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
);

test('tsconfig includes Module Federation remote type declarations', () => {
  const parsedConfig = readTsConfig();
  const normalizedDeclarationPath = ts.sys.resolvePath(REMOTE_DECLARATION_PATH);

  assert.ok(
    parsedConfig.fileNames.some((fileName) => ts.sys.resolvePath(fileName) === normalizedDeclarationPath),
    'tsconfig.json must include src/types/module-federation.d.ts',
  );
});

test('Module Federation remote type declarations compile host imports', async () => {
  const parsedConfig = readTsConfig();

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(TYPE_CONTRACT_FIXTURE_PATH, `
import RemoteButton from 'design_system/Button';
import RemoteModal from 'design_system/Modal';
import RemoteThemeProvider, { ThemeProvider as NamedThemeProvider } from 'design_system/ThemeProvider';

type PropsOf<T> = T extends import('react').ComponentType<infer Props> ? Props : never;

const buttonProps: PropsOf<typeof RemoteButton> = {
  variant: 'primary',
  size: 'large',
  onClick(event) {
    event.currentTarget.disabled = true;
  },
  children: 'Module Federation 2.0 Button',
};

const modalProps: PropsOf<typeof RemoteModal> = {
  open: true,
  onOpenChange(open) {
    if (!open) {
      return;
    }
  },
  title: 'Remote modal',
  children: 'Modal body',
};

const defaultThemeProviderProps: PropsOf<typeof RemoteThemeProvider> = {
  defaultTheme: 'system',
  children: 'Theme content',
};

const namedThemeProviderProps: PropsOf<typeof NamedThemeProvider> = {
  theme: 'dark',
  children: 'Named provider content',
};

// @ts-expect-error RemoteButton is declared as a button component, not an anchor.
const invalidButtonProps: PropsOf<typeof RemoteButton> = { href: '/bad' };

// @ts-expect-error onOpenChange must be a boolean callback.
const invalidModalProps: PropsOf<typeof RemoteModal> = { onOpenChange: 'bad' };

void buttonProps;
void modalProps;
void defaultThemeProviderProps;
void namedThemeProviderProps;
void invalidButtonProps;
void invalidModalProps;
`, 'utf8');

  try {
    const compilerOptions = {
      ...parsedConfig.options,
      noEmit: true,
      skipLibCheck: true,
      types: ['node', 'react'],
    };
    const program = ts.createProgram(
      [REMOTE_DECLARATION_PATH, TYPE_CONTRACT_FIXTURE_PATH],
      compilerOptions,
    );
    const diagnostics = ts.getPreEmitDiagnostics(program);

    assert.equal(formatDiagnostics(diagnostics), '');
  } finally {
    await rm(TYPE_CONTRACT_FIXTURE_PATH, { force: true });
  }
});
