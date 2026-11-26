import type { FontId } from '@/types/resume';

/** Each family is self hosted (see app/fonts.css). Khmer glyphs fall through to Noto Khmer. */
export const RESUME_FONTS: Record<FontId, { name: string; family: string; serif: boolean }> = {
  inter: { name: 'Inter', family: 'Inter', serif: false },
  'source-sans': { name: 'Source Sans 3', family: 'Source Sans 3', serif: false },
  'source-serif': { name: 'Source Serif 4', family: 'Source Serif 4', serif: true },
  lora: { name: 'Lora', family: 'Lora', serif: true },
  plex: { name: 'IBM Plex Sans', family: 'IBM Plex Sans', serif: false },
  manrope: { name: 'Manrope', family: 'Manrope', serif: false },
};

export function fontStack(id: FontId) {
  const font = RESUME_FONTS[id];
  return font.serif
    ? `'${font.family}', 'Noto Serif Khmer', 'Noto Sans Khmer', Georgia, serif`
    : `'${font.family}', 'Noto Sans Khmer', Arial, sans-serif`;
}
