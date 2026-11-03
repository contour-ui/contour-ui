'use client';

import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UseClipboardReturn } from './use-clipboard.ts';

/** The API of the nearest `Clipboard.Root`, for its parts. */
export const ClipboardContext: Context<UseClipboardReturn | null> =
  createContext<UseClipboardReturn | null>(null);

/**
 * The API of the nearest `Clipboard.Root`: `copied`, `value`, `copy()`, `setValue()` and the
 * props of its elements. For parts of your own inside the root; throws outside of one.
 *
 * @example
 * function CopyStatus(): ReactElement {
 *   const { copied } = useClipboardContext();
 *   return <span>{copied ? 'Copied' : 'Not copied yet'}</span>;
 * }
 */
export function useClipboardContext(): UseClipboardReturn {
  const api = use(ClipboardContext);
  if (api === null) {
    throw new Error('Clipboard: render the parts inside <Clipboard.Root>.');
  }
  return api;
}
