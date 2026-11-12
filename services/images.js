import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invalid } from './validation.js';

export const uploadDirectory = resolve(process.env.UPLOAD_DIR || fileURLToPath(new URL('../uploads/', import.meta.url)));
export async function storePhoto(value) {
  if (!value) return null;
  if (typeof value !== 'string') throw invalid('Invalid photo');
  if (/^\/uploads\/[a-f0-9]{64}\.jpg$/.test(value)) return value;
  if (/^https?:\/\//.test(value)) {
    try { new URL(value); } catch { throw invalid('Invalid photo URL'); }
    return value;
  }
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw invalid('Photo must be a JPEG, PNG, WebP, or HTTP image URL');
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.length > 5 * 1024 * 1024) throw invalid('Photo must be at most 5 MB');
  let image;
  try {
    image = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  } catch { throw invalid('Photo could not be decoded'); }
  const name = createHash('sha256').update(image).digest('hex') + '.jpg';
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(join(uploadDirectory, name), image);
  return '/uploads/' + name;
}
