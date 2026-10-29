'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useCollapsibleContext } from './collapsible-context.ts';
import { useContentSize } from './collapsible-size.ts';

export type CollapsibleContentProps = PrimitiveProps<'div'>;

/**
 * Collapsible content: the `div` the trigger shows and hides. It carries `data-state` (`open` or
 * `closed`) for its animations, and the size it takes when open as `--height` and `--width`, in
 * pixels, kept up to date while it resizes: animate `height` from `0` to `var(--height)` and
 * back with `@keyframes` (and `overflow: hidden`). Once closed, it stays on screen, `inert`,
 * while its exit animation runs, then gets `hidden` (or unmounts with `unmountOnExit`). Content
 * that starts open shows at once, without its open animation (`animation-name: none` until it
 * first closes).
 *
 * @example
 * <Collapsible.Content className="details">Ships in two days.</Collapsible.Content>
 * // .details { overflow: hidden; }
 * // .details[data-state='open'] { animation: expand 200ms; }
 * // .details[data-state='closed'] { animation: collapse 150ms; }
 * // @keyframes expand { from { height: 0; } to { height: var(--height); } }
 * // @keyframes collapse { from { height: var(--height); } to { height: 0; } }
 */
export function CollapsibleContent({
  ref,
  ...props
}: CollapsibleContentProps): ReactElement | null {
  const api = useCollapsibleContext();
  const { mounted, ref: presenceRef, getPresenceProps } = api.presence;
  const { ref: idRef, ...ownProps } = api.getContentProps();
  const sizeRef = useContentSize(api.open);
  const presenceIdRef = useComposedRefs<HTMLDivElement>(presenceRef, idRef);
  const ownRef = useComposedRefs<HTMLDivElement>(presenceIdRef, sizeRef);
  const composedRef = useComposedRefs<HTMLDivElement>(ownRef, ref);
  if (!mounted) {
    return null;
  }
  const style = api.skipAnimation ? { animationName: 'none' } : undefined;
  return (
    <Primitive.div
      {...mergeProps({ ...ownProps, style }, getPresenceProps(), props)}
      ref={composedRef}
    />
  );
}
