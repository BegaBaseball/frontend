/*
 * Adapted from qr.js / qrcode-generator under the MIT License.
 *
 * Copyright (c) 2009 Kazuhiko Arase <kazuhiko.arase@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

const textEncoder = new TextEncoder();

const MODE_8BIT_BYTE = 1 << 2;

const ERROR_CORRECT_LEVEL_MAP: Record<QrErrorCorrectionLevel, number> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

const PATTERN_POSITION_TABLE: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

const PAD0 = 0xec;
const PAD1 = 0x11;

const EXP_TABLE = new Array<number>(256);
const LOG_TABLE = new Array<number>(256);

for (let index = 0; index < 8; index += 1) {
  EXP_TABLE[index] = 1 << index;
}

for (let index = 8; index < 256; index += 1) {
  EXP_TABLE[index] =
    EXP_TABLE[index - 4]
    ^ EXP_TABLE[index - 5]
    ^ EXP_TABLE[index - 6]
    ^ EXP_TABLE[index - 8];
}

for (let index = 0; index < 255; index += 1) {
  LOG_TABLE[EXP_TABLE[index]] = index;
}

const RS_BLOCK_TABLE: number[][] = [
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
  [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
  [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
  [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
  [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
  [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
  [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
  [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12],
  [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
  [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
  [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
  [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
  [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
  [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
  [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
  [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
  [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
  [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
  [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
  [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
  [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
  [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
  [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
  [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
  [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
  [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
  [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
  [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
  [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
  [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
  [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
  [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
  [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16],
];

class Qr8BitByte {
  public readonly mode = MODE_8BIT_BYTE;

  public readonly bytes: Uint8Array;

  public constructor(data: string) {
    this.bytes = textEncoder.encode(data);
  }

  public getLength() {
    return this.bytes.length;
  }

  public write(buffer: QrBitBuffer) {
    for (const byte of this.bytes) {
      buffer.put(byte, 8);
    }
  }
}

class QrBitBuffer {
  public readonly buffer: number[] = [];

  private bitLength = 0;

  public put(num: number, length: number) {
    for (let index = 0; index < length; index += 1) {
      this.putBit(((num >>> (length - index - 1)) & 1) === 1);
    }
  }

  public getLengthInBits() {
    return this.bitLength;
  }

  public putBit(bit: boolean) {
    const bufferIndex = Math.floor(this.bitLength / 8);

    if (this.buffer.length <= bufferIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufferIndex] |= 0x80 >>> (this.bitLength % 8);
    }

    this.bitLength += 1;
  }
}

class QrPolynomial {
  private readonly values: number[];

  public constructor(num: number[], shift: number) {
    if (!Array.isArray(num)) {
      throw new Error(`Invalid polynomial source: ${String(num)}`);
    }

    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset += 1;
    }

    this.values = new Array(num.length - offset + shift).fill(0);
    for (let index = 0; index < num.length - offset; index += 1) {
      this.values[index] = num[index + offset];
    }
  }

  public get(index: number) {
    return this.values[index] ?? 0;
  }

  public getLength() {
    return this.values.length;
  }

  public multiply(other: QrPolynomial) {
    const num = new Array(this.getLength() + other.getLength() - 1).fill(0);

    for (let index = 0; index < this.getLength(); index += 1) {
      for (let innerIndex = 0; innerIndex < other.getLength(); innerIndex += 1) {
        num[index + innerIndex] ^= gexp(glog(this.get(index)) + glog(other.get(innerIndex)));
      }
    }

    return new QrPolynomial(num, 0);
  }

  public mod(other: QrPolynomial): QrPolynomial {
    if (this.getLength() - other.getLength() < 0) {
      return this;
    }

    const ratio = glog(this.get(0)) - glog(other.get(0));
    const num = new Array(this.getLength()).fill(0);

    for (let index = 0; index < this.getLength(); index += 1) {
      num[index] = this.get(index);
    }

    for (let index = 0; index < other.getLength(); index += 1) {
      num[index] ^= gexp(glog(other.get(index)) + ratio);
    }

    return new QrPolynomial(num, 0).mod(other);
  }
}

class QrRsBlock {
  public readonly totalCount: number;

  public readonly dataCount: number;

  public constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
}

class QrCode {
  public typeNumber: number;

  public readonly errorCorrectLevel: number;

  public modules: Array<Array<boolean | null>> = [];

  private moduleCount = 0;

  private dataCache: number[] | null = null;

  private readonly dataList: Qr8BitByte[] = [];

  public constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  public addData(data: string) {
    this.dataList.push(new Qr8BitByte(data));
    this.dataCache = null;
  }

  public isDark(row: number, col: number) {
    if (row < 0 || row >= this.moduleCount || col < 0 || col >= this.moduleCount) {
      throw new Error(`${row},${col}`);
    }

    return this.modules[row][col] === true;
  }

  public getModuleCount() {
    return this.moduleCount;
  }

  public make() {
    if (this.typeNumber < 1) {
      let resolvedTypeNumber = 1;

      for (; resolvedTypeNumber < 40; resolvedTypeNumber += 1) {
        const rsBlocks = getRsBlocks(resolvedTypeNumber, this.errorCorrectLevel);
        const buffer = new QrBitBuffer();
        let totalDataCount = 0;

        for (const block of rsBlocks) {
          totalDataCount += block.dataCount;
        }

        for (const data of this.dataList) {
          buffer.put(data.mode, 4);
          buffer.put(data.getLength(), getLengthInBits(data.mode, resolvedTypeNumber));
          data.write(buffer);
        }

        if (buffer.getLengthInBits() <= totalDataCount * 8) {
          break;
        }
      }

      this.typeNumber = resolvedTypeNumber;
    }

    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);

    for (let row = 0; row < this.moduleCount; row += 1) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    if (!this.dataCache) {
      this.dataCache = QrCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }

    this.mapData(this.dataCache, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let rowOffset = -1; rowOffset <= 7; rowOffset += 1) {
      if (row + rowOffset <= -1 || row + rowOffset >= this.moduleCount) {
        continue;
      }

      for (let colOffset = -1; colOffset <= 7; colOffset += 1) {
        if (col + colOffset <= -1 || col + colOffset >= this.moduleCount) {
          continue;
        }

        const shouldFill =
          ((0 <= rowOffset && rowOffset <= 6) && (colOffset === 0 || colOffset === 6))
          || ((0 <= colOffset && colOffset <= 6) && (rowOffset === 0 || rowOffset === 6))
          || ((2 <= rowOffset && rowOffset <= 4) && (2 <= colOffset && colOffset <= 4));

        this.modules[row + rowOffset][col + colOffset] = shouldFill;
      }
    }
  }

  private getBestMaskPattern() {
    let minLostPoint = 0;
    let pattern = 0;

    for (let maskPattern = 0; maskPattern < 8; maskPattern += 1) {
      this.makeImpl(true, maskPattern);
      const lostPoint = getLostPoint(this);

      if (maskPattern === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = maskPattern;
      }
    }

    return pattern;
  }

  private setupTimingPattern() {
    for (let row = 8; row < this.moduleCount - 8; row += 1) {
      if (this.modules[row][6] !== null) {
        continue;
      }
      this.modules[row][6] = row % 2 === 0;
    }

    for (let col = 8; col < this.moduleCount - 8; col += 1) {
      if (this.modules[6][col] !== null) {
        continue;
      }
      this.modules[6][col] = col % 2 === 0;
    }
  }

  private setupPositionAdjustPattern() {
    const positions = getPatternPosition(this.typeNumber);

    for (const row of positions) {
      for (const col of positions) {
        if (this.modules[row][col] !== null) {
          continue;
        }

        for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
          for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
            const shouldFill =
              rowOffset === -2
              || rowOffset === 2
              || colOffset === -2
              || colOffset === 2
              || (rowOffset === 0 && colOffset === 0);

            this.modules[row + rowOffset][col + colOffset] = shouldFill;
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean) {
    const bits = getBchTypeNumber(this.typeNumber);

    for (let index = 0; index < 18; index += 1) {
      const moduleValue = !test && ((bits >> index) & 1) === 1;
      this.modules[Math.floor(index / 3)][(index % 3) + this.moduleCount - 11] = moduleValue;
    }

    for (let index = 0; index < 18; index += 1) {
      const moduleValue = !test && ((bits >> index) & 1) === 1;
      this.modules[(index % 3) + this.moduleCount - 11][Math.floor(index / 3)] = moduleValue;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number) {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = getBchTypeInfo(data);

    for (let index = 0; index < 15; index += 1) {
      const moduleValue = !test && ((bits >> index) & 1) === 1;

      if (index < 6) {
        this.modules[index][8] = moduleValue;
      } else if (index < 8) {
        this.modules[index + 1][8] = moduleValue;
      } else {
        this.modules[this.moduleCount - 15 + index][8] = moduleValue;
      }
    }

    for (let index = 0; index < 15; index += 1) {
      const moduleValue = !test && ((bits >> index) & 1) === 1;

      if (index < 8) {
        this.modules[8][this.moduleCount - index - 1] = moduleValue;
      } else if (index < 9) {
        this.modules[8][15 - index] = moduleValue;
      } else {
        this.modules[8][14 - index] = moduleValue;
      }
    }

    this.modules[this.moduleCount - 8][8] = !test;
  }

  private mapData(data: number[], maskPattern: number) {
    let direction = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) {
        col -= 1;
      }

      while (true) {
        for (let colOffset = 0; colOffset < 2; colOffset += 1) {
          if (this.modules[row][col - colOffset] !== null) {
            continue;
          }

          let dark = false;
          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
          }

          if (getMask(maskPattern, row, col - colOffset)) {
            dark = !dark;
          }

          this.modules[row][col - colOffset] = dark;
          bitIndex -= 1;

          if (bitIndex === -1) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }

        row += direction;

        if (row < 0 || row >= this.moduleCount) {
          row -= direction;
          direction = -direction;
          break;
        }
      }
    }
  }

  private static createData(typeNumber: number, errorCorrectLevel: number, dataList: Qr8BitByte[]) {
    const rsBlocks = getRsBlocks(typeNumber, errorCorrectLevel);
    const buffer = new QrBitBuffer();

    for (const data of dataList) {
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }

    let totalDataCount = 0;
    for (const block of rsBlocks) {
      totalDataCount += block.dataCount;
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error(`QR code length overflow (${buffer.getLengthInBits()}>${totalDataCount * 8})`);
    }

    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(false);
    }

    while (buffer.getLengthInBits() < totalDataCount * 8) {
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD1, 8);
    }

    return QrCode.createBytes(buffer, rsBlocks);
  }

  private static createBytes(buffer: QrBitBuffer, rsBlocks: QrRsBlock[]) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;

    const dcData: number[][] = new Array(rsBlocks.length);
    const ecData: number[][] = new Array(rsBlocks.length);

    for (let blockIndex = 0; blockIndex < rsBlocks.length; blockIndex += 1) {
      const block = rsBlocks[blockIndex];
      const dcCount = block.dataCount;
      const ecCount = block.totalCount - dcCount;

      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcData[blockIndex] = new Array(dcCount);

      for (let index = 0; index < dcCount; index += 1) {
        dcData[blockIndex][index] = 0xff & (buffer.buffer[index + offset] ?? 0);
      }

      offset += dcCount;

      const rsPolynomial = getErrorCorrectPolynomial(ecCount);
      const rawPolynomial = new QrPolynomial(dcData[blockIndex], rsPolynomial.getLength() - 1);
      const modPolynomial = rawPolynomial.mod(rsPolynomial);

      ecData[blockIndex] = new Array(rsPolynomial.getLength() - 1).fill(0);

      for (let index = 0; index < ecData[blockIndex].length; index += 1) {
        const modIndex = index + modPolynomial.getLength() - ecData[blockIndex].length;
        ecData[blockIndex][index] = modIndex >= 0 ? modPolynomial.get(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (const block of rsBlocks) {
      totalCodeCount += block.totalCount;
    }

    const data = new Array(totalCodeCount).fill(0);
    let index = 0;

    for (let dcIndex = 0; dcIndex < maxDcCount; dcIndex += 1) {
      for (let blockIndex = 0; blockIndex < rsBlocks.length; blockIndex += 1) {
        if (dcIndex < dcData[blockIndex].length) {
          data[index] = dcData[blockIndex][dcIndex];
          index += 1;
        }
      }
    }

    for (let ecIndex = 0; ecIndex < maxEcCount; ecIndex += 1) {
      for (let blockIndex = 0; blockIndex < rsBlocks.length; blockIndex += 1) {
        if (ecIndex < ecData[blockIndex].length) {
          data[index] = ecData[blockIndex][ecIndex];
          index += 1;
        }
      }
    }

    return data;
  }
}

const glog = (value: number) => {
  if (value < 1) {
    throw new Error(`glog(${value})`);
  }

  return LOG_TABLE[value];
};

const gexp = (value: number) => {
  let normalized = value;

  while (normalized < 0) {
    normalized += 255;
  }

  while (normalized >= 256) {
    normalized -= 255;
  }

  return EXP_TABLE[normalized];
};

const getBchDigit = (data: number) => {
  let digit = 0;
  let value = data;

  while (value !== 0) {
    digit += 1;
    value >>>= 1;
  }

  return digit;
};

const getBchTypeInfo = (data: number) => {
  let value = data << 10;

  while (getBchDigit(value) - getBchDigit(G15) >= 0) {
    value ^= G15 << (getBchDigit(value) - getBchDigit(G15));
  }

  return ((data << 10) | value) ^ G15_MASK;
};

const getBchTypeNumber = (data: number) => {
  let value = data << 12;

  while (getBchDigit(value) - getBchDigit(G18) >= 0) {
    value ^= G18 << (getBchDigit(value) - getBchDigit(G18));
  }

  return (data << 12) | value;
};

const getPatternPosition = (typeNumber: number) => PATTERN_POSITION_TABLE[typeNumber - 1] ?? [];

const getMask = (maskPattern: number, row: number, col: number) => {
  switch (maskPattern) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return ((((row * col) % 2) + ((row * col) % 3)) % 2) === 0;
    case 7: return ((((row * col) % 3) + ((row + col) % 2)) % 2) === 0;
    default:
      throw new Error(`Invalid QR mask pattern: ${maskPattern}`);
  }
};

const getErrorCorrectPolynomial = (errorCorrectLength: number) => {
  let polynomial = new QrPolynomial([1], 0);

  for (let index = 0; index < errorCorrectLength; index += 1) {
    polynomial = polynomial.multiply(new QrPolynomial([1, gexp(index)], 0));
  }

  return polynomial;
};

const getLengthInBits = (mode: number, type: number) => {
  if (type < 1 || type >= 41) {
    throw new Error(`Invalid QR type: ${type}`);
  }

  if (type < 10) {
    if (mode === MODE_8BIT_BYTE) {
      return 8;
    }
  } else if (type < 27) {
    if (mode === MODE_8BIT_BYTE) {
      return 16;
    }
  } else if (mode === MODE_8BIT_BYTE) {
    return 16;
  }

  throw new Error(`Unsupported QR mode: ${mode}`);
};

const getLostPoint = (qrCode: QrCode) => {
  const moduleCount = qrCode.getModuleCount();
  let lostPoint = 0;

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      let sameCount = 0;
      const dark = qrCode.isDark(row, col);

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        if (row + rowOffset < 0 || row + rowOffset >= moduleCount) {
          continue;
        }

        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (col + colOffset < 0 || col + colOffset >= moduleCount) {
            continue;
          }

          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          if (dark === qrCode.isDark(row + rowOffset, col + colOffset)) {
            sameCount += 1;
          }
        }
      }

      if (sameCount > 5) {
        lostPoint += 3 + sameCount - 5;
      }
    }
  }

  for (let row = 0; row < moduleCount - 1; row += 1) {
    for (let col = 0; col < moduleCount - 1; col += 1) {
      let count = 0;
      if (qrCode.isDark(row, col)) count += 1;
      if (qrCode.isDark(row + 1, col)) count += 1;
      if (qrCode.isDark(row, col + 1)) count += 1;
      if (qrCode.isDark(row + 1, col + 1)) count += 1;
      if (count === 0 || count === 4) {
        lostPoint += 3;
      }
    }
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount - 6; col += 1) {
      if (
        qrCode.isDark(row, col)
        && !qrCode.isDark(row, col + 1)
        && qrCode.isDark(row, col + 2)
        && qrCode.isDark(row, col + 3)
        && qrCode.isDark(row, col + 4)
        && !qrCode.isDark(row, col + 5)
        && qrCode.isDark(row, col + 6)
      ) {
        lostPoint += 40;
      }
    }
  }

  for (let col = 0; col < moduleCount; col += 1) {
    for (let row = 0; row < moduleCount - 6; row += 1) {
      if (
        qrCode.isDark(row, col)
        && !qrCode.isDark(row + 1, col)
        && qrCode.isDark(row + 2, col)
        && qrCode.isDark(row + 3, col)
        && qrCode.isDark(row + 4, col)
        && !qrCode.isDark(row + 5, col)
        && qrCode.isDark(row + 6, col)
      ) {
        lostPoint += 40;
      }
    }
  }

  let darkCount = 0;
  for (let col = 0; col < moduleCount; col += 1) {
    for (let row = 0; row < moduleCount; row += 1) {
      if (qrCode.isDark(row, col)) {
        darkCount += 1;
      }
    }
  }

  lostPoint += (Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5) * 10;

  return lostPoint;
};

const getRsBlockTable = (typeNumber: number, errorCorrectLevel: number) => {
  switch (errorCorrectLevel) {
    case ERROR_CORRECT_LEVEL_MAP.L:
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4];
    case ERROR_CORRECT_LEVEL_MAP.M:
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
    case ERROR_CORRECT_LEVEL_MAP.Q:
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
    case ERROR_CORRECT_LEVEL_MAP.H:
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
    default:
      return undefined;
  }
};

const getRsBlocks = (typeNumber: number, errorCorrectLevel: number) => {
  const rsBlock = getRsBlockTable(typeNumber, errorCorrectLevel);

  if (!rsBlock) {
    throw new Error(`Invalid RS block @ typeNumber=${typeNumber}, errorCorrectLevel=${errorCorrectLevel}`);
  }

  const list: QrRsBlock[] = [];

  for (let index = 0; index < rsBlock.length / 3; index += 1) {
    const count = rsBlock[index * 3];
    const totalCount = rsBlock[index * 3 + 1];
    const dataCount = rsBlock[index * 3 + 2];

    for (let repeat = 0; repeat < count; repeat += 1) {
      list.push(new QrRsBlock(totalCount, dataCount));
    }
  }

  return list;
};

export const createQrMatrix = (value: string, level: QrErrorCorrectionLevel = 'Q') => {
  const qrCode = new QrCode(-1, ERROR_CORRECT_LEVEL_MAP[level]);
  qrCode.addData(value);
  qrCode.make();

  return qrCode.modules.map((row) => row.map((cell) => cell === true));
};

export const createQrPath = (matrix: boolean[][]) => {
  const commands: string[] = [];

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) {
        continue;
      }

      commands.push(`M ${col} ${row} l 1 0 0 1 -1 0 Z`);
    }
  }

  return commands.join(' ');
};
