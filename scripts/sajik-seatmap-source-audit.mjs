import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium/sajik-source-audit');
const seatDataSource = await fs.readFile(path.join(frontendRoot, 'src/data/sajikSeatData.ts'), 'utf8');

function extractStringConst(name) {
  const match = seatDataSource.match(new RegExp(`export const ${name} = '([^']+)'`));
  if (!match) {
    throw new Error(`Missing ${name} in src/data/sajikSeatData.ts`);
  }

  return match[1];
}

function extractStringField(name) {
  const match = seatDataSource.match(new RegExp(`${name}: '([^']+)'`));
  if (!match) {
    throw new Error(`Missing SAJIK_SEATMAP_IMAGE.${name} in src/data/sajikSeatData.ts`);
  }

  return match[1];
}

function extractNumberField(name) {
  const match = seatDataSource.match(new RegExp(`${name}: (\\d+)`));
  if (!match) {
    throw new Error(`Missing SAJIK_SEATMAP_IMAGE.${name} in src/data/sajikSeatData.ts`);
  }

  return Number(match[1]);
}

const SAJIK_REFERENCE_URL = extractStringConst('SAJIK_REFERENCE_URL');
const SAJIK_SEATMAP_IMAGE = {
  imagePath: extractStringField('imagePath'),
  imageWidth: extractNumberField('imageWidth'),
  imageHeight: extractNumberField('imageHeight'),
  viewBox: extractStringConst('SAJIK_VIEW_BOX'),
  imageSha256: extractStringConst('SAJIK_IMAGE_SHA256'),
  sourceUrl: SAJIK_REFERENCE_URL,
  sourceLabel: extractStringField('sourceLabel'),
  mapVersion: extractStringConst('SAJIK_MAP_VERSION'),
};
const referenceImagePath = path.join(frontendRoot, SAJIK_SEATMAP_IMAGE.imagePath);
const referenceWidth = SAJIK_SEATMAP_IMAGE.imageWidth;
const referenceHeight = SAJIK_SEATMAP_IMAGE.imageHeight;
const userAgent = 'Mozilla/5.0 (compatible; KBO-platform-sajik-source-audit/1.0)';

const OFFICIAL_PUBLIC_CANDIDATE_URLS = [
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg.jpg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg.gif',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg@2x.jpg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg_2x.jpg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg_original.jpg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg_origin.jpg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg_big.jpg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg_2026.jpg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg.svg',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg.png',
  'https://www.giantsclub.com/html/_Img/intro/sj_info_bg.webp',
];

