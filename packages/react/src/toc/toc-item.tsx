import { Toc as HeadlessToc } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TocItemProps = HeadlessToc.ItemProps;

/**
 * Table of contents item: an `li` for one heading, indented one step for each level below
 * `depth` 2 (an `h2`), down to 6.
 *
 * @example
 * <Toc.Item item={{ value: 'install', depth: 2 }}>
 *   <Toc.Link>Install</Toc.Link>
 * </Toc.Item>
 */
export function TocItem({ className, ...props }: TocItemProps): ReactElement {
  return <HeadlessToc.Item className={cx('contour-toc__item', className)} {...props} />;
}
