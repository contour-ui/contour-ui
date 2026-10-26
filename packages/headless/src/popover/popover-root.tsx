import type { ReactElement, ReactNode } from 'react';

import { usePresence } from '../presence/index.ts';
import { PopoverContext } from './popover-context.ts';
import { usePopover } from './use-popover.ts';
import type { UsePopoverProps } from './use-popover.ts';

export interface PopoverRootProps extends UsePopoverProps {
  /** The parts of the popover: the trigger, and the positioner with the content, in a `Portal`. */
  children?: ReactNode;
  /**
   * Render the positioner and the content only once the popover first opens.
   *
   * @defaultValue false
   */
  lazyMount?: boolean | undefined;
  /**
   * Unmount the positioner and the content once the popover has closed, after the exit animation
   * of the content. Otherwise they stay mounted, `hidden`.
   *
   * @defaultValue false
   */
  unmountOnExit?: boolean | undefined;
  /** Called each time the content has closed: once its exit animation ends, or at once. */
  onExitComplete?: (() => void) | undefined;
}

/**
 * Popover root: renders no element. It runs the popover machine and gives its parts the state,
 * and the presence that shows and hides the positioner and the content with its exit animation
 * (`data-state="closed"`). Put the positioner in a `Portal`, so the content escapes the
 * `overflow` and the stacking context of the trigger's parents; set `portalled={false}` when it
 * stays in place.
 *
 * @example
 * <Popover.Root>
 *   <Popover.Trigger>Share</Popover.Trigger>
 *   <Portal>
 *     <Popover.Positioner>
 *       <Popover.Content>
 *         <Popover.Title>Share this page</Popover.Title>
 *         <Popover.Description>Anyone with the link can view it.</Popover.Description>
 *         <Popover.CloseTrigger>Done</Popover.CloseTrigger>
 *       </Popover.Content>
 *     </Popover.Positioner>
 *   </Portal>
 * </Popover.Root>
 */
export function PopoverRoot({
  children,
  lazyMount = false,
  unmountOnExit = false,
  onExitComplete,
  open,
  defaultOpen,
  onOpenChange,
  modal,
  portalled,
  autoFocus,
  restoreFocus,
  closeOnInteractOutside,
  closeOnEscape,
  positioning,
  initialFocusEl,
  finalFocusEl,
}: PopoverRootProps): ReactElement {
  const api = usePopover({
    open,
    defaultOpen,
    onOpenChange,
    modal,
    portalled,
    autoFocus,
    restoreFocus,
    closeOnInteractOutside,
    closeOnEscape,
    positioning,
    initialFocusEl,
    finalFocusEl,
  });
  // One presence for the positioner and the content: the content runs the exit animation.
  const presence = usePresence({ present: api.open, lazyMount, unmountOnExit, onExitComplete });
  return (
    <PopoverContext value={{ ...api, presence, lazyMount, unmountOnExit }}>
      {children}
    </PopoverContext>
  );
}
