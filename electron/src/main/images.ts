// Image storage on disk. Mirrors src/Models/ImageStorage.swift semantics:
// files live in userData/Images/ and are referenced by filename only.

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

let imagesDir: string | null = null;

export function initImagesDir(dir: string): void {
  imagesDir = dir;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function getImagesDir(): string {
  if (!imagesDir) throw new Error('Images directory not initialized');
  return imagesDir;
}

/** Sniff a file extension from the first few magic bytes. */
export function detectExtension(data: Buffer): string {
  if (data.length >= 4) {
    // PNG: 89 50 4E 47
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'png';
    // JPEG: FF D8 FF
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg';
    // GIF: 47 49 46 38
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) return 'gif';
    // HEIC/HEIF: 'ftypheic' / 'ftypheif' / 'ftypmif1' at offset 4
    if (
      data.length >= 12 &&
      data[4] === 0x66 &&
      data[5] === 0x74 &&
      data[6] === 0x79 &&
      data[7] === 0x70
    ) {
      const brand = data.subarray(8, 12).toString('ascii');
      if (brand === 'heic' || brand === 'heif' || brand === 'mif1') return 'heic';
    }
    // TIFF: 49 49 2A 00 or 4D 4D 00 2A
    if (
      (data[0] === 0x49 && data[1] === 0x49 && data[2] === 0x2a && data[3] === 0x00) ||
      (data[0] === 0x4d && data[1] === 0x4d && data[2] === 0x00 && data[3] === 0x2a)
    ) {
      return 'tiff';
    }
  }
  return 'jpg';
}

export function generateFilename(ext: string): string {
  return `${randomUUID()}.${ext}`;
}

export function saveImageBuffer(data: Buffer, filename?: string): string {
  const dir = getImagesDir();
  const name = filename ?? generateFilename(detectExtension(data));
  writeFileSync(join(dir, name), data);
  return name;
}

export function loadImageBuffer(filename: string): Buffer | null {
  const dir = getImagesDir();
  const path = join(dir, filename);
  if (!existsSync(path)) return null;
  return readFileSync(path);
}

export function imageExists(filename: string): boolean {
  return existsSync(join(getImagesDir(), filename));
}

export function deleteImage(filename: string): void {
  const path = join(getImagesDir(), filename);
  if (existsSync(path)) unlinkSync(path);
}
