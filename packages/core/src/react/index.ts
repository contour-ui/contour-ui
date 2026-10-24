import { useMemo } from 'react';

import { createMachine } from '../machine/index.ts';
import type { Machine } from '../machine/index.ts';

/**
 * `@contour-ui/core/react`: the only React-aware entry of core (React is an
 * optional peer). Placeholder for the future `useMachine` hook.
 */
export function useMachine(id: string): Machine {
  return useMemo(() => createMachine(id), [id]);
}
