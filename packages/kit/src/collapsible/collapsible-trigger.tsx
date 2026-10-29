import { Collapsible as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CollapsibleTriggerProps = Headless.TriggerProps;

/**
 * Collapsible trigger: the button that opens the content, and closes it again. A plain label
 * in the text color, with the focus ring of the kit; for the look of a button, pass a `Button`
 * with `asChild`.
 *
 * @example
 * <Collapsible.Trigger>
 *   <Collapsible.Indicator />
 *   Shipping
 * </Collapsible.Trigger>
 */
export function CollapsibleTrigger({ className, ...props }: CollapsibleTriggerProps): ReactElement {
  return <Headless.Trigger className={cx('contour-collapsible__trigger', className)} {...props} />;
}
