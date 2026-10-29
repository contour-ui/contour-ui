'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useClipboardContext } from './clipboard-context.ts';

export type ClipboardValueTextProps = PrimitiveProps<'span'>;

/**
 * Clipboard value text: a `span` that shows the value, the text the trigger copies, as it
 * changes. Children show something else in its place, such as the value marked up; with
 * `asChild`, the child element holds the text.
 *
 * @example
 * <Clipboard.ValueText />
 * <Clipboard.ValueText asChild>
 *   <code>pnpm add @contour-ui/headless</code>
 * </Clipboard.ValueText>
 */
export function ClipboardValueText({ children, ...props }: ClipboardValueTextProps): ReactElement {
  const api = useClipboardContext();
  return (
    <Primitive.span {...mergeProps(api.getValueTextProps(), props)}>
      {children ?? api.value}
    </Primitive.span>
  );
}