function flagValues(name) {
  const values = [];

  process.argv.forEach((arg, index) => {
    if (arg === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  });

  return values;
}

function flagValue(name, fallback = null) {
  const values = flagValues(name);
  return values.length > 0 ? values[values.length - 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isAllowedOfficialUrl(rawUrl) {
  let hostname;

  try {
    hostname = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return false;
  }

  return (
    hostname === 'giantsclub.com'
    || hostname.endsWith('.giantsclub.com')
    || hostname === 'ticketlink.co.kr'
    || hostname.endsWith('.ticketlink.co.kr')
  );
}

function sanitizeFileName(value) {
  return value
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function contentTypeBase(contentType) {
  return (contentType || '').split(';')[0].trim().toLowerCase();
}

function detectAssetKind({ contentType, buffer, source }) {
  const type = contentTypeBase(contentType);
  const extension = path.extname(source || '').toLowerCase();
  const prefix = buffer.subarray(0, 512).toString('utf8').trimStart().toLowerCase();

  if (type === 'text/html' || prefix.startsWith('<!doctype html') || prefix.startsWith('<html')) {
    return 'html';
  }
  if (type === 'application/pdf' || extension === '.pdf' || buffer.subarray(0, 4).toString('utf8') === '%PDF') {
    return 'pdf';
  }
  if (type === 'image/svg+xml' || extension === '.svg' || prefix.startsWith('<svg')) {
    return 'svg';
  }
  if (type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
    return 'raster';
  }

  return 'unknown';
}

function parseSvgDimensions(buffer) {
  const text = buffer.toString('utf8');
  const viewBox = text.match(/\bviewBox=["']\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*["']/i);
  const width = text.match(/\bwidth=["']\s*([\d.]+)(?:px)?\s*["']/i);
  const height = text.match(/\bheight=["']\s*([\d.]+)(?:px)?\s*["']/i);

  if (viewBox) {
    return {
      width: Number(viewBox[3]),
      height: Number(viewBox[4]),
      viewBox: viewBox.slice(1, 5).join(' '),
    };
  }

  return {
    width: width ? Number(width[1]) : null,
    height: height ? Number(height[1]) : null,
    viewBox: null,
  };
}

async function rasterMetadata(buffer) {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    format: metadata.format ?? null,
  };
}

async function compareToReference(buffer) {
  const [referenceRaw, candidateRaw] = await Promise.all([
    sharp(referenceImagePath)
      .resize(referenceWidth, referenceHeight, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer(),
    sharp(buffer)
      .resize(referenceWidth, referenceHeight, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer(),
  ]);

  let sumSquaredDiff = 0;
  let sumAbsDiff = 0;
  let maxAbsDiff = 0;

  for (let index = 0; index < referenceRaw.length; index += 1) {
    const diff = Math.abs(referenceRaw[index] - candidateRaw[index]);
    sumSquaredDiff += diff * diff;
    sumAbsDiff += diff;
    maxAbsDiff = Math.max(maxAbsDiff, diff);
  }

  const mse = sumSquaredDiff / referenceRaw.length;
  const rmse = Math.sqrt(mse);
  const meanAbsDiff = sumAbsDiff / referenceRaw.length;
  const psnr = rmse === 0 ? Infinity : 20 * Math.log10(255 / rmse);

  return {
    rmse: Number(rmse.toFixed(4)),
    meanAbsDiff: Number(meanAbsDiff.toFixed(4)),
    maxAbsDiff,
    psnr: Number.isFinite(psnr) ? Number(psnr.toFixed(4)) : 'Infinity',
  };
}

function makeDecision({ candidate, assetKind, dimensions, similarity, fetchError, sourceAllowed }) {
  const reasons = [];

  if (candidate.kind === 'url' && !sourceAllowed) {
    return {
      status: 'REJECTED',
      reasons: ['URL_SOURCE_NOT_ALLOWED'],
    };
  }

  if (candidate.kind === 'file' && !candidate.sourceLabel) {
    return {
      status: 'REJECTED',
      reasons: ['OPERATOR_SOURCE_LABEL_REQUIRED'],
    };
  }

  if (assetKind === 'html') {
    return {
      status: 'REJECTED',
      reasons: ['FALLBACK_HTML_NOT_IMAGE_ASSET'],
    };
  }

  if (fetchError) {
    return {
      status: 'REJECTED',
      reasons: ['FETCH_FAILED'],
      detail: fetchError,
    };
  }

  if (assetKind === 'unknown') {
    return {
      status: 'REJECTED',
      reasons: ['UNSUPPORTED_CONTENT_TYPE'],
    };
  }

  if (assetKind === 'raster') {
    const width = dimensions?.width ?? 0;
    const height = dimensions?.height ?? 0;
    const isHigherResolution = width > referenceWidth || height > referenceHeight;

    if (!isHigherResolution) {
      return {
        status: 'REJECTED',
        reasons: ['NOT_HIGH_RESOLUTION_SOURCE'],
      };
    }

    if (similarity && typeof similarity.psnr === 'number' && similarity.psnr < 18) {
      return {
        status: 'REJECTED',
        reasons: ['LAYOUT_SIMILARITY_TOO_LOW'],
        similarity,
      };
    }

    if (width % referenceWidth === 0 && height % referenceHeight === 0) {
      reasons.push('POSSIBLE_SIMPLE_UPSCALE_REQUIRES_OPERATOR_REVIEW');
    }

    return {
      status: hasFlag('--operator-approved') ? 'APPROVED_FOR_STATIC_IMPORT' : 'REVIEW_REQUIRED_HIGH_RES_CANDIDATE',
      reasons,
    };
  }

  return {
    status: hasFlag('--operator-approved') ? 'APPROVED_FOR_STATIC_IMPORT' : 'REVIEW_REQUIRED_VECTOR_SOURCE',
    reasons: ['VECTOR_SOURCE_REQUIRES_OPERATOR_LAYOUT_REVIEW'],
  };
}

async function loadUrlCandidate(candidate) {
  if (!isAllowedOfficialUrl(candidate.source)) {
    return {
      sourceAllowed: false,
      statusCode: null,
      contentType: null,
      buffer: Buffer.alloc(0),
      fetchError: null,
    };
  }

  try {
    const response = await fetch(candidate.source, {
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,application/pdf,*/*;q=0.8',
        referer: SAJIK_REFERENCE_URL,
        'user-agent': userAgent,
      },
      redirect: 'manual',
    });
    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      sourceAllowed: true,
      statusCode: response.status,
      finalUrl: response.url,
      redirectLocation: response.headers.get('location'),
      contentType: response.headers.get('content-type'),
      buffer,
      fetchError: response.ok || buffer.length > 0 ? null : `HTTP_${response.status}`,
    };
  } catch (error) {
    return loadUrlCandidateWithCurlFallback(candidate, error);
  }
}

function parseHeaderValue(headers, name) {
  const pattern = new RegExp(`^${name}:\\s*(.+)$`, 'gim');
  let match = null;
  let value = null;

  while ((match = pattern.exec(headers)) !== null) {
    value = match[1].trim();
  }

  return value;
}

function parseStatusCode(headers) {
  const matches = [...headers.matchAll(/^HTTP\/\S+\s+(\d+)/gim)];
  const lastMatch = matches[matches.length - 1];
  return lastMatch ? Number(lastMatch[1]) : null;
}

async function loadUrlCandidateWithCurlFallback(candidate, fetchError) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sajik-source-audit-'));
  const headersPath = path.join(tempDir, 'headers.txt');
  const bodyPath = path.join(tempDir, 'body.bin');

  try {
    await execFileAsync('curl', [
      '-sS',
      '--max-time',
      '20',
      '-D',
      headersPath,
      '-o',
      bodyPath,
      '-A',
      userAgent,
      '-e',
      SAJIK_REFERENCE_URL,
      candidate.source,
    ]);

    const [headers, buffer] = await Promise.all([
      fs.readFile(headersPath, 'utf8'),
      fs.readFile(bodyPath),
    ]);

    return {
      sourceAllowed: true,
      statusCode: parseStatusCode(headers),
      finalUrl: candidate.source,
      redirectLocation: parseHeaderValue(headers, 'location'),
      contentType: parseHeaderValue(headers, 'content-type'),
      buffer,
      fetchError: buffer.length > 0 ? null : (fetchError instanceof Error ? fetchError.message : String(fetchError)),
    };
  } catch (curlError) {
    return {
      sourceAllowed: true,
      statusCode: null,
      contentType: null,
      buffer: Buffer.alloc(0),
      fetchError: [
        fetchError instanceof Error ? fetchError.message : String(fetchError),
        curlError instanceof Error ? curlError.message : String(curlError),
      ].join('; '),
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function loadFileCandidate(candidate) {
  try {
    const absolutePath = path.resolve(frontendRoot, candidate.source);
    const buffer = await fs.readFile(absolutePath);

    return {
      sourceAllowed: true,
      statusCode: null,
      finalUrl: null,
      contentType: null,
      buffer,
      fetchError: null,
      absolutePath,
    };
  } catch (error) {
    return {
      sourceAllowed: true,
      statusCode: null,
      finalUrl: null,
      contentType: null,
      buffer: Buffer.alloc(0),
      fetchError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function writeEvidenceFile(candidate, assetKind, buffer, evidenceDir) {
  if (!['raster', 'svg', 'pdf'].includes(assetKind) || buffer.length === 0) {
    return null;
  }

  const extensionByKind = {
    raster: path.extname(candidate.source).toLowerCase() || '.img',
    svg: '.svg',
    pdf: '.pdf',
  };
  const fileName = `${sanitizeFileName(candidate.source)}${extensionByKind[assetKind]}`;
  const outputPath = path.join(evidenceDir, fileName);

  await fs.writeFile(outputPath, buffer);

  return path.relative(frontendRoot, outputPath);
}

async function auditCandidate(candidate, evidenceDir) {
  const loaded = candidate.kind === 'url'
    ? await loadUrlCandidate(candidate)
    : await loadFileCandidate(candidate);
  const result = {
    source: candidate.source,
    sourceKind: candidate.kind,
    sourceLabel: candidate.sourceLabel,
    sourceAllowed: loaded.sourceAllowed,
    statusCode: loaded.statusCode,
    finalUrl: loaded.finalUrl ?? null,
    redirectLocation: loaded.redirectLocation ?? null,
    contentType: loaded.contentType,
    byteLength: loaded.buffer.length,
    sha256: loaded.buffer.length > 0 ? sha256(loaded.buffer) : null,
    assetKind: null,
    dimensions: null,
    similarityToCoordinateImage: null,
    evidencePath: null,
    decision: null,
  };

  const assetKind = loaded.buffer.length > 0
    ? detectAssetKind({ contentType: loaded.contentType, buffer: loaded.buffer, source: candidate.source })
    : 'unknown';
  result.assetKind = assetKind;

  try {
    if (assetKind === 'raster') {
      result.dimensions = await rasterMetadata(loaded.buffer);
      result.similarityToCoordinateImage = await compareToReference(loaded.buffer);
    } else if (assetKind === 'svg') {
      result.dimensions = parseSvgDimensions(loaded.buffer);
    }
  } catch (error) {
    result.decision = {
      status: 'REJECTED',
      reasons: ['ASSET_METADATA_READ_FAILED'],
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  if (!result.decision) {
    result.decision = makeDecision({
      candidate,
      assetKind,
      dimensions: result.dimensions,
      similarity: result.similarityToCoordinateImage,
      fetchError: loaded.fetchError,
      sourceAllowed: loaded.sourceAllowed,
    });
  }

  result.evidencePath = await writeEvidenceFile(candidate, assetKind, loaded.buffer, evidenceDir);

  return result;
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function buildMarkdown(report) {
  const lines = [
    '# Sajik Seatmap Source Audit',
    '',
    `- Audit version: \`${report.auditVersion}\``,
    `- Coordinate image: \`${report.coordinateImage.path}\` (${report.coordinateImage.width}x${report.coordinateImage.height})`,
    `- Coordinate image hash: \`${report.coordinateImage.sha256}\``,
    `- Runtime swap recommended: \`${report.summary.runtimeSwapRecommended}\``,
    '',
    '| Source | Kind | Content type | Size | Hash | Similarity PSNR | Decision | Reasons |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  report.candidates.forEach((candidate) => {
    const size = candidate.dimensions?.width && candidate.dimensions?.height
      ? `${candidate.dimensions.width}x${candidate.dimensions.height}`
      : '-';
    const psnr = candidate.similarityToCoordinateImage?.psnr ?? '-';

    lines.push([
      markdownEscape(candidate.source),
      markdownEscape(candidate.assetKind),
      markdownEscape(candidate.contentType ?? '-'),
      markdownEscape(size),
      markdownEscape(candidate.sha256 ? candidate.sha256.slice(0, 12) : '-'),
      markdownEscape(psnr),
      markdownEscape(candidate.decision.status),
      markdownEscape(candidate.decision.reasons.join(', ') || '-'),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  });

  lines.push(
    '',
    '## Result',
    '',
    report.summary.runtimeSwapRecommended
      ? '- At least one operator-approved high-resolution or vector source is ready for static import review.'
      : '- No operator-approved high-resolution source was found. Keep the current coordinate image and mapVersion unchanged.',
    '- Runtime hotlinking is not allowed; approved assets must be committed as static files before data metadata is updated.',
    '',
  );

  return lines.join('\n');
}

async function main() {
  const reportDir = path.resolve(frontendRoot, flagValue('--report-dir', defaultReportDir));
  const evidenceDir = path.join(reportDir, 'evidence');
  const urls = flagValues('--url');
  const files = flagValues('--file');
  const sourceLabel = flagValue('--source-label', null);
  const candidates = [];

  if (urls.length === 0 && files.length === 0) {
    OFFICIAL_PUBLIC_CANDIDATE_URLS.forEach((source) => {
      candidates.push({
        kind: 'url',
        source,
        sourceLabel: 'Lotte Giants public official source candidate',
      });
    });
  } else {
    urls.forEach((source) => {
      candidates.push({
        kind: 'url',
        source,
        sourceLabel: sourceLabel ?? 'Operator-provided official URL candidate',
      });
    });
    files.forEach((source) => {
      candidates.push({
        kind: 'file',
        source,
        sourceLabel,
      });
    });
  }

  await fs.mkdir(evidenceDir, { recursive: true });

  const candidateResults = [];
  for (const candidate of candidates) {
    candidateResults.push(await auditCandidate(candidate, evidenceDir));
  }

  const report = {
    auditVersion: 'SAJIK_SOURCE_AUDIT_V1',
    generatedAt: new Date().toISOString(),
    coordinateImage: {
      path: SAJIK_SEATMAP_IMAGE.imagePath,
      width: referenceWidth,
      height: referenceHeight,
      viewBox: SAJIK_SEATMAP_IMAGE.viewBox,
      sha256: SAJIK_SEATMAP_IMAGE.imageSha256,
      sourceUrl: SAJIK_SEATMAP_IMAGE.sourceUrl,
      sourceLabel: SAJIK_SEATMAP_IMAGE.sourceLabel,
      mapVersion: SAJIK_SEATMAP_IMAGE.mapVersion,
    },
    policy: {
      allowedUrlHosts: ['giantsclub.com', '*.giantsclub.com', 'ticketlink.co.kr', '*.ticketlink.co.kr'],
      acceptsRuntimeHotlink: false,
      requiresOperatorApprovalForRuntimeSwap: true,
      keepsCoordinateViewBox: SAJIK_SEATMAP_IMAGE.viewBox,
    },
    summary: {
      totalCandidates: candidateResults.length,
      approvedForStaticImport: candidateResults.filter((candidate) => candidate.decision.status === 'APPROVED_FOR_STATIC_IMPORT').length,
      reviewRequired: candidateResults.filter((candidate) => candidate.decision.status.startsWith('REVIEW_REQUIRED')).length,
      rejected: candidateResults.filter((candidate) => candidate.decision.status === 'REJECTED').length,
      runtimeSwapRecommended: candidateResults.some((candidate) => candidate.decision.status === 'APPROVED_FOR_STATIC_IMPORT'),
    },
    candidates: candidateResults,
  };

  const jsonPath = path.join(reportDir, 'sajik-seatmap-source-audit.json');
  const markdownPath = path.join(reportDir, 'sajik-seatmap-source-audit.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(markdownPath, buildMarkdown(report));

  console.log(`Wrote ${path.relative(frontendRoot, jsonPath)}`);
  console.log(`Wrote ${path.relative(frontendRoot, markdownPath)}`);
  console.log(`approvedForStaticImport=${report.summary.approvedForStaticImport} reviewRequired=${report.summary.reviewRequired} rejected=${report.summary.rejected}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
