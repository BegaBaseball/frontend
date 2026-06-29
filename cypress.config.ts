import { defineConfig } from 'cypress';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';

const VISUAL_AUDIT_SCREENSHOT_PREFIX = 'prediction-coach-visual-audit/';
const VISUAL_AUDIT_REFERENCE_FILE = 'ai-coach-prediction-card-v2-fused.html';

const makeVisualAuditRunId = () => (
    process.env.PREDICTION_COACH_VISUAL_AUDIT_RUN_ID
    || new Date().toISOString().replace(/[:.]/g, '-')
);

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const resolveWorkspaceOutputDir = (projectRoot: string) => (
    process.env.KBO_WORKSPACE_OUTPUT_DIR
    || path.resolve(projectRoot, '..', 'output')
);

const normalizeRelativeImagePath = (value: unknown) => String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

const buildVisualAuditReportHtml = (entries: Array<Record<string, unknown>>, runId: string) => {
    const rows = entries.map((entry) => {
        const reference = normalizeRelativeImagePath(entry.reference);
        const live = normalizeRelativeImagePath(entry.live);
        const referenceCell = reference
            ? `<a href="../${escapeHtml(reference)}"><img src="../${escapeHtml(reference)}" alt="${escapeHtml(entry.label)} reference" /></a>`
            : '<span class="muted">no reference capture</span>';
        const liveCell = live
            ? `<a href="../${escapeHtml(live)}"><img src="../${escapeHtml(live)}" alt="${escapeHtml(entry.label)} live" /></a>`
            : '<span class="muted">no live capture</span>';
        return `
          <tr>
            <td>
              <strong>${escapeHtml(entry.label)}</strong>
              <span>${escapeHtml(entry.group)}</span>
            </td>
            <td>${referenceCell}</td>
            <td>${liveCell}</td>
            <td>${escapeHtml(entry.classification || 'pending visual review')}</td>
            <td>${escapeHtml(entry.note || '')}</td>
          </tr>`;
    }).join('\n');

    return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Prediction Coach Visual Audit ${escapeHtml(runId)}</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1440px; margin: 0 auto; padding: 28px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    p { margin: 0 0 18px; color: #475569; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; background: #fff; border: 1px solid #e2e8f0; }
    th, td { border-top: 1px solid #e2e8f0; padding: 12px; vertical-align: top; text-align: left; }
    th { background: #f1f5f9; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #475569; }
    td:first-child { width: 18%; }
    td:first-child span { display: block; margin-top: 4px; color: #64748b; font-size: 12px; }
    img { display: block; width: 100%; max-height: 680px; object-fit: contain; object-position: top left; background: #fff; border: 1px solid #e2e8f0; }
    .muted { color: #94a3b8; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>Prediction Coach Visual Audit</h1>
    <p>Run ${escapeHtml(runId)}. Classify each reviewed row as match, intentional divergence, stale reference, or drift to fix.</p>
    <table>
      <thead>
        <tr><th>Target</th><th>Reference</th><th>Live</th><th>Classification</th><th>Notes</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`;
};

const buildVisualAuditSummary = (entries: Array<Record<string, unknown>>, runId: string) => {
    const rows = entries.map((entry) => [
        escapeHtml(entry.label),
        escapeHtml(entry.group),
        entry.reference ? `\`${normalizeRelativeImagePath(entry.reference)}\`` : 'n/a',
        entry.live ? `\`${normalizeRelativeImagePath(entry.live)}\`` : 'n/a',
        escapeHtml(entry.classification || 'pending visual review'),
        escapeHtml(entry.note || ''),
    ].join(' | ')).join('\n');

    return `# Prediction Coach Visual Audit

Run: \`${runId}\`

| Target | Group | Reference | Live | Classification | Notes |
| --- | --- | --- | --- | --- | --- |
${rows}

Classification vocabulary: \`match\`, \`intentional divergence\`, \`stale reference\`, \`drift to fix\`.
`;
};

const buildPreparedReferenceCanvasHtml = (referencePath: string, projectRoot: string) => {
    const html = readFileSync(referencePath, 'utf8');
    const babelScriptMatch = html.match(/<script\s+type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!babelScriptMatch) {
        throw new Error(`Reference HTML does not contain a text/babel script: ${referencePath}`);
    }

    const reactRuntime = readFileSync(
        path.join(projectRoot, 'node_modules', 'react', 'umd', 'react.production.min.js'),
        'utf8',
    );
    const reactDomRuntime = readFileSync(
        path.join(projectRoot, 'node_modules', 'react-dom', 'umd', 'react-dom.production.min.js'),
        'utf8',
    );
    const transformedCanvasScript = ts.transpileModule(babelScriptMatch[1], {
        fileName: 'ai-coach-prediction-card-v2-fused.tsx',
        compilerOptions: {
            jsx: ts.JsxEmit.React,
            jsxFactory: 'React.createElement',
            jsxFragmentFactory: 'React.Fragment',
            target: ts.ScriptTarget.ES2018,
            module: ts.ModuleKind.None,
        },
    }).outputText;
    const inlineScript = (source: string) => source.replace(/<\/script/gi, '<\\/script');
    const bootErrorCaptureScript = `
window.__REFERENCE_CANVAS_ERRORS = [];
window.addEventListener('error', function(event) {
    window.__REFERENCE_CANVAS_ERRORS.push(String(event.message || event.error || 'unknown error'));
});
window.addEventListener('unhandledrejection', function(event) {
    window.__REFERENCE_CANVAS_ERRORS.push(String(event.reason || 'unknown rejection'));
});
`;

    return html
        .replace(/<script\s+src=["']https:\/\/unpkg\.com\/react@[^"']+["'][^>]*><\/script>\s*/i, '')
        .replace(/<script\s+src=["']https:\/\/unpkg\.com\/react-dom@[^"']+["'][^>]*><\/script>\s*/i, '')
        .replace(/<script\s+src=["']https:\/\/unpkg\.com\/@babel\/standalone@[^"']+["'][^>]*><\/script>\s*/i, '')
        .replace(
            babelScriptMatch[0],
            () => [
                '<script>',
                inlineScript(bootErrorCaptureScript),
                '</script>',
                '<script>',
                inlineScript(reactRuntime),
                '</script>',
                '<script>',
                inlineScript(reactDomRuntime),
                '</script>',
                '<script>',
                inlineScript(transformedCanvasScript),
                '</script>',
            ].join('\n'),
        );
};

export default defineConfig({
    allowCypressEnv: false,
    e2e: {
        baseUrl: 'http://127.0.0.1:5176',
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
        screenshotOnRunFailure: true,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 30000,
        setupNodeEvents(on, config) {
            const workspaceOutputDir = resolveWorkspaceOutputDir(config.projectRoot);
            const visualAuditRunId = makeVisualAuditRunId();
            const visualAuditRoot = path.join(
                workspaceOutputDir,
                'playwright',
                'prediction-coach-visual-audit',
                visualAuditRunId,
            );
            const visualAuditReferencePath = process.env.PREDICTION_COACH_REFERENCE_HTML
                || path.join(workspaceOutputDir, 'reference', VISUAL_AUDIT_REFERENCE_FILE);

            config.env.predictionCoachVisualAuditRunId = visualAuditRunId;
            config.env.predictionCoachVisualAuditOutputDir = visualAuditRoot;
            config.env.predictionCoachVisualAuditReferencePath = visualAuditReferencePath;

            on('task', {
                log(message) {
                    console.log(message);
                    return null;
                },
                'predictionCoachVisualAudit:prepareReferenceHtml'(payload) {
                    const referencePath = String(payload?.referencePath || visualAuditReferencePath);
                    const preparedHtml = buildPreparedReferenceCanvasHtml(referencePath, config.projectRoot);
                    const preparedDir = path.join(visualAuditRoot, 'reference');
                    const preparedPath = path.join(preparedDir, 'prepared-reference-canvas.html');
                    mkdirSync(preparedDir, { recursive: true });
                    writeFileSync(preparedPath, preparedHtml);
                    return { preparedPath };
                },
                'predictionCoachVisualAudit:writeReport'(payload) {
                    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
                    const sideBySideDir = path.join(visualAuditRoot, 'side-by-side');
                    mkdirSync(sideBySideDir, { recursive: true });
                    writeFileSync(
                        path.join(sideBySideDir, 'index.html'),
                        buildVisualAuditReportHtml(entries, visualAuditRunId),
                    );
                    writeFileSync(
                        path.join(visualAuditRoot, 'audit-summary.md'),
                        buildVisualAuditSummary(entries, visualAuditRunId),
                    );
                    return {
                        outputDir: visualAuditRoot,
                        reportPath: path.join(sideBySideDir, 'index.html'),
                        summaryPath: path.join(visualAuditRoot, 'audit-summary.md'),
                    };
                },
            });

            on('after:screenshot', (details) => {
                const screenshotName = String(details.name ?? '');
                const prefixIndex = screenshotName.indexOf(VISUAL_AUDIT_SCREENSHOT_PREFIX);
                if (prefixIndex < 0) {
                    return details;
                }

                const relativeName = screenshotName
                    .slice(prefixIndex + VISUAL_AUDIT_SCREENSHOT_PREFIX.length)
                    .replace(/\\/g, '/')
                    .replace(/\.png$/i, '');
                const targetPath = path.join(visualAuditRoot, `${relativeName}.png`);
                mkdirSync(path.dirname(targetPath), { recursive: true });
                copyFileSync(details.path, targetPath);
                return details;
            });

            return config;
        },
    },
});
