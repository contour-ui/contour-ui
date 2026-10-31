import { overlayRoot, root } from 'soundor:ui';
import type { KeyboardEvent, UiNode } from 'soundor:ui';
import { useEffect } from 'react';

/** Whether the last input was a key rather than a pointer: what `:focus-visible` reads on the web. */
let keyboard = false;

/** The roots that report input here. A test runtime makes new roots for every test. */
const tracked = new WeakSet<UiNode>();

function onKeyDown(event: KeyboardEvent): void {
  // A shortcut with a modifier is not a move through the controls.
  if (!event.metaKey && !event.altKey && !event.ctrlKey) {
    keyboard = true;
  }
}

function onPointerDown(): void {
  keyboard = false;
}

/** Listen on both roots, in the capture phase, so every key and press is seen first. */
function trackInput(): void {
  for (const node of [root, overlayRoot]) {
    if (!tracked.has(node)) {
      tracked.add(node);
      node.addEventListener('keydown', onKeyDown, { capture: true });
      node.addEventListener('pointerdown', onPointerDown, { capture: true });
    }
  }
}

/**
 * Soundor's `focused` is the same for a press and for Tab. This tells them apart as
 * `:focus-visible` does: the returned function says whether a focused control shows its focus,
 * which it does when the last input was a key. Call it from the style function of a `Pressable`.
 */
export function useFocusVisible(): (focused: boolean) => boolean {
  useEffect(trackInput, []);
  return isFocusVisible;
}

function isFocusVisible(focused: boolean): boolean {
  return focused && keyboard;
}
