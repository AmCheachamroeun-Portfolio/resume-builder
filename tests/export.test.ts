import { describe, expect, it } from 'vitest';
import { detectBrowser } from '@/features/pdf-export/browser';

describe('print instructions', () => {
  const mac =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
  it.each([
    [`${mac} Version/18.0 Safari/605.1.15`, 0, 'safari'],
    [`${mac} Version/18.0 Safari/605.1.15`, 5, 'ios'],
    [`${mac} Chrome/140.0 Safari/537.36 Edg/140.0`, 0, 'chromium'],
    ['Mozilla/5.0 (Windows NT 10.0; rv:140.0) Gecko/20100101 Firefox/140.0', 0, 'firefox'],
    ['Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile Safari/537.36', 5, 'android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/140.0 Safari/604.1', 5, 'ios'],
  ])('recognises %s', (agent, touch, expected) => {
    expect(detectBrowser(agent, touch)).toBe(expected);
  });
});
