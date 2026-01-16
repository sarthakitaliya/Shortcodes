/**
 * Generate simple PNG icons for the Chrome extension
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createSimplePNG(size) {
    const width = size;
    const height = size;

    // Purple gradient colors
    const r = 0x76, g = 0x4b, b = 0xa2;

    // Create raw pixel data (filter byte + RGBA for each pixel per row)
    const rawPixels = Buffer.alloc((1 + width * 4) * height);
    let offset = 0;

    for (let y = 0; y < height; y++) {
        rawPixels[offset++] = 0; // filter byte
        for (let x = 0; x < width; x++) {
            // Create a simple gradient effect
            const factor = 1 - (x + y) / (width + height) * 0.3;
            rawPixels[offset++] = Math.floor(r * factor);
            rawPixels[offset++] = Math.floor(g * factor);
            rawPixels[offset++] = Math.floor(b * factor);
            rawPixels[offset++] = 255; // alpha
        }
    }

    return createPNG(width, height, rawPixels);
}

function createPNG(width, height, rawPixels) {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(8, 8); // bit depth
    ihdr.writeUInt8(6, 9); // color type (RGBA)
    ihdr.writeUInt8(0, 10); // compression
    ihdr.writeUInt8(0, 11); // filter
    ihdr.writeUInt8(0, 12); // interlace

    const ihdrChunk = createChunk('IHDR', ihdr);

    // IDAT chunk (compressed pixel data)
    const compressed = deflateSync(rawPixels);
    const idatChunk = createChunk('IDAT', compressed);

    // IEND chunk
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type);
    const crc = crc32(Buffer.concat([typeBuffer, data]));

    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
    let crc = 0xFFFFFFFF;
    const table = getCRC32Table();

    for (let i = 0; i < buffer.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function getCRC32Table() {
    const table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        }
        table.push(c);
    }
    return table;
}

// Generate icons
const sizes = [16, 48, 128];
const outputDir = join(__dirname, '..', 'public', 'icons');

if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
}

for (const size of sizes) {
    const png = createSimplePNG(size);
    const outputPath = join(outputDir, `icon${size}.png`);
    writeFileSync(outputPath, png);
    console.log('Created ' + outputPath);
}

console.log('Done generating icons');
