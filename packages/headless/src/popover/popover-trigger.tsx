import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePopoverContext } from './popover-context.ts';

export type PopoverTriggerProps = PrimitiveProps<'button'>;

/**
 * Popover trigger: a `<button type="button">` that opens the popover, and closes it again. It
 * tells assistive technology that it opens a dialog, and whether it is open. A click handler of
 * yours that calls `event.preventDefault()` keeps the popover as it is. Focus goes back to it
 * when the popover closes.
 *
 * @example
 * <Popover.Trigger asChild>
 *   <button className="my-button">Share</button>
 * </Popover.Trigger>
 */
export function PopoverTrigger({ ref, ...props }: PopoverTriggerProps): ReactElement {
  const api = usePopoverContext();
  const ownProps = api.getTriggerProps();
  const composedRef = useComposedRefs<HTMLButtonElement>(ownProps.ref, ref);
  return <Primitive.button {...mergeProps(ownProps, props)} ref={composedRef} />;
}
