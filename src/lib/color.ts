function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Darkens a colour until it passes WCAG AA against the background. */
export function readableInk(color: string, background = '#ffffff', min = 4.5): string {
  let [r, g, b] = channels(color);
  let current = color;
  for (let step = 0; step < 30 && contrastRatio(current, background) < min; step++) {
    [r, g, b] = [r, g, b].map((c) => Math.floor(c * 0.9)) as [number, number, number];
    current = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
  return current;
}

/** Black or white, whichever reads better on the given fill. */
export function textOn(background: string) {
  return contrastRatio('#ffffff', background) >= contrastRatio('#14161a', background)
    ? '#ffffff'
    : '#14161a';
}
