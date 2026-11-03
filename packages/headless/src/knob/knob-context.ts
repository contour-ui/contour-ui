'use client';

import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UseKnobReturn } from './use-knob.ts';

/** The API of the nearest `Knob.Root`, for its parts. */
export const KnobContext: Context<UseKnobReturn | null> = createContext<UseKnobReturn | null>(null);

/**
 * The API of the nearest `Knob.Root`: the value and its text, the position and angle of the
 * value, the shapes of the dial, whether the knob is dragged, focused or hovered, `setValue()`
 * and the props of its elements. For parts of your own inside the root; throws outside of one.
 *
 * @example
 * function Pointer(): ReactElement {
 *   const { angle } = useKnobContext();
 *   return <div style={{ rotate: `${angle}deg` }} />;
 * }
 */
export function useKnobContext(): UseKnobReturn {
  const api = use(KnobContext);
  if (api === null) {
    throw new Error('Knob: render the parts inside <Knob.Root>.');
  }
  return api;
}
