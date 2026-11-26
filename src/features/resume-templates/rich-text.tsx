import type { ReactNode } from 'react';
import { safeHref } from '@/lib/url';

export type RichLine = { type: 'p' | 'li'; text: string };

const SENTENCE_LIMIT = 520;
/** No single block may grow past this, or it could be taller than a page and be cut off. */
export const BLOCK_LIMIT = 1200;

/** Last resort for text without sentence ends: cut at a space, else between words. */
function hardSplit(text: string): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > BLOCK_LIMIT) {
    let cut = rest.lastIndexOf(' ', BLOCK_LIMIT);
    if (cut < BLOCK_LIMIT / 2) {
      // Khmer runs words together, so ask the browser where they end.
      const words = new Intl.Segmenter(undefined, { granularity: 'word' });
      const start = words.segment(rest).containing(BLOCK_LIMIT)?.index ?? 0;
      cut = start > BLOCK_LIMIT / 2 ? start : BLOCK_LIMIT;
    }
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return [...chunks, rest].filter(Boolean);
}

/** Very long paragraphs are split at sentence ends so they can flow across pages. */
function splitLong(text: string): string[] {
  if (text.length <= SENTENCE_LIMIT) return [text];
  const parts = text.split(/(?<=[.!?។៕]\s)/u);
  const chunks: string[] = [];
  for (const part of parts) {
    const last = chunks[chunks.length - 1];
    if (last !== undefined && last.length + part.length <= SENTENCE_LIMIT) {
      chunks[chunks.length - 1] = last + part;
    } else chunks.push(part);
  }
  return chunks.flatMap((chunk) => hardSplit(chunk.trim()));
}

/** A small, safe markup: "- " bullets, **bold**, *italic* and [text](url). */
export function parseRich(source: string): RichLine[] {
  return source.split(/\r?\n/).flatMap((raw): RichLine[] => {
    const line = raw.trim();
    if (!line) return [];
    const bullet = /^(?:[-•*])\s+(.*)$/.exec(line);
    if (bullet) {
      return hardSplit(bullet[1]?.trim() ?? '').map((text, i) => ({
        type: i ? 'p' : 'li',
        text,
      }));
    }
    return splitLong(line).map((text) => ({ type: 'p', text }));
  });
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string): ReactNode {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]!);
      return href ? (
        <a key={index} href={href} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      ) : (
        link[1]
      );
    }
    return part;
  });
}

export function stripRich(source: string) {
  return parseRich(source)
    .map((line) => line.text.replace(/\*\*|\*|\[([^\]]+)\]\([^)]+\)/g, '$1'))
    .join('\n');
}
