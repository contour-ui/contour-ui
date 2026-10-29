import { Toc as HeadlessToc } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TocListProps = HeadlessToc.ListProps;

/** Table of contents list: a `ul` without bullets, with the line the indicator runs along. */
export function TocList({ className, ...props }: TocListProps): ReactElement {
  return <HeadlessToc.List className={cx('contour-toc__list', className)} {...props} />;
}
