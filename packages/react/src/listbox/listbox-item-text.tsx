import { Listbox as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxItemTextProps = Headless.ItemTextProps;

/** Listbox item text: the text of an item, which takes the free width of the row. */
export function ListboxItemText({ className, ...props }: ListboxItemTextProps): ReactElement {
  return <Headless.ItemText className={cx('contour-listbox__item-text', className)} {...props} />;
}
