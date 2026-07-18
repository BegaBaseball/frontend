import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const HTTP_SOURCE_PATTERN = /^https?:\/\//i;

export const resolveSchemaSource = ({
  cwd = process.cwd(),
  env = process.env,
} = {}) => {
  const explicitSource = env.OPENAPI_SCHEMA_URL?.trim();
  if (explicitSource) {
    return explicitSource;
  }

  return resolve(cwd, '../bega_backend/BEGA_PROJECT/contracts/openapi.json');
};

export const assertSchemaSourceExists = (schemaSource) => {
  if (HTTP_SOURCE_PATTERN.test(schemaSource)) {
    return;
  }

  if (!existsSync(schemaSource)) {
    throw new Error(
      `Backend OpenAPI contract not found: ${schemaSource}. `
      + 'Run `cd bega_backend/BEGA_PROJECT && ./gradlew updateOpenApiContract`.',
    );
  }
};

export const assertGeneratedTypesMatch = (current, generated) => {
  if (current !== generated) {
    throw new Error('OpenAPI generated types are out of date. Run `npm run api:types`.');
  }
};
