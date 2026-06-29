const reactJsxDevCallPattern = /\b[$A-Z_a-z][\w$]*\.jsxDEV\(/;
const sourceFileMetadataPattern = /fileName:"[^"]*(?:\/src\/|\\src\\)[^"]*\.(?:tsx|jsx|ts|js)"/;

export const REACT_DEV_ARTIFACT_PATTERNS = [
  {
    name: 'react_jsxdev_call',
    description: 'compiled React dev JSX call',
    pattern: reactJsxDevCallPattern,
  },
  {
    name: 'react_source_file_metadata',
    description: 'React dev source file metadata',
    pattern: sourceFileMetadataPattern,
  },
];

export const detectReactDevArtifacts = (contents) => (
  REACT_DEV_ARTIFACT_PATTERNS
    .filter(({ pattern }) => pattern.test(contents))
    .map(({ name }) => name)
);
