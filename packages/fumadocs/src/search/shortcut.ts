'use client';

import { useSyncExternalStore } from 'react';

/** The keys of the search shortcut, one `Kbd` each, as each platform names them. */
export const SHORTCUT_KEYS = {
  apple: ['⌘', 'K'],
  other: ['Ctrl', 'K'],
} as const;

/** The search shortcut as `aria-keyshortcuts` names it, by platform. */
export const ARIA_SHORTCUT = {
  apple: 'Meta+K',
  other: 'Control+K',
} as const;

/**
 * The platform of the browser, as the User-Agent Client Hints of Chromium give it; `undefined`
 * without them, or when they leave it empty, as an overridden user agent may.
 */
function clientHintsPlatform(): string | undefined {
  if (!('userAgentData' in navigator)) {
    return undefined;
  }
  const data: unknown = navigator.userAgentData;
  return typeof data === 'object' &&
    data !== null &&
    'platform' in data &&
    typeof data.platform === 'string' &&
    data.platform !== ''
    ? data.platform
    : undefined;
}

/**
 * Whether the browser runs on an Apple platform (macOS, iOS, iPadOS), where shortcuts take ⌘:
 * from the client hints where the browser has them, else `navigator.platform`, else the user
 * agent. iPadOS calls itself `MacIntel`, and takes ⌘ as well.
 */
export function isApplePlatform(): boolean {
  const platform = clientHintsPlatform() ?? (navigator.platform || navigator.userAgent);
  return /mac|iphone|ipad|ipod/iu.test(platform);
}

/** The platform never changes while the page is open: nothing to subscribe to. */
const subscribe = (): (() => void) => () => {};

/** The server snapshot: a prerendered page cannot know the platform. */
const unknownOnServer = (): undefined => undefined;

/**
 * Whether the page runs on an Apple platform: `undefined` while the page is prerendered and in
 * the render that hydrates it, so that render matches the prerendered HTML; known from the next
 * render on.
 */
export function useApplePlatform(): boolean | undefined {
  return useSyncExternalStore(subscribe, isApplePlatform, unknownOnServer);
}

/**
 * Whether `event` presses the K key: the letter K of the layout or, on a layout without Latin
 * letters (such as Russian), the key in the place of K.
 */
function pressesK(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return key === 'k' || (!/^[a-z]$/u.test(key) && event.code === 'KeyK');
}

/** Whether `target` takes typed text: a text field, a text area or editable content. */
function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Whether `event` presses the search shortcut: ⌘K or Ctrl K, without Shift or Alt, on every
 * platform. One exception: on Apple platforms, Ctrl K in a text field deletes to the end of
 * the line, so it is left to the field there.
 */
export function isSearchShortcut(event: KeyboardEvent, apple: boolean): boolean {
  if (event.altKey || event.shiftKey || event.metaKey === event.ctrlKey || !pressesK(event)) {
    return false;
  }
  return event.metaKey || !apple || !isEditable(event.target);
}
