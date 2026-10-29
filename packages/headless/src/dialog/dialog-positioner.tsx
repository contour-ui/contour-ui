'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useDialogContext } from './dialog-context.ts';

export type DialogPositionerProps = PrimitiveProps<'div'>;

/**
 * Dialog positioner: a `div` around the content that lays it out on the screen, such as in the
 * middle of a box that covers the viewport. It shows and hides with the content, whose exit
 * animation it waits for, and gets `--layer-index` while the dialog is open.
 *
 * @example
 * <Dialog.Positioner className="positioner">
 *   <Dialog.Content>…</Dialog.Content>
 * </Dialog.Positioner>
 */
export function DialogPositioner({ ref, ...props }: DialogPositionerProps): ReactElement | null {
  const api = useDialogContext();
  const { mounted, getPresenceProps } = api.presence;
  const ownProps = api.getPositionerProps();
  const composedRef = useComposedRefs<HTMLDivElement>(ownProps.ref, ref);
  if (!mounted) {
    return null;
  }
  return <Primitive.div {...mergeProps(ownProps, getPresenceProps(), props)} ref={composedRef} />;
}
