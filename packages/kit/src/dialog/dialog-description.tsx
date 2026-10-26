import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DialogDescriptionProps = Headless.DescriptionProps;

/** Dialog description: a `p` of supporting text that describes the dialog, under its title. */
export function DialogDescription({ className, ...props }: DialogDescriptionProps): ReactElement {
  return (
    <Headless.Description className={cx('contour-dialog__description', className)} {...props} />
  );
}
