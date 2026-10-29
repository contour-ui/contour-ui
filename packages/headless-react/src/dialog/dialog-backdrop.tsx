'use client';

import type { ReactElement } from 'react';

import { usePresence } from '../presence/index.ts';
import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useDialogContext } from './dialog-context.ts';

export type DialogBackdropProps = PrimitiveProps<'div'>;

/**
 * Dialog backdrop: a `div` behind the dialog, that shows and hides with it, through an exit
 * animation of its own (`data-state="closed"`), and mounts as the root's `lazyMount` and
 * `unmountOnExit` say. A press on it is an interaction outside the dialog. While the dialog is
 * open it gets `--layer-index`, its place in the stack of overlays.
 *
 * @example
 * <Portal>
 *   <Dialog.Backdrop className="backdrop" />
 *   <Dialog.Positioner>…</Dialog.Positioner>
 * </Portal>
 */
export function DialogBackdrop({ ref, ...props }: DialogBackdropProps): ReactElement | null {
  const api = useDialogContext();
  const {
    mounted,
    ref: presenceRef,
    getPresenceProps,
  } = usePresence({
    present: api.open,
    lazyMount: api.lazyMount,
    unmountOnExit: api.unmountOnExit,
  });
  const ownProps = api.getBackdropProps();
  const ownRef = useComposedRefs<HTMLDivElement>(presenceRef, ownProps.ref);
  const composedRef = useComposedRefs<HTMLDivElement>(ownRef, ref);
  if (!mounted) {
    return null;
  }
  return <Primitive.div {...mergeProps(ownProps, getPresenceProps(), props)} ref={composedRef} />;
}
