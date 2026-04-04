import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

type LucideImportUsage = {
  filePath: string;
  importName: string;
};

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shimPath = path.join(srcRoot, 'shims', 'lucide-react.tsx');

const isSourceFilePath = (filePath: string) => /\.(ts|tsx)$/.test(filePath) && !filePath.endsWith('.d.ts');

const parseSourceFile = (filePath: string) => ts.createSourceFile(
  filePath,
  fs.readFileSync(filePath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
);

const hasExportModifier = (node: ts.Node) =>
  node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;

const collectBindingNames = (name: ts.BindingName): string[] => {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }

  return name.elements.flatMap((element) => collectBindingNames(element.name));
};

const collectShimExports = (filePath: string) => {
  const exports = new Set<string>();
  const sourceFile = parseSourceFile(filePath);

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of collectBindingNames(declaration.name)) {
          exports.add(name);
        }
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isClassDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement)
        || ts.isEnumDeclaration(statement))
      && statement.name
      && hasExportModifier(statement)
    ) {
      exports.add(statement.name.text);
      continue;
    }

    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        exports.add((element.propertyName ?? element.name).text);
      }
    }
  }

  return exports;
};

const collectLucideImports = (rootDir: string) => {
  const imports: LucideImportUsage[] = [];

  const walk = (currentDir: string) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const filePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
        continue;
      }

      if (!isSourceFilePath(filePath)) {
        continue;
      }

      const sourceFile = parseSourceFile(filePath);
      const relativePath = path.relative(srcRoot, filePath);

      for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
          continue;
        }

        if (statement.moduleSpecifier.text !== 'lucide-react') {
          continue;
        }

        const { importClause } = statement;
        if (!importClause || !importClause.namedBindings || !ts.isNamedImports(importClause.namedBindings)) {
          continue;
        }

        for (const element of importClause.namedBindings.elements) {
          const importName = (element.propertyName ?? element.name).text;
          imports.push({
            filePath: relativePath,
            importName,
          });
        }
      }
    }
  };

  walk(rootDir);

  return imports;
};

test('lucide-react shim exports every named import used in src', () => {
  const shimExports = collectShimExports(shimPath);
  const lucideImports = collectLucideImports(srcRoot);
  const missing = new Map<string, string[]>();

  for (const lucideImport of lucideImports) {
    if (shimExports.has(lucideImport.importName)) {
      continue;
    }

    const files = missing.get(lucideImport.importName) ?? [];
    files.push(lucideImport.filePath);
    missing.set(lucideImport.importName, files);
  }

  assert.equal(
    missing.size,
    0,
    [
      'lucide-react shim is missing named exports used by the frontend source tree.',
      ...Array.from(missing.entries(), ([importName, files]) => `- ${importName}: ${Array.from(new Set(files)).sort().join(', ')}`),
    ].join('\n'),
  );
});
