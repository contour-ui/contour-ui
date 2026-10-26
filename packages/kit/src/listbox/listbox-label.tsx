import { Listbox as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxLabelProps = Headless.LabelProps;

/** Listbox label: a `label` that names the list and, when there is one, the input. */
export function ListboxLabel({ className, ...props }: ListboxLabelProps): ReactElement {
  return <Headless.Label className={cx('contour-listbox__label', className)} {...props} />;
}
