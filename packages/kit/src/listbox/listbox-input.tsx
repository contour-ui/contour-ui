import { Listbox as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxInputProps = Headless.InputProps;

/**
 * Listbox input: a text field above the list, as in a search box. It keeps the focus while ↓
 * and ↑ move the highlight in the list and Enter selects; filter the collection by its value.
 *
 * @example
 * <Listbox.Input
 *   aria-label="Search"
 *   value={query}
 *   onChange={(event) => setQuery(event.target.value)}
 * />
 */
export function ListboxInput({ className, ...props }: ListboxInputProps): ReactElement {
  return <Headless.Input className={cx('contour-listbox__input', className)} {...props} />;
}
