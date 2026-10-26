import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useDialogContext } from './dialog-context.ts';

export type DialogContentProps = PrimitiveProps<'div'>;

/**
 * Dialog content: the `div` with the `dialog` role (or `alertdialog`), named by `Dialog.Title`
 * and described by `Dialog.Description` while they are mounted, and `aria-modal` when modal.
 * While the dialog is open, it is the layer that Escape and interactions outside close, focus
 * moves into it and stays there (`trapFocus`), and the rest of the page is inert (`modal`).
 * It carries `data-state`; once closed, it stays on screen, `inert`, while its exit animation
 * runs, then gets `hidden` (or unmounts with `unmountOnExit`).
 *
 * @example
 * <Dialog.Content>
 *   <Dialog.Title>Export</Dialog.Title>
 *   <Dialog.Description>Render the mix to a file.</Dialog.Description>
 * </Dialog.Content>
 */
export function DialogContent({ ref, ...props }: DialogContentProps): ReactElement | null {
  const api = useDialogContext();
  const { mounted, ref: presenceRef, getPresenceProps } = api.presence;
  const ownProps = api.getContentProps();
  const ownRef = useComposedRefs<HTMLDivElement>(presenceRef, ownProps.ref);
  const composedRef = useComposedRefs<HTMLDivElement>(ownRef, ref);
  if (!mounted) {
    return null;
  }
  return <Primitive.div {...mergeProps(ownProps, getPresenceProps(), props)} ref={composedRef} />;
}
