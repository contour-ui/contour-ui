import type { clipboard } from '@contour-ui/core';
import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { ClipboardContext } from './clipboard-context.ts';
import { useClipboard } from './use-clipboard.ts';

export interface ClipboardRootProps
  extends clipboard.Input, Omit<PrimitiveProps<'div'>, keyof clipboard.Input> {
  /**
   * What screen readers announce once a copy is written: the text of the visually hidden status
   * element that the root renders next to its own element.
   *
   * @defaultValue 'Copied to clipboard'
   */
  copiedMessage?: string | undefined;
}

/**
 * Clipboard root: a `div` that runs the clipboard machine and gives its parts the state.
 * Right after its element, it renders a visually hidden `role="status"` element, empty until
 * the browser has written a copy, so that screen readers announce `copiedMessage`.
 *
 * @example
 * <Clipboard.Root value="pnpm add @contour-ui/headless">
 *   <Clipboard.Trigger>Copy</Clipboard.Trigger>
 *   <Clipboard.Indicator copied="Copied" />
 * </Clipboard.Root>
 */
export function ClipboardRoot({
  value,
  defaultValue,
  onValueChange,
  onStatusChange,
  timeout,
  copiedMessage = 'Copied to clipboard',
  ...props
}: ClipboardRootProps): ReactElement {
  const api = useClipboard({ value, defaultValue, onValueChange, onStatusChange, timeout });
  return (
    <ClipboardContext value={api}>
      <Primitive.div {...mergeProps(api.getRootProps(), props)} />
      {/* Outside the root element: it renders the same with `asChild`, children untouched. */}
      <span {...api.getStatusProps()}>{api.copied ? copiedMessage : null}</span>
    </ClipboardContext>
  );
}
