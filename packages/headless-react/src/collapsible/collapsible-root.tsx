'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';

import { usePresence } from '../presence/index.ts';
import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { CollapsibleContext } from './collapsible-context.ts';
import { useCollapsible } from './use-collapsible.ts';
import type { UseCollapsibleProps } from './use-collapsible.ts';

/** The props of `Collapsible.Root` that are not those of its `div`. */
interface CollapsibleRootOwnProps extends UseCollapsibleProps {
  /**
   * Render the content only once the collapsible first opens.
   *
   * @defaultValue false
   */
  lazyMount?: boolean | undefined;
  /**
   * Unmount the content once the collapsible has closed, after the exit animation of the
   * content. Otherwise it stays mounted, `hidden`.
   *
   * @defaultValue false
   */
  unmountOnExit?: boolean | undefined;
  /** Called each time the content has closed: once its exit animation ends, or at once. */
  onExitComplete?: (() => void) | undefined;
}

export interface CollapsibleRootProps
  extends CollapsibleRootOwnProps, Omit<PrimitiveProps<'div'>, keyof CollapsibleRootOwnProps> {}

/**
 * Collapsible root: a `div` that runs the collapsible machine and gives its parts the state, and
 * the presence that shows and hides the content with its exit animation (`data-state="closed"`).
 * It carries `data-state` (`open` or `closed`) and `data-disabled`.
 *
 * The trigger may sit anywhere inside the root, such as next to a link: only the trigger opens
 * and closes the content. For a state of your own, pass `open` and follow `onOpenChange`.
 *
 * @example
 * <Collapsible.Root defaultOpen>
 *   <Collapsible.Trigger>
 *     Shipping <Collapsible.Indicator>›</Collapsible.Indicator>
 *   </Collapsible.Trigger>
 *   <Collapsible.Content>Ships in two days.</Collapsible.Content>
 * </Collapsible.Root>
 */
export function CollapsibleRoot({
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  lazyMount = false,
  unmountOnExit = false,
  onExitComplete,
  ...props
}: CollapsibleRootProps): ReactElement {
  const api = useCollapsible({ open, defaultOpen, onOpenChange, disabled });
  const presence = usePresence({ present: api.open, lazyMount, unmountOnExit, onExitComplete });
  // Open from the start: the content shows at once, until it first closes.
  const [skipAnimation, setSkipAnimation] = useState(api.open);
  if (skipAnimation && !api.open) {
    setSkipAnimation(false);
  }
  return (
    <CollapsibleContext value={{ ...api, presence, skipAnimation }}>
      <Primitive.div {...mergeProps(api.getRootProps(), props)} />
    </CollapsibleContext>
  );
}
