import { Listbox as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxItemGroupLabelProps = Headless.ItemGroupLabelProps;

/** Listbox item group label: the caption above the items of a group. */
export function ListboxItemGroupLabel({
  className,
  ...props
}: ListboxItemGroupLabelProps): ReactElement {
  return (
    <Headless.ItemGroupLabel
      className={cx('contour-listbox__item-group-label', className)}
      {...props}
    />
  );
}
