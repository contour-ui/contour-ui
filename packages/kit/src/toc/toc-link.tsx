import { Toc as HeadlessToc } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TocLinkProps = HeadlessToc.LinkProps;

/**
 * Table of contents link: the `<a href="#id">` of its item, in the muted text color, and in the
 * default one while its heading is active or the pointer is over it. A click scrolls to the
 * heading and puts its id in the address.
 */
export function TocLink({ className, ...props }: TocLinkProps): ReactElement {
  return <HeadlessToc.Link className={cx('contour-toc__link', className)} {...props} />;
}
