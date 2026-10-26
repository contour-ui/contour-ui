import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UsePresenceReturn } from '../presence/index.ts';
import type { UseDialogReturn } from './use-dialog.ts';

/** What `Dialog.Root` gives its parts: the dialog API, and how its overlay shows and hides. */
export interface DialogContextValue extends UseDialogReturn {
  /**
   * The presence of the positioner and the content: whether they are mounted and shown, their
   * `hidden` and `inert`, and the ref of the content, whose exit animation it waits for.
   */
  readonly presence: UsePresenceReturn;
  /** Whether the overlay mounts only once the dialog first opens: the backdrop follows it. */
  readonly lazyMount: boolean;
  /** Whether the overlay unmounts once the dialog has closed: the backdrop follows it. */
  readonly unmountOnExit: boolean;
}

/** The API of the nearest `Dialog.Root`, for its parts. */
export const DialogContext: Context<DialogContextValue | null> =
  createContext<DialogContextValue | null>(null);

/**
 * The API of the nearest `Dialog.Root`: `open`, `modal`, `role`, `setOpen()`, `toggle()`, the
 * props of its elements, and the presence its overlay shows and hides with. For parts of your
 * own inside the root; throws outside of one.
 *
 * @example
 * function SaveButton(): ReactElement {
 *   const { setOpen } = useDialogContext();
 *   return (
 *     <button type="button" onClick={() => { save(); setOpen(false); }}>
 *       Save
 *     </button>
 *   );
 * }
 */
export function useDialogContext(): DialogContextValue {
  const api = use(DialogContext);
  if (api === null) {
    throw new Error('Dialog: render the parts inside <Dialog.Root>.');
  }
  return api;
}
