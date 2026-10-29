'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePopoverContext } from './popover-context.ts';

export type PopoverDescriptionProps = PrimitiveProps<'div'>;

/**
 * Popover description: a `div` that describes the content (`aria-describedby`), read after the
 * title.
 *
 * @example
 * <Popover.Description>Anyone with the link can view it.</Popover.Description>
 */
export function PopoverDescription({ ref, ...props }: PopoverDescriptionProps): ReactElement {
  const api = usePopoverContext();
  const ownProps = api.getDescriptionProps();
  const composedRef = useComposedRefs<HTMLDivElement>(ownProps.ref, ref);
  return <Primitive.div {...mergeProps(ownProps, props)} ref={composedRef} />;
}
