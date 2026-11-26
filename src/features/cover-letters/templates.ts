import type { CoverLetter, LetterTemplateId } from '@/types/cover-letter';
import type { FontId } from '@/types/resume';

type LetterTemplate = {
  /** Shown as it is in both interface languages, like resume template names. */
  name: string;
  /** Page margin in millimetres, shared by the preview, the print rule and Word. */
  margin: number;
  /** Typefaces that suit the layout. The first is its own. */
  fonts: [FontId, ...FontId[]];
  /** Whether the writer can choose an accent colour. */
  accent: boolean;
};

export const LETTER_TEMPLATES: Record<LetterTemplateId, LetterTemplate> = {
  classic: {
    name: 'Classic Professional',
    margin: 25,
    fonts: ['source-serif', 'lora'],
    accent: false,
  },
  modern: {
    name: 'Modern Executive',
    margin: 18,
    fonts: ['plex', 'inter', 'manrope'],
    accent: true,
  },
  minimal: {
    name: 'Minimal Elegant',
    margin: 20,
    fonts: ['source-sans', 'inter', 'manrope'],
    accent: false,
  },
};

export function letterFont({ template, fonts }: Pick<CoverLetter, 'template' | 'fonts'>) {
  const allowed = LETTER_TEMPLATES[template].fonts;
  const chosen = fonts[template];
  return chosen && allowed.includes(chosen) ? chosen : allowed[0];
}
