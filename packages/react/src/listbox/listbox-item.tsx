import { Listbox as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxItemProps = Headless.ItemProps;

/**
 * Listbox item: one option of the list, on the hover background while highlighted. Put its
 * text in `Listbox.ItemText` and, for a selection, a `Listbox.ItemIndicator` after it.
 */
export function ListboxItem({ className, ...props }: ListboxItemProps): ReactElement {
  return <Headless.Item className={cx('contour-listbox__item', className)} {...props} />;
}
