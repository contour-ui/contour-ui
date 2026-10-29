'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useDialogContext } from './dialog-context.ts';

export type DialogCloseTriggerProps = PrimitiveProps<'button'>;

/**
 * Dialog close trigger: a `<button type="button">` that closes the dialog, such as "Cancel" or
 * an x in a corner; name an x with `aria-label`. An `alertdialog` focuses its first close
 * trigger when it opens, the safe answer. A click handler of yours that calls
 * `event.preventDefault()` keeps the dialog open.
 *
 * @example
 * <Dialog.CloseTrigger aria-label="Close">×</Dialog.CloseTrigger>
 */
export function DialogCloseTrigger({ ref, ...props }: DialogCloseTriggerProps): ReactElement {
  const api = useDialogContext();
  const ownProps = api.getCloseTriggerProps();
  const composedRef = useComposedRefs<HTMLButtonElement>(ownProps.ref, ref);
  return <Primitive.button {...mergeProps(ownProps, props)} ref={composedRef} />;
}
