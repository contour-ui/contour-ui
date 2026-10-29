'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';
import type { RefCallback } from 'react';

/**
 * Write the size the content takes when it is open, in pixels, as `--height` and `--width` on
 * the element: its `scrollHeight` and `scrollWidth`, which do not depend on a `height` its
 * animation sets while `overflow` is hidden. Nothing is written while it is `hidden`, so the
 * values stay those of the open content, to animate from as it closes.
 */
function writeSize(element: HTMLElement): void {
  if (element.hidden !== false) {
    return;
  }
  const height = `${element.scrollHeight}px`;
  const width = `${element.scrollWidth}px`;
  // Only on a change: a write that resizes an animating element inside the observer's callback
  // would be reported again in the same frame.
  if (element.style.getPropertyValue('--height') !== height) {
    element.style.setProperty('--height', height);
  }
  if (element.style.getPropertyValue('--width') !== width) {
    element.style.setProperty('--width', width);
  }
}

/**
 * Keep `--height` and `--width` on the content up to date: measured as it opens, before the
 * browser paints (so an open animation starts with the size it ends at), and again
 * whenever the content resizes while it shows, as when its children change. Returns the ref of
 * the content.
 */
export function useContentSize(open: boolean): RefCallback<HTMLElement> {
  const elementRef = useRef<HTMLElement | null>(null);
  const ref = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
    if (element === null) {
      return undefined;
    }
    writeSize(element);
    // Not in every DOM (jsdom has none): the size is then measured as the content opens only.
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      writeSize(element);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      elementRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (open && elementRef.current !== null) {
      writeSize(elementRef.current);
    }
  }, [open]);

  return ref;
}
