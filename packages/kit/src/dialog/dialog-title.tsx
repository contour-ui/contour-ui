import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DialogTitleProps = Headless.TitleProps;

/**
 * Dialog title: an `h2` that names the dialog. For another heading level, pass that heading
 * with `asChild`.
 */
export function DialogTitle({ className, ...props }: DialogTitleProps): ReactElement {
  return <Headless.Title className={cx('contour-dialog__title', className)} {...props} />;
}
