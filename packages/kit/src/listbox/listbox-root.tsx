import { Listbox as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxRootProps<T = unknown> = Headless.RootProps<T>;

/**
 * Listbox root: a `div` that runs the listbox of `@contour-ui/headless-react` and stacks the label,
 * the input and the list. `collection` is the only prop it needs: the items, from
 * `createListCollection`.
 *
 * @example
 * <Listbox.Root collection={collection}>
 *   <Listbox.Label>Waveform</Listbox.Label>
 *   <Listbox.Content>
 *     {collection.items.map((item) => (
 *       <Listbox.Item key={item.value} item={item}>
 *         <Listbox.ItemText>{item.label}</Listbox.ItemText>
 *         <Listbox.ItemIndicator />
 *       </Listbox.Item>
 *     ))}
 *   </Listbox.Content>
 * </Listbox.Root>
 */
export function ListboxRoot<T>({ className, ...props }: ListboxRootProps<T>): ReactElement {
  return <Headless.Root className={cx('contour-listbox', className)} {...props} />;
}
