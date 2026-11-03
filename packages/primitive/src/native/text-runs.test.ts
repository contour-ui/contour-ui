import { createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { hasTextRuns, normalizeRun, wrapTextRuns } from './text-runs.ts';

/** A stand-in for the text node of a run: its text, and its key. */
const wrap = (text: string, key: string | undefined): ReactElement =>
  createElement('run', key === undefined ? null : { key }, text);

/** What the children turned into: a run as `[text, key]`, anything else as it is. */
function shape(node: ReactNode): unknown {
  if (Array.isArray(node)) {
    return node.map((child: ReactNode) => shape(child));
  }
  if (isValidElement<{ readonly children?: ReactNode }>(node) && node.type === 'run') {
    return ['run', node.props.children, node.key];
  }
  return node;
}

const icon = createElement('icon');

describe('normalizeRun', () => {
  it('collapses white space and drops it at the ends, as CSS does in a flex box', () => {
    expect(normalizeRun('  Save \n\t items ')).toBe('Save items');
    expect(normalizeRun(' \n ')).toBe('');
    expect(normalizeRun('')).toBe('');
  });

  it('keeps a no-break space, which CSS does not collapse', () => {
    expect(normalizeRun(' 10 dB ')).toBe(' 10 dB');
  });
});

describe('wrapTextRuns', () => {
  it('wraps a string or a number on its own', () => {
    expect(shape(wrapTextRuns('Save', wrap))).toEqual(['run', 'Save', null]);
    expect(shape(wrapTextRuns(0, wrap))).toEqual(['run', '0', null]);
    expect(wrapTextRuns(' ', wrap)).toBeNull();
  });

  it('joins adjacent strings and numbers into one run, in the place of its first', () => {
    expect(shape(wrapTextRuns(['Save ', 3, ' items'], wrap))).toEqual([
      ['run', 'Save 3 items', null],
      null,
      null,
    ]);
  });

  it('joins strings across what renders nothing, as the web shows them', () => {
    expect(shape(wrapTextRuns(['A', null, false, 'B'], wrap))).toEqual([
      ['run', 'AB', null],
      null,
      false,
      null,
    ]);
  });

  it('keeps elements in their places, between runs of their own', () => {
    expect(shape(wrapTextRuns([icon, ' Save ', icon, ' '], wrap))).toEqual([
      icon,
      ['run', 'Save', null],
      icon,
      null,
    ]);
  });

  it('wraps the runs of a list inside the children with keys of their own', () => {
    expect(shape(wrapTextRuns(['Range: ', [icon, 'to', icon]], wrap))).toEqual([
      ['run', 'Range:', null],
      [icon, ['run', 'to', 'text-run:1'], icon],
    ]);
  });

  it('gives back children without text as they are', () => {
    const children = [icon, [icon], null];
    expect(wrapTextRuns(children, wrap)).toBe(children);
    expect(wrapTextRuns(icon, wrap)).toBe(icon);
    expect(wrapTextRuns(undefined, wrap)).toBeUndefined();
  });
});

describe('hasTextRuns', () => {
  it('finds a string or a number at the top or in a list inside', () => {
    expect(hasTextRuns('a')).toBe(true);
    expect(hasTextRuns([icon, [icon, 1]])).toBe(true);
    expect(hasTextRuns([icon, [icon], null, true])).toBe(false);
  });
});
