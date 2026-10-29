'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useClipboardContext } from './clipboard-context.ts';

export type ClipboardLabelProps = PrimitiveProps<'span'>;

/**
 * Clipboard label: a `span` that says what the value is. While it is mounted, the root is a
 * `group` named by it (`aria-labelledby` with its `id`, which it generates unless you pass one),
 * so screen readers say the name as focus enters the trigger.
 *
 * @example
 * <Clipboard.Label>Install command</Clipboard.Label>
 */
export function ClipboardLabel({ ref, ...props }: ClipboardLabelProps): ReactElement {
  const api = useClipboardContext();
  const ownProps = api.getLabelProps();
  const composedRef = useComposedRefs<HTMLSpanElement>(ownProps.ref, ref);
  return <Primitive.span {...mergeProps(ownProps, props)} ref={composedRef} />;
}
