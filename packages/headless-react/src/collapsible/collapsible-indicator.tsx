'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useCollapsibleContext } from './collapsible-context.ts';

export type CollapsibleIndicatorProps = PrimitiveProps<'span'>;

/**
 * Collapsible indicator: a `span` that shows the state, such as a chevron that turns as the
 * content opens, hidden from assistive technology (the trigger tells it). It carries
 * `data-state` (`open` or `closed`) and `data-disabled`; put it inside the trigger, or next to it.
 *
 * @example
 * <Collapsible.Indicator className="chevron">›</Collapsible.Indicator>
 * // .chevron[data-state='open'] { rotate: 90deg; }
 */
export function CollapsibleIndicator(props: CollapsibleIndicatorProps): ReactElement {
  const api = useCollapsibleContext();
  return <Primitive.span {...mergeProps(api.getIndicatorProps(), props)} />;
}
