import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UseKnobReturn } from './use-knob.ts';

/** The API of the nearest `Knob.Root`, for its parts. */
export const KnobContext: Context<UseKnobReturn | null> = createContext<UseKnobReturn | null>(null);

/**
 * The API of the nearest `Knob.Root`: the value and its text, the position and angle of the
 * value, the shapes of the dial, whether the pointer is over the control, `setValue()` and the
 * props of its parts. For parts of your own inside the root; throws outside of one.
 *
 * @example
 * function Cap(): ReactElement {
 *   const { angle } = useKnobContext();
 *   return <View style={{ transform: [{ rotate: `${angle}deg` }] }} />;
 * }
 */
export function useKnobContext(): UseKnobReturn {
  const api = use(KnobContext);
  if (api === null) {
    throw new Error('Knob: render the parts inside <Knob.Root>.');
  }
  return api;
}
