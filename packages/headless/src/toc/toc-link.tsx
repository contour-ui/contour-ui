import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTocContext, useTocItemContext } from './toc-context.ts';

export type TocLinkProps = PrimitiveProps<'a'>;

/**
 * Table of contents link: an `<a href="#id">` to the heading of its `Toc.Item`. A click
 * scrolls to the heading (`scrollBehavior`), moves focus to it and puts its id in the address
 * with `history.replaceState`. A click handler of yours that calls `event.preventDefault()`
 * cancels all of it, as it cancels following the link; clicks that open the link in a new tab
 * or window are left to the browser. The link of the first active heading has
 * `aria-current="true"`.
 *
 * @example
 * <Toc.Link>Install</Toc.Link>
 */
export function TocLink(props: TocLinkProps): ReactElement {
  const api = useTocContext();
  const item = useTocItemContext();
  return <Primitive.a {...mergeProps(api.getLinkProps(item), props)} />;
}
