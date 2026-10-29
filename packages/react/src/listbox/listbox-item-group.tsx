import { Listbox as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxItemGroupProps = Headless.ItemGroupProps;

/** Listbox item group: a group of items, named by its `Listbox.ItemGroupLabel`. */
export function ListboxItemGroup({ className, ...props }: ListboxItemGroupProps): ReactElement {
  return <Headless.ItemGroup className={cx('contour-listbox__item-group', className)} {...props} />;
}
