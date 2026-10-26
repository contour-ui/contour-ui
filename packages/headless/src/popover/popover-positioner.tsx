import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePopoverContext } from './popover-context.ts';

export type PopoverPositionerProps = PrimitiveProps<'div'>;

/**
 * Popover positioner: the `div` that is placed next to the trigger (or the anchor) and holds the
 * content. Put it in a `Portal`, so the content escapes the `overflow` and the stacking context
 * of the trigger's parents. It shows and hides with the content, and renders nothing while the
 * content is not mounted (`lazyMount`, `unmountOnExit`).
 *
 * Its inline style keeps it off screen until the platform has placed it; then the platform writes
 * its `transform`, `data-placement`, `--layer-index` and the positioning variables
 * (`--reference-width`, `--available-height`, `--transform-origin`…) straight into it. Style the
 * content, not the positioner, and leave those properties out of your `style`.
 *
 * @example
 * <Portal>
 *   <Popover.Positioner>
 *     <Popover.Content>…</Popover.Content>
 *   </Popover.Positioner>
 * </Portal>
 */
export function PopoverPositioner({ ref, ...props }: PopoverPositionerProps): ReactElement | null {
  const api = usePopoverContext();
  const { mounted, getPresenceProps } = api.presence;
  const ownProps = api.getPositionerProps();
  const composedRef = useComposedRefs<HTMLDivElement>(ownProps.ref, ref);
  if (!mounted) {
    return null;
  }
  return <Primitive.div {...mergeProps(ownProps, getPresenceProps(), props)} ref={composedRef} />;
}
