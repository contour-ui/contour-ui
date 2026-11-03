import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DialogBackdropProps = Headless.BackdropProps;

/**
 * Dialog backdrop: the scrim over the page behind the dialog, which fades in and out with it.
 * A press on it closes the dialog, unless `closeOnInteractOutside` is off.
 */
export function DialogBackdrop({ className, ...props }: DialogBackdropProps): ReactElement | null {
  return <Headless.Backdrop className={cx('contour-dialog__backdrop', className)} {...props} />;
}
