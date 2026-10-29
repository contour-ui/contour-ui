import { Toc as HeadlessToc } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TocRootProps = HeadlessToc.RootProps;

/**
 * Table of contents root: the `nav` of `Toc.Root` from `@contour-ui/headless-react`, which observes
 * the headings of `items` and makes active the ones near the top of their scroll container, or
 * the last one scrolled past. It sets the text of the parts and places the indicator.
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
export function TocRoot({ className, ...props }: TocRootProps): ReactElement {
  return <HeadlessToc.Root className={cx('contour-toc', className)} {...props} />;
}
