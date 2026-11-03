import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ARIA_ATTRIBUTES, ROLES } from '../shared/compat.ts';
import type { SharedElement } from '../shared/elements.ts';
import type { IdTexts } from './translate.ts';
import { focusableOf, NO_ID_TEXTS, nativeRoleOf, shapeProps, translateProps } from './translate.ts';
import { resetWarnings } from './warnings.ts';

beforeEach(() => {
  resetWarnings();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The props of the host, and whether the element hides. */
function translate(
  props: Readonly<Record<string, unknown>>,
  ids: IdTexts = NO_ID_TEXTS,
  element: SharedElement = 'div',
) {
  const out: Record<string, unknown> = {};
  const hidden = translateProps(element, props, ids, out);
  return { out, hidden };
}

describe('nativeRoleOf', () => {
  it('translates every role of the table, and none for none', () => {
    for (const [role, native] of Object.entries(ROLES)) {
      expect(nativeRoleOf('div', role)).toBe(native);
    }
    expect(nativeRoleOf('div', undefined)).toBeUndefined();
  });

  it('throws an error that names the element and the role', () => {
    expect(() => nativeRoleOf('span', 'listbox')).toThrow(
      'Primitive.span: role="listbox" has no twin on native platforms',
    );
    // Not a key of the table, though every object has it.
    expect(() => nativeRoleOf('div', 'constructor')).toThrow('role="constructor"');
    expect(() => nativeRoleOf('div', 3)).toThrow('role={number}');
  });
});

describe('translateProps', () => {
  it('turns ARIA into the accessibility props, each attribute as the table says', () => {
    const { out, hidden } = translate({
      role: 'slider',
      'aria-label': 'Gain',
      'aria-valuemin': 0,
      'aria-valuemax': '100',
      'aria-valuenow': 25,
      'aria-valuetext': '25 %',
      'aria-disabled': 'false',
      'aria-busy': true,
      'aria-readonly': true,
      'aria-orientation': 'vertical',
    });
    expect(out).toEqual({
      accessibilityRole: 'adjustable',
      accessibilityLabel: 'Gain',
      accessibilityValue: { min: 0, max: 100, now: 25, text: '25 %' },
      accessibilityState: { disabled: false, busy: true },
    });
    expect(hidden).toBe(false);
  });

  it('knows every attribute of the table, warning about none', () => {
    const warn = vi.spyOn(console, 'warn');
    const all = Object.fromEntries(Object.keys(ARIA_ATTRIBUTES).map((name) => [name, 'true']));
    translate(all);
    expect(warn).not.toHaveBeenCalled();
  });

  it('gives no undefined, and passes the props of the host as they are', () => {
    const onPointerDown = vi.fn<() => void>();
    const { out } = translate({
      'aria-label': undefined,
      'aria-valuenow': 'x',
      debugId: 'probe',
      onPointerDown,
      style: undefined,
    });
    expect(out).toStrictEqual({ debugId: 'probe', onPointerDown });
  });

  it('leaves the props of the host itself to it', () => {
    const { out } = translate({
      id: 'gain',
      tabIndex: 0,
      children: 'Gain',
      ref: () => undefined,
      textStyle: { color: 'red' },
    });
    expect(out).toEqual({});
  });

  it('lets a prop of the host win over a translated one', () => {
    const { out } = translate({ 'aria-label': 'Web', accessibilityLabel: 'Native' });
    expect(out).toEqual({ accessibilityLabel: 'Native' });
  });

  it('takes the text of aria-labelledby over aria-label, and aria-describedby as a hint', () => {
    const { out } = translate(
      { 'aria-label': 'Own', 'aria-labelledby': 'l', 'aria-describedby': 'd' },
      { label: 'Gain', hint: 'Boosts the input', referenced: false },
    );
    expect(out).toEqual({ accessibilityLabel: 'Gain', accessibilityHint: 'Boosts the input' });
  });

  it('hides an element named by another, unless it has a role of its own', () => {
    const named = { label: undefined, hint: undefined, referenced: true };
    expect(translate({}, named)).toEqual({ out: { accessible: false }, hidden: true });
    expect(translate({ role: 'heading' }, named, 'text')).toEqual({
      out: { accessibilityRole: 'header' },
      hidden: false,
    });
  });

  it('hides an element with aria-hidden, and makes a group one accessible node', () => {
    expect(translate({ 'aria-hidden': 'true' })).toEqual({
      out: { accessible: false },
      hidden: true,
    });
    expect(translate({ role: 'group' })).toEqual({ out: { accessible: true }, hidden: false });
    expect(translate({ role: 'group', 'aria-hidden': true })).toEqual({
      out: { accessible: false },
      hidden: true,
    });
  });

  it('drops data attributes, and web-only props and unknown ARIA with a warning', () => {
    const warn = vi.spyOn(console, 'warn');
    const { out } = translate({
      'data-part': 'root',
      className: 'contour-knob',
      asChild: true,
      'aria-live': 'polite',
    });
    expect(out).toEqual({});
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe('focusableOf', () => {
  it('takes focus from a tabIndex of 0 or more, never from a negative one', () => {
    expect(focusableOf('div', 0, false)).toBe(true);
    expect(focusableOf('div', 2, false)).toBe(true);
    expect(focusableOf('div', -1, true)).toBe(false);
    expect(focusableOf('div', undefined, false)).toBe(false);
    expect(focusableOf('button', undefined, true)).toBe(true);
  });
});

describe('shapeProps', () => {
  it('keeps the geometry and the presentation of each shape, and nothing else', () => {
    expect(
      shapeProps('path', {
        d: 'M 0 0',
        x1: 1,
        stroke: 'currentColor',
        strokeWidth: 2,
        opacity: undefined,
        'data-part': 'track',
        'aria-hidden': true,
        onPointerDown: () => undefined,
      }),
    ).toEqual({ d: 'M 0 0', stroke: 'currentColor', strokeWidth: 2 });
    expect(shapeProps('line', { d: 'M 0 0', x1: 1, y2: 4, fill: 'none' })).toEqual({
      x1: 1,
      y2: 4,
      fill: 'none',
    });
  });
});
