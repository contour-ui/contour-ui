import { Popover as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PopoverContentProps = Headless.ContentProps;

/**
 * Popover content: a raised panel with a border, a shadow and the corners of a panel, as wide as
 * its content up to 320px (or as wide as its trigger, when that is wider) and no higher than the
 * room it has, where it scrolls. It stacks its parts. It grows in from the edge next to its
 * trigger when it opens and shrinks back when it closes; under reduced motion, it only fades.
 *
 * @example
 * <Popover.Content>
 *   <Popover.Title>Share this page</Popover.Title>
 *   <Popover.Description>Anyone with the link can view it.</Popover.Description>
 *   <Popover.CloseTrigger />
 * </Popover.Content>
 */
export function PopoverContent({ className, ...props }: PopoverContentProps): ReactElement | null {
  return <Headless.Content className={cx('contour-popover__content', className)} {...props} />;
}
