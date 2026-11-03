import { Popover as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PopoverTriggerProps = Headless.TriggerProps;

/**
 * Popover trigger: the button that opens the popover, and closes it again. It has no look of its
 * own: pass a `Button` or an `IconButton` with `asChild`.
 *
 * @example
 * <Popover.Trigger asChild>
 *   <Button variant="outline">Share</Button>
 * </Popover.Trigger>
 */
export function PopoverTrigger({ className, ...props }: PopoverTriggerProps): ReactElement {
  return <Headless.Trigger className={cx('contour-popover__trigger', className)} {...props} />;
}
