import type { ReactElement, ReactNode } from 'react';

import { usePresence } from '../presence/index.ts';
import { DialogContext } from './dialog-context.ts';
import { useDialog } from './use-dialog.ts';
import type { UseDialogProps } from './use-dialog.ts';

export interface DialogRootProps extends UseDialogProps {
  /** The parts of the dialog: the trigger, and the overlay, in a `Portal` as a rule. */
  children?: ReactNode;
  /**
   * Render the backdrop, the positioner and the content only once the dialog first opens.
   *
   * @defaultValue false
   */
  lazyMount?: boolean | undefined;
  /**
   * Unmount the backdrop, the positioner and the content once the dialog has closed, after
   * their exit animations. Otherwise they stay mounted, `hidden`.
   *
   * @defaultValue false
   */
  unmountOnExit?: boolean | undefined;
  /** Called each time the content has closed: once its exit animation ends, or at once. */
  onExitComplete?: (() => void) | undefined;
}

/**
 * Dialog root: renders no element. It runs the dialog machine and gives its parts the state,
 * and the presence that shows and hides the positioner and the content with their exit
 * animation (`data-state="closed"`). Put the backdrop and the positioner in a `Portal`, so the
 * overlay escapes the `overflow` and the stacking context of the page.
 *
 * @example
 * <Dialog.Root>
 *   <Dialog.Trigger>Rename</Dialog.Trigger>
 *   <Portal>
 *     <Dialog.Backdrop />
 *     <Dialog.Positioner>
 *       <Dialog.Content>
 *         <Dialog.Title>Rename the track</Dialog.Title>
 *         <Dialog.Description>The new name shows in the mixer.</Dialog.Description>
 *         <Dialog.CloseTrigger>Done</Dialog.CloseTrigger>
 *       </Dialog.Content>
 *     </Dialog.Positioner>
 *   </Portal>
 * </Dialog.Root>
 */
export function DialogRoot({
  children,
  lazyMount = false,
  unmountOnExit = false,
  onExitComplete,
  open,
  defaultOpen,
  onOpenChange,
  modal,
  trapFocus,
  preventScroll,
  closeOnInteractOutside,
  closeOnEscape,
  role,
  restoreFocus,
  initialFocusEl,
  finalFocusEl,
}: DialogRootProps): ReactElement {
  const api = useDialog({
    open,
    defaultOpen,
    onOpenChange,
    modal,
    trapFocus,
    preventScroll,
    closeOnInteractOutside,
    closeOnEscape,
    role,
    restoreFocus,
    initialFocusEl,
    finalFocusEl,
  });
  const presence = usePresence({ present: api.open, lazyMount, unmountOnExit, onExitComplete });
  return (
    <DialogContext value={{ ...api, presence, lazyMount, unmountOnExit }}>{children}</DialogContext>
  );
}
