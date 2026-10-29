'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useDialogContext } from './dialog-context.ts';

export type DialogTriggerProps = PrimitiveProps<'button'>;

/**
 * Dialog trigger: a `<button type="button">` that opens the dialog, and closes a non-modal one
 * that is open (a modal dialog leaves it out of reach). It carries `aria-expanded` and
 * `data-state`, and points to the content with `aria-controls` while the content is mounted.
 * A click handler of yours that calls `event.preventDefault()` keeps the dialog as it is.
 *
 * @example
 * <Dialog.Trigger>Open settings</Dialog.Trigger>
 */
export function DialogTrigger({ ref, ...props }: DialogTriggerProps): ReactElement {
  const api = useDialogContext();
  const ownProps = api.getTriggerProps();
  const composedRef = useComposedRefs<HTMLButtonElement>(ownProps.ref, ref);
  return <Primitive.button {...mergeProps(ownProps, props)} ref={composedRef} />;
}
