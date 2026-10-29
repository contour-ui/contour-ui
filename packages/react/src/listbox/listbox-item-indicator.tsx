import { Listbox as Headless } from '@contour-ui/headless-react';
import { checkIcon } from '@contour-ui/icons';
import type { ReactElement } from 'react';

import { Icon } from '../icon/index.ts';
import { cx } from '../utils/cx.ts';

export type ListboxItemIndicatorProps = Headless.ItemIndicatorProps;

/**
 * Listbox item indicator: a check mark in the accent color at the end of a selected item. It
 * keeps its room while the item is not selected, so the rows line up. Pass children for
 * another mark.
 */
export function ListboxItemIndicator({
  className,
  children,
  ...props
}: ListboxItemIndicatorProps): ReactElement {
  return (
    <Headless.ItemIndicator className={cx('contour-listbox__item-indicator', className)} {...props}>
      {children ?? <Icon icon={checkIcon} />}
    </Headless.ItemIndicator>
  );
}
