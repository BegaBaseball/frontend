import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const outputRoot = path.resolve(frontendRoot, '..', 'output/playwright');
const imagePath = path.resolve(
  frontendRoot,
  'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
);
const reportPath = path.join(outputRoot, 'daejeon-seatmap-pixel-components.json');

const colorRanges = [
  {
    name: 'first_infield_blue',
    minArea: 240,
    test: (r, g, b) => r >= 35 && r <= 115 && g >= 50 && g <= 120 && b >= 60 && b <= 145,
  },
  {
    name: 'third_infield_magenta',
    minArea: 260,
    test: (r, g, b) => r >= 115 && r <= 180 && g >= 20 && g <= 90 && b >= 80 && b <= 145,
  },
  {
    name: 'outfield_lawn_green',
    minArea: 800,
    test: (r, g, b) => r >= 55 && r <= 135 && g >= 90 && g <= 160 && b >= 45 && b <= 110,
  },
  {
    name: 'seat_olive',
    minArea: 240,
    test: (r, g, b) => r >= 95 && r <= 160 && g >= 105 && g <= 170 && b >= 45 && b <= 115,
  },
  {
    name: 'yellow_200',
    minArea: 300,
    test: (r, g, b) => r >= 190 && r <= 255 && g >= 115 && g <= 190 && b >= 25 && b <= 95,
  },
  {
    name: 'orange_400_or_table',
    minArea: 300,
    test: (r, g, b) => r >= 185 && r <= 255 && g >= 45 && g <= 160 && b >= 15 && b <= 95,
  },
  {
    name: 'brown_509',
    minArea: 300,
    test: (r, g, b) => r >= 110 && r <= 175 && g >= 55 && g <= 115 && b >= 35 && b <= 90,
  },
  {
    name: 'red_outfield_table',
    minArea: 240,
    test: (r, g, b) => r >= 125 && r <= 210 && g >= 25 && g <= 85 && b >= 30 && b <= 90,
  },
];

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

async function decodeRgbaPng(filePath) {
  const buffer = await fs.readFile(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`Not a PNG file: ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}`);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const rgba = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;

    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const up = previous[index];
      const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
      if (filter === 1) {
        row[index] = (row[index] + left) & 0xff;
      } else if (filter === 2) {
        row[index] = (row[index] + up) & 0xff;
      } else if (filter === 3) {
        row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        row[index] = (row[index] + paethPredictor(left, up, upLeft)) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG row filter: ${filter}`);
      }
    }

    row.copy(rgba, y * stride);
    previous = row;
  }

  return { width, height, data: rgba };
}

function connectedComponents(mask, width, height, minArea) {
  const seen = new Uint8Array(width * height);
  const components = [];
  const queue = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;

    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    const boundaryPoints = [];
    queue.length = 0;
    queue.push(start);
    seen[start] = 1;

    while (queue.length > 0) {
      const current = queue.pop();
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];
      if (neighbors.some((next) => next < 0 || !mask[next])) {
        boundaryPoints.push([x, y]);
      }
      for (const next of neighbors) {
        if (next < 0 || seen[next] || !mask[next]) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }

    if (area >= minArea) {
      components.push({
        area,
        bbox: { minX, minY, maxX, maxY },
        center: {
          x: Number((sumX / area).toFixed(1)),
          y: Number((sumY / area).toFixed(1)),
        },
        hull: convexHull(boundaryPoints),
      });
    }
  }

  components.sort((a, b) => b.area - a.area);
  return components;
}

function convexHull(points) {
  const sorted = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length <= 1) return sorted;

  const cross = (origin, a, b) => (
    (a[0] - origin[0]) * (b[1] - origin[1])
    - (a[1] - origin[1]) * (b[0] - origin[0])
  );
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

const imageData = await decodeRgbaPng(imagePath);

const { width, height } = imageData;
const pixels = imageData.data;
const report = {
  image: { width, height, source: imagePath },
  ranges: {},
};

for (const range of colorRanges) {
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    const a = pixels[offset + 3];
    if (a > 200 && range.test(r, g, b)) {
      mask[index] = 1;
    }
  }
  report.ranges[range.name] = connectedComponents(mask, width, height, range.minArea).slice(0, 80);
}

await fs.mkdir(outputRoot, { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`pixel_components:${reportPath}`);
