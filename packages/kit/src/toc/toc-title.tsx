import { Toc as HeadlessToc } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TocTitleProps = HeadlessToc.TitleProps;

/**
 * Table of contents title: a `div` in the label style, such as "On this page", that names the
 * root while it is mounted. For a heading in the outline of the page, pass one with `asChild`.
 */
export function TocTitle({ className, ...props }: TocTitleProps): ReactElement {
  return <HeadlessToc.Title className={cx('contour-toc__title', className)} {...props} />;
}
