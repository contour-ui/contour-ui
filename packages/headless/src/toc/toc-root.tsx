import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { TocContext } from './toc-context.ts';
import { useToc } from './use-toc.ts';
import type { UseTocProps } from './use-toc.ts';

export interface TocRootProps extends UseTocProps, Omit<PrimitiveProps<'nav'>, keyof UseTocProps> {}

/**
 * Table of contents root: a `nav` that runs the toc machine and gives its parts the state. It
 * observes the headings of `items` in their scroll container (`scrollEl`, or the page) and
 * makes active the ones in the observed area, or the last one scrolled past. While a
 * `Toc.Title` is mounted, the title names the `nav` (`aria-labelledby`).
 *
 * @example
 * <Toc.Root items={items}>
 *   <Toc.Title>On this page</Toc.Title>
 *   <Toc.Indicator />
 *   <Toc.List>
 *     {items.map((item) => (
 *       <Toc.Item key={item.value} item={item}>
 *         <Toc.Link>{titles[item.value]}</Toc.Link>
 *       </Toc.Item>
 *     ))}
 *   </Toc.List>
 * </Toc.Root>
 */
export function TocRoot({
  items,
  activeIds,
  defaultActiveIds,
  onActiveChange,
  rootMargin,
  threshold,
  scrollEl,
  scrollBehavior,
  autoScroll,
  ref,
  ...props
}: TocRootProps): ReactElement {
  const api = useToc({
    items,
    activeIds,
    defaultActiveIds,
    onActiveChange,
    rootMargin,
    threshold,
    scrollEl,
    scrollBehavior,
    autoScroll,
  });
  const { ref: rootRef, ...rootProps } = api.getRootProps();
  const composedRef = useComposedRefs<HTMLElement>(rootRef, ref);
  return (
    <TocContext value={api}>
      <Primitive.nav {...mergeProps(rootProps, props)} ref={composedRef} />
    </TocContext>
  );
}
