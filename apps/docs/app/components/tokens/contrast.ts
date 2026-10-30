/**
 * WCAG 2 contrast of the color roles, from their values in `docs.json`: `oklch()` colors inside
 * sRGB, converted to linear sRGB for the relative luminance. `packages/tokens/src/contrast.test.ts`
 * measures the same pairs with culori and fails when a role misses its target.
 */

interface Oklch {
  readonly lightness: number;
  readonly chroma: number;
  /** In degrees. */
  readonly hue: number;
  readonly alpha: number;
}

const OKLCH =
  /^oklch\(\s*(?<l>[\d.]+)\s+(?<c>[\d.]+)\s+(?<h>[\d.]+)\s*(?:\/\s*(?<a>[\d.]+)\s*)?\)$/u;

function parseOklch(value: string): Oklch | undefined {
  const groups = OKLCH.exec(value.trim())?.groups;
  if (groups === undefined) {
    return undefined;
  }
  return {
    lightness: Number(groups['l']),
    chroma: Number(groups['c']),
    hue: Number(groups['h']),
    alpha: groups['a'] === undefined ? 1 : Number(groups['a']),
  };
}

/** Linear sRGB channels of an OKLCH color, through OKLab (Björn Ottosson's matrices). */
function linearSrgb({ lightness, chroma, hue }: Oklch): readonly [number, number, number] {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
  const m = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
  const s = (lightness - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3;
  return [
    4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s,
    -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s,
    -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s,
  ];
}

const clip = (channel: number): number => Math.min(1, Math.max(0, channel));

/** WCAG relative luminance: the linear channels weighted for the eye. */
function luminance(color: Oklch): number {
  const [red, green, blue] = linearSrgb(color);
  return 0.2126 * clip(red) + 0.7152 * clip(green) + 0.0722 * clip(blue);
}

/**
 * The WCAG 2 contrast ratio of two opaque `oklch()` colors, from 1 to 21. `undefined` for any other
 * value: a translucent color has no contrast of its own.
 */
export function contrastRatio(foreground: string, background: string): number | undefined {
  const front = parseOklch(foreground);
  const back = parseOklch(background);
  if (front === undefined || back === undefined || front.alpha < 1 || back.alpha < 1) {
    return undefined;
  }
  const lighter = Math.max(luminance(front), luminance(back));
  const darker = Math.min(luminance(front), luminance(back));
  return (lighter + 0.05) / (darker + 0.05);
}

/** A ratio as WCAG reads it, `4.5:1`, cut (never rounded up) to one decimal. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
}

/** What text in a ratio passes: AAA from 7:1, AA from 4.5:1, AA for large text only from 3:1. */
export function contrastLevel(ratio: number): string {
  if (ratio >= 7) {
    return 'AAA';
  }
  if (ratio >= 4.5) {
    return 'AA';
  }
  return ratio >= 3 ? 'AA large text' : 'fails';
}

/** Where a text role is read, and the ratio the tokens promise there. */
export interface TextContrast {
  /** The least ratio the token tests allow; `null` for disabled text, which WCAG exempts. */
  readonly target: number | null;
  /** The backgrounds it sits on, as color roles: `bg.surface`, `accent.bg`. */
  readonly backgrounds: readonly string[];
}

/** The foreground roles, each on the layers it is meant for. */
const FOREGROUNDS: Readonly<Record<string, TextContrast>> = {
  'fg.default': { target: 7, backgrounds: ['bg.canvas', 'bg.surface', 'bg.raised'] },
  'fg.muted': { target: 4.5, backgrounds: ['bg.surface', 'bg.raised'] },
  'fg.subtle': { target: 3, backgrounds: ['bg.surface', 'bg.inset'] },
  'fg.disabled': { target: null, backgrounds: ['bg.surface'] },
};

/**
 * The text pairs of `contrast.test.ts` for a color role (`fg.muted`, `danger.fg`,
 * `syntax.keyword`): the foregrounds on their layers, a status color's text on its own background
 * and on a surface, its label on its fill, and code on the code block background. `undefined` for
 * a role that is not text.
 */
export function textContrastOf(role: string): TextContrast | undefined {
  const own = FOREGROUNDS[role];
  if (own !== undefined) {
    return own;
  }
  const [group = '', name = ''] = role.split('.');
  if (group === 'syntax') {
    return { target: 4.5, backgrounds: ['bg.inset'] };
  }
  if (name === 'fg') {
    return { target: 4.5, backgrounds: [`${group}.bg`, 'bg.surface'] };
  }
  if (name === 'on-fill') {
    return { target: 4.5, backgrounds: [`${group}.fill`] };
  }
  return undefined;
}
