import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePopoverContext } from './popover-context.ts';

export type PopoverAnchorProps = PrimitiveProps<'div'>;

/**
 * Popover anchor: a `div` the content is placed next to, instead of the trigger, such as a field
 * whose trigger sits at its end. Optional.
 *
 * @example
 * <Popover.Anchor className="field">
 *   <input aria-label="Color" />
 *   <Popover.Trigger>Pick</Popover.Trigger>
 * </Popover.Anchor>
 */
export function PopoverAnchor({ ref, ...props }: PopoverAnchorProps): ReactElement {
  const api = usePopoverContext();
  const ownProps = api.getAnchorProps();
  const composedRef = useComposedRefs<HTMLDivElement>(ownProps.ref, ref);
  return <Primitive.div {...mergeProps(ownProps, props)} ref={composedRef} />;
}
