/*
 * Text runs: the strings and numbers a box holds, as a native platform takes them. On the web a
 * box shows text by itself; a native box holds no strings (Soundor throws on one), so each run of
 * text inside it goes into a text node, laid out as CSS lays out the text of a flex box, which a
 * native box always is.
 */
import type { ReactElement, ReactNode } from 'react';

/** White space as CSS collapses it: spaces, tabs and line breaks, not a no-break space. */
const WHITE_SPACE = /[ \t\n\r\f]+/gu;

/** A string or a number: what a run is made of. */
const isText = (node: unknown): node is string | number =>
  typeof node === 'string' || typeof node === 'number';

/** Nothing on screen, and nothing between two strings: `null`, `undefined`, `true`, `false`. */
const isEmpty = (node: unknown): node is boolean | null | undefined =>
  node === null || node === undefined || typeof node === 'boolean';

/**
 * The text of a run as CSS shows it in a flex box: white space collapsed into one space, none at
 * either end. `''` for a run of white space only, which shows nothing.
 *
 * @example
 * normalizeRun('  Save \n items '); // 'Save items'
 */
export function normalizeRun(text: string): string {
  const collapsed = text.replaceAll(WHITE_SPACE, ' ');
  const start = collapsed.startsWith(' ') ? 1 : 0;
  const end = collapsed.endsWith(' ') ? collapsed.length - 1 : collapsed.length;
  return start >= end ? '' : collapsed.slice(start, end);
}

/** Whether `children` is a list of children: several of JSX, or a list a `map` made. */
export const isNodeList = (children: ReactNode): children is readonly ReactNode[] =>
  Array.isArray(children);

/** Whether `children` holds a string or a number, at its top or in a list inside it. */
export function hasTextRuns(children: ReactNode): boolean {
  if (isText(children)) {
    return true;
  }
  return isNodeList(children) && children.some((child) => hasTextRuns(child));
}

/** Makes the text node of a run: its text, and the key it needs inside a list (or none). */
export type RunWrapper = (text: string, key: string | undefined) => ReactElement;

function wrapList(list: readonly ReactNode[], wrap: RunWrapper, inList: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  let start = -1;
  let text = '';
  const flush = (): void => {
    if (start >= 0) {
      const run = normalizeRun(text);
      // The run takes the place of its first string; the others stay empty, so every child
      // after it keeps its place, as React keys children without keys by their place.
      out[start] = run === '' ? null : wrap(run, inList ? `text-run:${start}` : undefined);
      start = -1;
      text = '';
    }
  };
  for (const [index, child] of list.entries()) {
    if (isText(child)) {
      if (start < 0) {
        start = index;
      }
      text += String(child);
      out.push(null);
    } else if (isEmpty(child)) {
      // Renders nothing, so the strings on either side of it are one run, as on the web.
      out.push(child);
    } else {
      flush();
      out.push(isNodeList(child) && hasTextRuns(child) ? wrapList(child, wrap, true) : child);
    }
  }
  flush();
  return out;
}

/**
 * The children of a native box with each run of text in a text node: adjacent strings and
 * numbers are one run (`Save {count} items` is one text), white space collapses as CSS collapses
 * it, and a run of white space only is dropped (an Oxfmt `{' '}` outside a text would crash the
 * runtime). Elements keep their places. `children` without text comes back as it is.
 *
 * Returns the children to pass one by one (`createElement(View, props, ...runs)`) when they are
 * a list, so React does not ask for keys of the places it keeps.
 *
 * @example
 * wrapTextRuns(['Save ', 3, ' items'], (text) => <Text>{text}</Text>);
 * // [<Text>Save 3 items</Text>, null, null]
 */
export function wrapTextRuns(children: ReactNode, wrap: RunWrapper): ReactNode {
  if (isText(children)) {
    const run = normalizeRun(String(children));
    return run === '' ? null : wrap(run, undefined);
  }
  if (isNodeList(children) && hasTextRuns(children)) {
    return wrapList(children, wrap, false);
  }
  return children;
}
