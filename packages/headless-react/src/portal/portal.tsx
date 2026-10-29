'use client';

import { useSyncExternalStore } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

/** A node that {@link Portal} renders into: an element, or a fragment such as a shadow root. */
export type PortalContainer = Element | DocumentFragment;

/** Props of {@link Portal}. */
export interface PortalProps {
  /** What the portal renders in its container. */
  children?: ReactNode;
  /**
   * Where the children go: an element, or a ref to one. The ref is read again after every commit
   * of the portal, so it may point at an element rendered in the same commit. While there is no
   * element (`null`, or a ref that is still empty), the portal renders nothing: it never falls
   * back to `document.body`. Without a container, the children go to the end of `document.body`.
   */
  container?: PortalContainer | RefObject<PortalContainer | null> | null | undefined;
  /**
   * Render the children in place, as if there were no portal, on the server too.
   *
   * @defaultValue false
   */
  disabled?: boolean | undefined;
}

/**
 * Nothing to subscribe to: the node changes only in a commit, and React reads the snapshot again
 * after every commit of the portal.
 */
function subscribe(): () => void {
  return () => undefined;
}

/** The server renders nothing, and so does the render that hydrates its markup. */
const onServer = (): null => null;

/** The node to render into, or `null` while there is none. Reads `document`: client only. */
function targetOf(container: PortalProps['container']): PortalContainer | null {
  if (container === undefined) {
    return document.body;
  }
  if (container === null) {
    return null;
  }
  return 'current' in container ? container.current : container;
}

/**
 * Portal: renders its children into another place of the DOM, at the end of `document.body` or
 * into `container`, so that an overlay escapes the `overflow` and the stacking context of its
 * parents. Nothing else changes: context reaches the children, and their events bubble up the
 * React tree, through the components around the portal. It renders no element of its own.
 *
 * Server rendering gives nothing, and so does the render that hydrates it, so the markup matches;
 * the children are rendered into the container right after. A render on the client alone puts
 * them there at once. `disabled` renders them in place, on the server too.
 *
 * @example
 * <Portal>
 *   <div className="toast">Saved</div>
 * </Portal>
 *
 * @example
 * const layerRef = useRef<HTMLDivElement>(null);
 * <>
 *   <div ref={layerRef} className="layer" />
 *   <Portal container={layerRef}>…</Portal>
 * </>;
 */
export function Portal({ children, container, disabled = false }: PortalProps): ReactNode {
  // After the commit that sets a ref, React sees that the snapshot changed and renders again.
  const target = useSyncExternalStore(subscribe, () => targetOf(container), onServer);
  if (disabled) {
    return children;
  }
  return target === null ? null : createPortal(children, target);
}
