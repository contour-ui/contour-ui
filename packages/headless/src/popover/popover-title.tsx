import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePopoverContext } from './popover-context.ts';

export type PopoverTitleProps = PrimitiveProps<'div'>;

/**
 * Popover title: a `div` that names the content (`aria-labelledby`). For a heading, pass one
 * with `asChild`.
 *
 * @example
 * <Popover.Title asChild>
 *   <h2>Share this page</h2>
 * </Popover.Title>
 */
export function PopoverTitle({ ref, ...props }: PopoverTitleProps): ReactElement {
  const api = usePopoverContext();
  const ownProps = api.getTitleProps();
  const composedRef = useComposedRefs<HTMLDivElement>(ownProps.ref, ref);
  return <Primitive.div {...mergeProps(ownProps, props)} ref={composedRef} />;
}
