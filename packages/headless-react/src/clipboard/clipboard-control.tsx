'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useClipboardContext } from './clipboard-context.ts';

export type ClipboardControlProps = PrimitiveProps<'div'>;

/**
 * Clipboard control: a `div` that holds the value text and the trigger, to lay them out and
 * frame them as one row. It adds no role.
 *
 * @example
 * <Clipboard.Control>
 *   <Clipboard.ValueText />
 *   <Clipboard.Trigger>Copy</Clipboard.Trigger>
 * </Clipboard.Control>
 */
export function ClipboardControl(props: ClipboardControlProps): ReactElement {
  const api = useClipboardContext();
  return <Primitive.div {...mergeProps(api.getControlProps(), props)} />;
}
