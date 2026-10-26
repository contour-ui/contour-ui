import type {
  Command,
  InternalEvent,
  Machine,
  MachineEvent,
  MachineReadParams,
  MachineSchema,
  StateConfig,
  TransitionConfig,
  TransitionMap,
  TransitionResult,
} from './types.ts';

/** The keys of an object, typed as its keys rather than as `string`. */
export function keysOf<T extends object>(record: T): Array<keyof T & string> {
  // `Object.keys` returns exactly the own string keys of `record`.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.keys(record) as Array<keyof T & string>;
}

type AfterEvent = Extract<InternalEvent, { type: 'machine.after' }>;

const isAfterEvent = (event: MachineEvent): event is AfterEvent => event.type === 'machine.after';

/** A value or a list of them, as transition maps hold them. */
export function isList<T>(value: T | readonly T[]): value is readonly T[] {
  return Array.isArray(value);
}

/** The transitions an event may take from a map, in the order they are tried. */
function candidates<S extends MachineSchema>(
  map: TransitionMap<S> | undefined,
  type: string,
): ReadonlyArray<TransitionConfig<S>> {
  if (map === undefined || !Object.hasOwn(map, type)) {
    return [];
  }
  const value: TransitionConfig<S> | ReadonlyArray<TransitionConfig<S>> | undefined =
    map[type as S['event']['type']];
  if (value === undefined) {
    return [];
  }
  return isList(value) ? value : [value];
}

/** The transition of a delay that ran out. */
function delayed<S extends MachineSchema>(
  state: StateConfig<S>,
  delay: string,
): ReadonlyArray<TransitionConfig<S>> {
  const after = state.after;
  if (after === undefined || !Object.hasOwn(after, delay)) {
    return [];
  }
  const value = after[delay as S['delay']];
  if (value === undefined) {
    return [];
  }
  return [typeof value === 'string' ? { target: value } : value];
}

/** The first transition whose guard passes. */
function pick<S extends MachineSchema>(
  machine: Machine<S>,
  transitions: ReadonlyArray<TransitionConfig<S>>,
  read: MachineReadParams<S>,
): TransitionConfig<S> | undefined {
  return transitions.find(
    (candidate) => candidate.guard === undefined || machine.guards[candidate.guard](read),
  );
}

/**
 * The commands that enter a state: entry actions (unless `entry` is false), then its effects
 * start, then its delays are scheduled.
 */
export function enterState<S extends MachineSchema>(
  machine: Machine<S>,
  name: S['state'],
  read: MachineReadParams<S>,
  { entry = true }: { readonly entry?: boolean } = {},
): Array<Command<S>> {
  const state = machine.states[name];
  const commands: Array<Command<S>> = [];
  if (entry) {
    for (const action of state.entry ?? []) {
      commands.push({ type: 'run', action });
    }
  }
  for (const effect of state.effects ?? []) {
    commands.push({ type: 'start', effect });
  }
  if (state.after !== undefined) {
    for (const delay of keysOf(state.after)) {
      commands.push({ type: 'schedule', delay, ms: machine.delays[delay](read) });
    }
  }
  return commands;
}

/**
 * The commands that leave a state: its delays are cancelled, its effects stop (last started
 * first), then exit actions run (unless `exit` is false).
 */
export function leaveState<S extends MachineSchema>(
  machine: Machine<S>,
  name: S['state'],
  { exit = true }: { readonly exit?: boolean } = {},
): Array<Command<S>> {
  const state = machine.states[name];
  const commands: Array<Command<S>> = [];
  if (state.after !== undefined) {
    for (const delay of keysOf(state.after)) {
      commands.push({ type: 'cancel', delay });
    }
  }
  for (const effect of (state.effects ?? []).toReversed()) {
    commands.push({ type: 'stop', effect });
  }
  if (exit) {
    for (const action of state.exit ?? []) {
      commands.push({ type: 'run', action });
    }
  }
  return commands;
}

/**
 * Where an event leads from a state, and the commands on the way. Pure: it runs nothing, it
 * only decides. The state's own transitions are tried first; when none of them is taken, the
 * machine-level ones (`config.on`). A delay that ran out takes the state's `after` transition.
 *
 * @example
 * transition(clipboardMachine, 'idle', { type: 'COPY' }, read);
 * // { taken: true, state: 'copied', commands: [{ type: 'run', action: 'writeText' }, …] }
 */
export function transition<S extends MachineSchema>(
  machine: Machine<S>,
  current: S['state'],
  event: S['event'] | InternalEvent,
  read: MachineReadParams<S>,
): TransitionResult<S> {
  const state = machine.states[current];
  const chosen = isAfterEvent(event)
    ? pick(machine, delayed(state, event.delay), read)
    : (pick(machine, candidates(state.on, event.type), read) ??
      pick(machine, candidates(machine.on, event.type), read));

  if (chosen === undefined) {
    return { taken: false, state: current, commands: [] };
  }
  const target = chosen.target ?? current;
  const leaves = target !== current || chosen.reenter === true;
  const actions: Array<Command<S>> = (chosen.actions ?? []).map((action) => ({
    type: 'run',
    action,
  }));
  return {
    taken: true,
    state: target,
    commands: leaves
      ? [...leaveState(machine, current), ...actions, ...enterState(machine, target, read)]
      : actions,
  };
}
