import { vars } from '@contour-ui/tokens';
import { describe, expect, it } from 'vite-plus/test';

import styles from './styles.css?raw';

import '@contour-ui/tokens/tokens.css';
import './styles.css';
import '@contour-ui/react/styles.css';

/** The cascade layers of the package, lowest first. */
const LAYERS = [
  'contour.fumadocs-base',
  'contour.fumadocs-prose',
  'contour.components',
  'contour.fumadocs',
] as const;

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/**
 * The layer whose rule wins for an element when each of `layers` has one, in reverse order: a
 * higher layer wins although its rule comes first.
 */
function winner(layers: readonly string[]): string {
  const style = document.createElement('style');
  style.textContent = layers
    .toReversed()
    .map((layer) => `@layer ${layer} { .layer-probe { --layer: '${layer}'; } }`)
    .join('\n');
  const probe = document.createElement('div');
  probe.className = 'layer-probe';
  document.head.append(style);
  document.body.append(probe);
  const layer = getComputedStyle(probe).getPropertyValue('--layer').trim();
  probe.remove();
  style.remove();
  return layer.slice(1, -1);
}

describe('styles.css', () => {
  it('starts with the full layer order, to fix it when it loads before @contour-ui/react', () => {
    const firstRule = styles
      .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
      .trim()
      .split(';')[0];

    expect(firstRule).toBe(`@layer ${LAYERS.join(', ')}`);
  });

  it('ranks the page base and Prose below the styled components, the docs ones above', () => {
    for (const [index, layer] of LAYERS.entries()) {
      const higher = LAYERS.slice(index + 1);
      for (const other of higher) {
        expect(winner([layer, other]), `${layer} < ${other}`).toBe(other);
      }
    }
  });

  it('gives the page its canvas, text and font', () => {
    const body = getComputedStyle(document.body);

    expect(body.backgroundColor).toBe(computed('background-color', vars.color.bg.canvas));
    expect(body.color).toBe(computed('color', vars.color.fg.default));
    expect(body.fontSize).toBe(computed('font-size', vars.text.body.fontSize));
    expect(body.margin).toBe('0px');
  });
});
