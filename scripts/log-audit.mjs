import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const WORKSPACE_ROOT = process.cwd();
const SRC_ROOT = path.join(WORKSPACE_ROOT, 'src');
const STRICT_MODE = process.argv.includes('--strict');
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

const METHODS = new Set(['log', 'info', 'warn', 'error', 'debug']);
const SENSITIVE_SECOND_ARG_KEYS = /authorization|access[_-]?token|id[_-]?token|refresh[_-]?token|refresh|token|cookie|set[-_]?cookie|session|password|secret|credential|api[_-]?key|api[-_]?key|x[-_]?api[-_]?key|jwt|email|phone|csrf/i;
const SENSITIVE_STRING_MARKERS = /token|access[_-]?token|id[_-]?token|refresh[_-]?token|authorization|api[_-]?key|set[-_]?cookie|cookie|session|password|secret|credential|jwt|email|phone|csrf|state|code/i;
const SENSITIVE_STRING_URL_PATTERN = /[?&](?:token|access[_-]?token|id[_-]?token|refresh[_-]?token|authorization|api[_-]?key|code|state|phone|email)=/i;
const URL_WITH_QUERY_PATTERN = /^(?:https?:\/\/|wss?:\/\/|\/\/|\/|\.{1,2}\/|www\.)[^\s'"]*\?/;
const SENSITIVE_TEMPLATE_TEXT_PATTERN = SENSITIVE_STRING_MARKERS;

const riskySecondArgNames = new Set([
  'event',
  'frame',
  'socket',
  'websocket',
  'connection',
  'notification',
  'retryAfterSeconds',
  'context',
]);

const collectFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist' || entry.name === '.git') {
        return [];
      }
      return collectFiles(fullPath);
    }
    if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      if (TEST_FILE_PATTERN.test(entry.name)) {
        return [];
      }
      return [fullPath];
    }
    return [];
  });
};

const isStringLike = (node) => ts.isStringLiteralLike(node)
  || ts.isNoSubstitutionTemplateLiteral(node)
  || ts.isNumericLiteral(node)
  || ts.isTemplateExpression(node);

const isSensitiveExpression = (node) => {
  if (ts.isIdentifier(node)) {
    return SENSITIVE_SECOND_ARG_KEYS.test(node.text);
  }

  if (ts.isPropertyAccessExpression(node)) {
    return ts.isIdentifier(node.name) && SENSITIVE_SECOND_ARG_KEYS.test(node.name.text);
  }

  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return SENSITIVE_SECOND_ARG_KEYS.test(node.argumentExpression.text);
  }

  return false;
};

const hasSensitiveTemplateExpression = (node) => {
  if (!ts.isTemplateExpression(node)) {
    return false;
  }
  if (SENSITIVE_TEMPLATE_TEXT_PATTERN.test(node.head.text)) {
    return true;
  }
  return node.templateSpans.some((span) => {
    if (isSensitiveExpression(span.expression)) {
      return true;
    }
    return SENSITIVE_TEMPLATE_TEXT_PATTERN.test(span.literal.text);
  });
};

const isSensitiveObjectLiteral = (node) => {
  if (!ts.isObjectLiteralExpression(node)) {
    return false;
  }

  return node.properties.some((property) => {
    if (ts.isSpreadAssignment(property)) {
      return isSensitiveExpression(property.expression);
    }

    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
      return false;
    }

    const key = ts.isPropertyAssignment(property)
      ? property.name
      : property.name;
    if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
      const text = ts.isIdentifier(key) ? key.text : key.text;
      return SENSITIVE_SECOND_ARG_KEYS.test(text);
    }
    if (ts.isShorthandPropertyAssignment(property) && isSensitiveExpression(property.name)) {
      return true;
    }

    return false;
  });
};

const getLocation = (sourceFile, node) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return {
    line: line + 1,
    column: character + 1,
  };
};

const isConsoleCall = (node) => {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  if (!ts.isPropertyAccessExpression(node.expression)) {
    return false;
  }

  const isConsoleObject = node.expression.expression.getText() === 'console';
  return isConsoleObject && METHODS.has(node.expression.name.text);
};

