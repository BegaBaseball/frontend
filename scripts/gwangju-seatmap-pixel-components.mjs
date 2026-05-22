import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const outDir = path.join(frontendRoot, 'reports/stadium');
const GWANGJU_SEATMAP_IMAGE = {
  imagePath: 'src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png',
};
const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);

const SEATMAP_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };

const PIXEL_GROUPS = [
  { id: 'k5', label: 'K5/K5-family salmon blocks', colors: [[243, 164, 144], [248, 196, 180]], threshold: 28, minArea: 80 },
  { id: 'k8', label: 'K8 yellow blocks', colors: [[251, 203, 112], [251, 226, 160]], threshold: 26, minArea: 80 },
  { id: 'k9', label: 'K9 green blocks', colors: [[186, 216, 122], [206, 226, 160]], threshold: 26, minArea: 80 },
  { id: 'sky-picnic', label: 'Sky picnic pink blocks', colors: [[239, 146, 181], [244, 180, 208]], threshold: 28, minArea: 20 },
  { id: 'five-table', label: '5F table blue-gray blocks', colors: [[208, 214, 236], [222, 226, 241], [204, 207, 228]], threshold: 20, minArea: 70 },
  { id: 'champion', label: 'Champion seats', colors: [[79, 189, 176]], threshold: 28, minArea: 200 },
  { id: 'central-table', label: 'Central table seats', colors: [[148, 213, 246]], threshold: 30, minArea: 200 },
  { id: 'accessible-green', label: 'Disabled seats', colors: [[35, 172, 56]], threshold: 28, minArea: 120 },
  { id: 'surprise', label: 'Surprise seats', colors: [[243, 152, 0]], threshold: 28, minArea: 180 },
  { id: 'family', label: 'Tigers family seats', colors: [[238, 130, 124]], threshold: 30, minArea: 180 },
  { id: 'party', label: 'Party seats', colors: [[223, 127, 110]], threshold: 26, minArea: 80 },
  { id: 'skybox', label: 'Skybox', colors: [[225, 131, 172]], threshold: 28, minArea: 50 },
  { id: 'outfield', label: 'Outfield seats', colors: [[220, 234, 186]], threshold: 22, minArea: 300 },
  { id: 'bleachers-table', label: 'Bleachers table seats', colors: [[144, 195, 31]], threshold: 30, minArea: 100 },
];

function colorDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function rgbAt(image, x, y) {
  const offset = ((y * image.width) + x) * image.channels;
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
}

function isGroupPixel(image, group, x, y) {
  const rgb = rgbAt(image, x, y);
  return group.colors.some((color) => colorDistance(rgb, color) <= group.threshold);
}

function extractComponents(image, group) {
  const bounds = group.bounds ?? SEATMAP_BOUNDS;
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const mask = new Uint8Array(width * height);
  const seen = new Uint8Array(width * height);

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (isGroupPixel(image, group, x, y)) {
        mask[((y - bounds.minY) * width) + (x - bounds.minX)] = 1;
      }
    }
  }

  const components = [];
  const queue = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
      if (!mask[startIndex] || seen[startIndex]) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      seen[startIndex] = 1;
      queue.length = 0;
      queue.push([x, y]);

      for (let head = 0; head < queue.length; head += 1) {
        const [cx, cy] = queue[head];
        area += 1;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;
          const index = ((ny - bounds.minY) * width) + (nx - bounds.minX);
          if (!mask[index] || seen[index]) continue;
          seen[index] = 1;
          queue.push([nx, ny]);
        }
      }

      if (area >= group.minArea && area <= (group.maxArea ?? Infinity)) {
        components.push({
          id: `${group.id}-${components.length + 1}`,
          groupId: group.id,
          groupLabel: group.label,
          area,
          bounds: { minX, minY, maxX, maxY },
          center: {
            x: Number(((minX + maxX) / 2).toFixed(1)),
            y: Number(((minY + maxY) / 2).toFixed(1)),
          },
        });
      }
    }
  }

  return components.sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX);
}

const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
const image = { data, width: info.width, height: info.height, channels: info.channels };
const groups = PIXEL_GROUPS.map((group) => ({
  ...group,
  components: extractComponents(image, group),
}));

const report = {
  generatedAt: new Date().toISOString(),
  image: {
    path: GWANGJU_SEATMAP_IMAGE.imagePath,
    width: info.width,
    height: info.height,
  },
  bounds: SEATMAP_BOUNDS,
  groups,
};

await fs.mkdir(outDir, { recursive: true });
const reportPath = path.join(outDir, 'gwangju-seatmap-pixel-components.json');
const temporaryReportPath = `${reportPath}.${process.pid}.tmp`;
await fs.writeFile(temporaryReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
try {
  await fs.rename(temporaryReportPath, reportPath);
} catch (error) {
  if (error?.code !== 'EPERM' && error?.code !== 'EACCES') {
    throw error;
  }
  await fs.unlink(reportPath).catch((unlinkError) => {
    if (unlinkError?.code !== 'ENOENT') throw unlinkError;
  });
  await fs.rename(temporaryReportPath, reportPath);
}

console.log(`pixel_components_json:${reportPath}`);
for (const group of groups) {
  console.log(`${group.id}: ${group.components.length}`);
}
