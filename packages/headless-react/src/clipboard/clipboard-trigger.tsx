'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useClipboardContext } from './clipboard-context.ts';

export type ClipboardTriggerProps = PrimitiveProps<'button'>;

/**
 * Clipboard trigger: a `<button type="button">` that copies the value on click. Its accessible
 * name is "Copy to clipboard" unless you pass another `aria-label`. A click handler of yours
 * that calls `event.preventDefault()` cancels the copy.
 *
 * @example
 * <Clipboard.Trigger aria-label="Copy the install command">Copy</Clipboard.Trigger>
 */
export function ClipboardTrigger(props: ClipboardTriggerProps): ReactElement {
  const api = useClipboardContext();
  return <Primitive.button {...mergeProps(api.getTriggerProps(), props)} />;
}
