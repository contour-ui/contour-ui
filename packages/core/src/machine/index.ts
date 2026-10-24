/** Placeholder for the tiny FSM. `states/` and `interactions/` build on this module. */
export interface Machine {
  readonly id: string;
}

export function createMachine(id: string): Machine {
  return { id };
}
