import { Listbox as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxEmptyProps = Headless.EmptyProps;

/**
 * Listbox empty: muted text that shows only while the collection has no items, such as "No
 * results". Put it after `Listbox.Content`, not inside.
 */
export function ListboxEmpty({ className, ...props }: ListboxEmptyProps): ReactElement {
  return <Headless.Empty className={cx('contour-listbox__empty', className)} {...props} />;
}
