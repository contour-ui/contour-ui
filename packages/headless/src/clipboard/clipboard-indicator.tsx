import type { ReactElement, ReactNode } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useClipboardContext } from './clipboard-context.ts';

export interface ClipboardIndicatorProps extends PrimitiveProps<'span'> {
  /**
   * What the indicator shows while the value is copied, in place of its children. With
   * `asChild`, both are single elements.
   */
  copied?: ReactNode;
}

/**
 * Clipboard indicator: a `span` that shows its children, and `copied` instead while the value
 * is copied, such as a copy icon that turns into a check mark.
 *
 * @example
 * <Clipboard.Indicator copied={<CheckIcon aria-hidden />}>
 *   <CopyIcon aria-hidden />
 * </Clipboard.Indicator>
 */
export function ClipboardIndicator({
  copied,
  children,
  ...props
}: ClipboardIndicatorProps): ReactElement {
  const api = useClipboardContext();
  return (
    <Primitive.span {...mergeProps(api.getIndicatorProps(), props)}>
      {api.copied ? copied : children}
    </Primitive.span>
  );
}
