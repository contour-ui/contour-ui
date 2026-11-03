'use client';

import { useSyncExternalStore } from 'react';

import type { InteractionState, InteractionStore } from './interaction.ts';

/**
 * One field of an element's interaction state, followed: the component renders again when that
 * field changes, and only then. Read the store of a part from its context.
 *
 * @example
 * function DragHint(): ReactElement | null {
 *   const { interaction } = useKnobContext();
 *   const hovered = useInteractionField(interaction, 'hovered');
 *   return hovered ? <Hint /> : null;
 * }
 */
export function useInteractionField<Field extends keyof InteractionState>(
  store: InteractionStore,
  field: Field,
): InteractionState[Field] {
  const read = (): InteractionState[Field] => store.getState()[field];
  return useSyncExternalStore(store.subscribe, read, read);
}
