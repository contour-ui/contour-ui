import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CodeBlockContentProps = PrimitiveProps<'div'>;

const isSet = (value: string | undefined): boolean => value !== undefined && value !== '';

/**
 * The code: a `div` around the highlighted `pre` that scrolls long lines
 * sideways instead of letting them overflow the page. It styles the lines of
 * Shiki's output: highlighted lines, added and removed lines, focused lines,
 * highlighted words and line numbers. It is in the tab order (`tabIndex={0}`),
 * so keyboard users can focus it and scroll with the arrow keys; with
 * `aria-label` or `aria-labelledby` it is also a `region` with that name.
 *
 * @example
 * <CodeBlock.Content>
 *   <pre className="shiki">…</pre>
 * </CodeBlock.Content>
 */
export function CodeBlockContent({ className, ...props }: CodeBlockContentProps): ReactElement {
  const named = isSet(props['aria-label']) || isSet(props['aria-labelledby']);
  const ownProps = {
    className: cx('contour-code-block__content', className),
    'data-scope': 'code-block',
    'data-part': 'content',
    // A scrollable region must be reachable by keyboard (axe `scrollable-region-focusable`).
    tabIndex: 0,
    // A name is only allowed on an element with a role. `mergeProps` skips `undefined`.
    role: named ? 'region' : undefined,
  };

  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
