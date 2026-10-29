'use client';

import { Dialog as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { DialogStyleContext } from './dialog-context.ts';
import type { DialogPlacement, DialogSize } from './dialog-context.ts';

export interface DialogRootProps extends Headless.RootProps {
  /**
   * Where the dialog sits: in the middle of the viewport, or near its top, as a search does.
   *
   * @defaultValue 'center'
   */
  placement?: DialogPlacement | undefined;
  /**
   * How wide the dialog can grow: `sm` for a question, `md` for a form or a search, `lg` for
   * more content. It never grows wider than the viewport.
   *
   * @defaultValue 'md'
   */
  size?: DialogSize | undefined;
}

/**
 * Dialog root: renders no element. It runs the dialog of `@contour-ui/headless-react` and gives its
 * parts the state and the look (`placement`, `size`). Put the backdrop and the positioner in a
 * `Portal`.
 *
 * @example
 * <Dialog.Root>
 *   <Dialog.Trigger asChild>
 *     <Button>Export</Button>
 *   </Dialog.Trigger>
 *   <Portal>
 *     <Dialog.Backdrop />
 *     <Dialog.Positioner>
 *       <Dialog.Content>
 *         <Dialog.CloseTrigger />
 *         <Dialog.Header>
 *           <Dialog.Title>Export the mix</Dialog.Title>
 *           <Dialog.Description>Render it to a file.</Dialog.Description>
 *         </Dialog.Header>
 *         <Dialog.Body>…</Dialog.Body>
 *         <Dialog.Footer>
 *           <Button>Export</Button>
 *         </Dialog.Footer>
 *       </Dialog.Content>
 *     </Dialog.Positioner>
 *   </Portal>
 * </Dialog.Root>
 */
export function DialogRoot({
  placement = 'center',
  size = 'md',
  ...props
}: DialogRootProps): ReactElement {
  return (
    <DialogStyleContext value={{ placement, size }}>
      <Headless.Root {...props} />
    </DialogStyleContext>
  );
}
