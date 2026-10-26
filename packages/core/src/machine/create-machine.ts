import { isList } from './transition.ts';
import type {
  ActionName,
  Machine,
  MachineConfig,
  MachineSchema,
  StateConfig,
  TransitionConfig,
  TransitionMap,
} from './types.ts';

/** The names a platform must implement for a machine. */
export interface PlatformNames<S extends MachineSchema> {
  readonly actions: ReadonlySet<S['platformAction']>;
  readonly effects: ReadonlySet<S['platformEffect']>;
}

const has = (record: object, key: string): boolean => Object.hasOwn(record, key);

/** Every transition of a map, single or listed. */
function transitionsOf<S extends MachineSchema>(
  map: TransitionMap<S> | undefined,
): Array<TransitionConfig<S>> {
  const all: Array<TransitionConfig<S>> = [];
  for (const value of Object.values<
    TransitionConfig<S> | ReadonlyArray<TransitionConfig<S>> | undefined
  >(map ?? {})) {
    if (value !== undefined) {
      all.push(...(isList(value) ? value : [value]));
    }
  }
  return all;
}

/** Every transition of a state: its events and its delays. */
function stateTransitions<S extends MachineSchema>(
  state: StateConfig<S>,
): Array<TransitionConfig<S>> {
  const delayed = Object.values<S['state'] | TransitionConfig<S> | undefined>(state.after ?? {})
    .filter((value) => value !== undefined)
    .map((value) => (typeof value === 'string' ? { target: value } : value));
  return [...transitionsOf(state.on), ...delayed];
}

/** Every action name a machine uses, in states, transitions and `watch`. */
function actionNames<S extends MachineSchema>(config: MachineConfig<S>): Set<ActionName<S>> {
  const names = new Set<ActionName<S>>();
  const add = (list: ReadonlyArray<ActionName<S>> | undefined): void => {
    for (const name of list ?? []) {
      names.add(name);
    }
  };
  for (const transition of transitionsOf(config.on)) {
    add(transition.actions);
  }
  for (const state of Object.values<StateConfig<S>>(config.states)) {
    add(state.entry);
    add(state.exit);
    for (const transition of stateTransitions(state)) {
      add(transition.actions);
    }
  }
  for (const list of Object.values<ReadonlyArray<ActionName<S>> | undefined>(config.watch ?? {})) {
    add(list);
  }
  return names;
}

/**
 * The platform actions and effects a machine uses: the action names it does not implement
 * itself, and every effect name.
 */
export function platformNames<S extends MachineSchema>(machine: Machine<S>): PlatformNames<S> {
  const actions = new Set<S['platformAction']>();
  for (const name of actionNames(machine)) {
    if (!has(machine.actions, name)) {
      // Not implemented by the machine, so the platform implements it (see `MachineSchema`).
      actions.add(name);
    }
  }
  const effects = new Set<S['platformEffect']>();
  for (const state of Object.values<StateConfig<S>>(machine.states)) {
    for (const effect of state.effects ?? []) {
      effects.add(effect);
    }
  }
  return { actions, effects };
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`createMachine: ${message}`);
  }
}

/**
 * Define a machine: states, transitions, context, and the guards, delays and actions it
 * implements; side effects of the environment are named and left to the platform. The
 * definition is checked at once: every target, guard and delay it names must exist.
 *
 * @example
 * const toggle = createMachine<ToggleSchema>({
 *   props: (input) => input,
 *   context: {},
 *   initial: 'off',
 *   states: {
 *     off: { on: { TOGGLE: { target: 'on' } } },
 *     on: { on: { TOGGLE: { target: 'off' } } },
 *   },
 *   actions: {},
 *   guards: {},
 *   delays: {},
 * });
 */
export function createMachine<S extends MachineSchema>(config: MachineConfig<S>): Machine<S> {
  const isState = (name: string): boolean => has(config.states, name);
  const checkTransition = (transition: TransitionConfig<S>, where: string): void => {
    check(
      transition.target === undefined || isState(transition.target),
      `${where} targets the unknown state "${String(transition.target)}".`,
    );
    check(
      transition.guard === undefined || has(config.guards, transition.guard),
      `${where} uses the unknown guard "${String(transition.guard)}".`,
    );
  };

  check(
    typeof config.initial === 'function' || isState(config.initial),
    `the initial state "${String(config.initial)}" is not a state.`,
  );
  for (const transition of transitionsOf(config.on)) {
    checkTransition(transition, 'a machine-level transition');
  }
  for (const [name, state] of Object.entries<StateConfig<S>>(config.states)) {
    for (const transition of stateTransitions(state)) {
      checkTransition(transition, `a transition of state "${name}"`);
    }
    for (const delay of Object.keys(state.after ?? {})) {
      check(has(config.delays, delay), `state "${name}" uses the unknown delay "${delay}".`);
    }
  }
  return config;
}
