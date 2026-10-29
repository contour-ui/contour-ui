'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useCollapsibleContext } from './collapsible-context.ts';

export type CollapsibleTriggerProps = PrimitiveProps<'button'>;

/**
 * Collapsible trigger: a `<button type="button">` that opens the content, and closes it again.
 * It tells assistive technology whether the content is expanded, and which element it controls
 * while the content is mounted. It is `disabled` while the collapsible is. A click handler of
 * yours that calls `event.preventDefault()` keeps the collapsible as it is.
 *
 * @example
 * <Collapsible.Trigger asChild>
 *   <button className="my-button">Details</button>
 * </Collapsible.Trigger>
 */
export function CollapsibleTrigger(props: CollapsibleTriggerProps): ReactElement {
  const api = useCollapsibleContext();
  return <Primitive.button {...mergeProps(api.getTriggerProps(), props)} />;
}