const collectFindings = (sourceFile, source) => {
  const findings = [];

  const visit = (node) => {
    if (isConsoleCall(node)) {
      const method = node.expression.name.text;
      const args = node.arguments ?? [];

      const firstArg = args[0];
      if (!firstArg) {
        return;
      }

      const firstLocation = getLocation(sourceFile, firstArg);
      if (!isStringLike(firstArg)) {
        findings.push({
          severity: 'ERROR',
          method,
          file: source,
          line: firstLocation.line,
          column: firstLocation.column,
          snippet: firstArg.getText(sourceFile),
          reason: 'console call should include a string-like first argument for log label',
          suggestion: 'console.<method>(\"...\"); or console.<method>(\"...\","...',
        });
      }

      if (ts.isTemplateExpression(firstArg) && hasSensitiveTemplateExpression(firstArg)) {
        findings.push({
          severity: 'WARN',
          method,
          file: source,
          line: firstLocation.line,
          column: firstLocation.column,
          snippet: firstArg.getText(sourceFile),
          reason: `console <${method}> uses template literal with likely sensitive content`,
          suggestion: 'Avoid logging full raw objects inline; sanitize before formatting.',
        });
      }

      if (args.length > 1) {
        const secondArg = args[1];
        const secondLocation = getLocation(sourceFile, secondArg);
        if (ts.isIdentifier(secondArg) && (riskySecondArgNames.has(secondArg.text) || SENSITIVE_SECOND_ARG_KEYS.test(secondArg.text))) {
          findings.push({
            severity: 'WARN',
            method,
            file: source,
            line: secondLocation.line,
            column: secondLocation.column,
            snippet: secondArg.getText(sourceFile),
            reason: `console <${method}> passes likely raw object argument (${secondArg.text})`,
            suggestion: 'Pass a sanitized summary object instead.',
          });
        }

        if (ts.isStringLiteral(secondArg) || ts.isNoSubstitutionTemplateLiteral(secondArg) || ts.isTemplateExpression(secondArg)) {
          const text = secondArg.getText(sourceFile);
          if (URL_WITH_QUERY_PATTERN.test(text) || SENSITIVE_STRING_URL_PATTERN.test(text) || hasSensitiveTemplateExpression(secondArg)) {
            findings.push({
              severity: 'WARN',
              method,
              file: source,
              line: secondLocation.line,
              column: secondLocation.column,
              snippet: secondArg.getText(sourceFile),
              reason: `console <${method}> passes URL-like string with potential sensitive query content`,
              suggestion: 'Remove or redact query strings before logging.',
            });
          }
        }

        if (!isStringLike(secondArg) && isSensitiveExpression(secondArg)) {
          findings.push({
            severity: 'WARN',
            method,
            file: source,
            line: secondLocation.line,
            column: secondLocation.column,
            snippet: secondArg.getText(sourceFile),
            reason: `console <${method}> passes expression with sensitive-looking identifier (${secondArg.getText(sourceFile)})`,
            suggestion: 'Pass a sanitized summary value instead.',
          });
        }

        if (isSensitiveObjectLiteral(secondArg)) {
          findings.push({
            severity: 'WARN',
            method,
            file: source,
            line: secondLocation.line,
            column: secondLocation.column,
            snippet: secondArg.getText(sourceFile),
            reason: `console <${method}> receives object literal with sensitive-looking keys`,
            suggestion: 'Sanitize / remove sensitive keys before logging.',
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings;
};

const files = collectFiles(SRC_ROOT);
const findings = [];

for (const file of files) {
  const sourceText = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  findings.push(...collectFindings(sourceFile, file));
}

if (findings.length === 0) {
  console.log('[log-audit] No suspicious console logs found.');
  process.exit(0);
}

const errors = findings.filter((finding) => finding.severity === 'ERROR');
const warnings = findings.filter((finding) => finding.severity === 'WARN');

if (errors.length > 0) {
  console.error(`\n[log-audit] FAIL: found ${errors.length} high-risk console call(s), blocking build.`);
}
for (const finding of findings) {
  const icon = finding.severity === 'ERROR' ? '❌' : '⚠️';
  console.log(`${icon} ${finding.severity} ${path.relative(WORKSPACE_ROOT, finding.file)}:${finding.line}:${finding.column} [${finding.method}]`);
  console.log(`  - 이유: ${finding.reason}`);
  console.log(`  - 스니펫: ${finding.snippet}`);
  console.log(`  - 권장: ${finding.suggestion}`);
}

if (warnings.length > 0) {
  console.log(`\n[log-audit] 경고 ${warnings.length}건`);
}

if (STRICT_MODE && warnings.length > 0) {
  console.error(`\n[log-audit] FAIL: strict mode active, failing on ${warnings.length} warning(s).`);
}

process.exit(errors.length > 0 || (STRICT_MODE && warnings.length > 0) ? 1 : 0);
