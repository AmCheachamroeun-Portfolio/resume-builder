export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const PHOTO_SIZE = 480;

export type PhotoError = 'type' | 'size' | 'decode';

export function checkPhoto(file: { type: string; size: number }): PhotoError | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'type';
  if (file.size > PHOTO_MAX_BYTES) return 'size';
  return null;
}

/**
 * Centre-crops to a square and re-encodes. Re-encoding also strips metadata such
 * as GPS position from the original file.
 */
export async function preparePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(PHOTO_SIZE, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no-canvas');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, size, size);
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.88);
}
