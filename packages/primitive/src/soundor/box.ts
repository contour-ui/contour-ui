import { Text } from '@soundor/react';
import type { StyleProp, TextProps } from '@soundor/react';
import { createElement, use, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { hasTextRuns, isNodeList, wrapTextRuns } from '../native/text-runs.ts';
import type { NativeElement } from './native-element.ts';
import { mergeTextStyles, TextStyleContext } from './text-style.ts';

/** What a box or the pressable reads of its props itself: its content and its text style. */
export interface BoxInput {
  readonly children?: ReactNode;
  readonly textStyle?: StyleProp | undefined;
}

/**
 * Creates the Soundor component of a box with its props and children, the children one by one,
 * as JSX passes them: React keys none of their places.
 */
export type BoxHost = (
  props: Readonly<Record<string, unknown>>,
  children: readonly ReactNode[],
) => ReactElement;

/** The children of an element, one by one. */
function listOf(children: ReactNode): readonly ReactNode[] {
  if (isNodeList(children)) {
    return children;
  }
  return children === undefined ? [] : [children];
}

/**
 * A box or the pressable: its runs of text in `Text`s in the ambient text style (and hidden with
 * the box), and its own `textStyle` given to the text below it.
 */
export function useBox(
  native: NativeElement,
  { children, textStyle }: BoxInput,
  host: BoxHost,
): ReactElement {
  const runs = hasTextRuns(children);
  // `use` may be called conditionally: a box without text and without a text style of its own
  // reads no context, so a change of the style above it does not render it again.
  const inherited: StyleProp = runs || textStyle !== undefined ? use(TextStyleContext) : undefined;
  const ambient = useMemo(() => mergeTextStyles(inherited, textStyle), [inherited, textStyle]);

  let content: readonly ReactNode[];
  if (runs) {
    const { hidden } = native;
    const run = (text: string, key: string | undefined): ReactElement => {
      const props: Record<string, unknown> = {};
      if (key !== undefined) {
        props['key'] = key;
      }
      if (ambient !== undefined) {
        props['style'] = ambient;
      }
      if (hidden) {
        props['accessible'] = false;
      }
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the props of a Text.
      return createElement(Text, props as TextProps, text);
    };
    content = listOf(wrapTextRuns(children, run));
  } else {
    content = listOf(children);
  }
  const box = host(native.props, content);
  return textStyle === undefined ? box : createElement(TextStyleContext, { value: ambient }, box);
}
