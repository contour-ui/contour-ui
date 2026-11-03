/** What a pointer lock reports to the drag that asked for it. */
export interface PointerLockHandlers {
  /** The lock ended while the drag still wanted it: the user left it (Escape). */
  readonly onLost: () => void;
  /** The browser refused the lock, or has none: the drag goes on with the pointer capture. */
  readonly onRefused: () => void;
}

/**
 * Lock the pointer to `element` for a drag (`requestPointerLock()`): the pointer hides, and no
 * edge of the screen stops the drag. Returns what gives the lock back at the end of the drag, also
 * when the browser grants it only after that. The lock ending while the drag goes on (the user
 * pressed Escape) calls `onLost`; a refusal calls `onRefused`.
 */
export function lockPointer(
  element: Element,
  { onLost, onRefused }: PointerLockHandlers,
): () => void {
  const doc = element.ownerDocument;
  /** Whether the drag still wants the lock. */
  let wanted = true;
  const stop = (): void => {
    doc.removeEventListener('pointerlockchange', onChange);
    doc.removeEventListener('pointerlockerror', onError);
  };
  function onChange(): void {
    if (doc.pointerLockElement === element) {
      // Granted after the drag ended: given back at once.
      if (!wanted) {
        doc.exitPointerLock();
      }
      return;
    }
    // Given back: at the end of the drag, or by the user, which ends the drag too.
    stop();
    if (wanted) {
      wanted = false;
      onLost();
    }
  }
  function onError(): void {
    stop();
    if (wanted) {
      onRefused();
    }
  }
  doc.addEventListener('pointerlockchange', onChange);
  doc.addEventListener('pointerlockerror', onError);
  try {
    // A promise in Chrome, which rejects as `pointerlockerror` fires: that event handles it.
    const request: unknown = element.requestPointerLock();
    if (request instanceof Promise) {
      request.catch(() => undefined);
    }
  } catch {
    // No pointer lock here (iOS): the drag goes on with the pointer capture.
    onError();
  }
  return () => {
    wanted = false;
    if (doc.pointerLockElement === element) {
      doc.exitPointerLock();
    }
  };
}
