import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DialogTriggerProps = Headless.TriggerProps;

/**
 * Dialog trigger: the button that opens the dialog. It has no look of its own: pass a `Button`
 * with `asChild`.
 *
 * @example
 * <Dialog.Trigger asChild>
 *   <Button variant="outline">Rename</Button>
 * </Dialog.Trigger>
 */
export function DialogTrigger({ className, ...props }: DialogTriggerProps): ReactElement {
  return <Headless.Trigger className={cx('contour-dialog__trigger', className)} {...props} />;
}
