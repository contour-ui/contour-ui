import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePopoverContext } from './popover-context.ts';

export type PopoverCloseTriggerProps = PrimitiveProps<'button'>;

/**
 * Popover close trigger: a `<button type="button">` inside the content that closes the popover.
 * Give it a text, or an `aria-label` when it shows only an icon. A click handler of yours that
 * calls `event.preventDefault()` keeps the popover open.
 *
 * @example
 * <Popover.CloseTrigger aria-label="Close">×</Popover.CloseTrigger>
 */
export function PopoverCloseTrigger(props: PopoverCloseTriggerProps): ReactElement {
  const api = usePopoverContext();
  return <Primitive.button {...mergeProps(api.getCloseTriggerProps(), props)} />;
}
