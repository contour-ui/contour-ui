import { Collapsible as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CollapsibleRootProps = Headless.RootProps;

/**
 * Collapsible root: a `div` that runs the collapsible of `@contour-ui/headless` and gives its
 * parts the state. It has no look of its own: the trigger opens and closes the content, which
 * grows to its height as it opens and shrinks back as it closes.
 *
 * @example
 * <Collapsible.Root>
 *   <Collapsible.Trigger>
 *     <Collapsible.Indicator />
 *     Shipping
 *   </Collapsible.Trigger>
 *   <Collapsible.Content>Orders ship within two business days.</Collapsible.Content>
 * </Collapsible.Root>
 */
export function CollapsibleRoot({ className, ...props }: CollapsibleRootProps): ReactElement {
  return <Headless.Root className={cx('contour-collapsible', className)} {...props} />;
}
