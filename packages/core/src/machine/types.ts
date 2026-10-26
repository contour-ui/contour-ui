/** An event a machine receives: a `type` and any payload. */
export interface MachineEvent {
  readonly type: string;
}

/**
 * Events the runtime sends itself: the start of the service, a delay that ran out, and a change
 * of watched props. Machines never send them.
 */
export type InternalEvent =
  | { readonly type: 'machine.start' }
  | { readonly type: 'machine.after'; readonly delay: string }
  | { readonly type: 'machine.props' };

/**
 * The types a machine is made of. Each machine declares one interface with every member and
 * passes it to {@link createMachine}; use `never` for a member it does not need.
 *
 * Everything that touches the environment (the clipboard, focus, the DOM) is a platform action
 * or a platform effect: the machine names it, the adapter's {@link Platform} implements it.
 */
export interface MachineSchema {
  /** What the owner passes, as `createService` and `useMachine` take it. */
  readonly input: object;
  /** What the machine reads through `prop()`: the input with defaults filled in by `config.props`. */
  readonly props: object;
  /** Values that change while the machine runs; each one is owned by the machine or controlled by a prop. */
  readonly context: object;
  /** The names of the states. */
  readonly state: string;
  /** The events the machine handles. */
  readonly event: MachineEvent;
  /** Actions the machine implements (`config.actions`): context updates, prop callbacks, `send`. */
  readonly action: string;
  /** Conditions the machine implements (`config.guards`). */
  readonly guard: string;
  /** Durations the machine implements (`config.delays`), for `after`. */
  readonly delay: string;
  /** One-off side effects the platform implements (`platform.actions`), such as `writeText`. */
  readonly platformAction: string;
  /** Side effects the platform keeps running while a state is active (`platform.effects`). */
  readonly platformEffect: string;
}

/** The name of an action: one the machine implements, or one the platform does. */
export type ActionName<S extends MachineSchema> = S['action'] | S['platformAction'];

/** Reads and writes the context of a running machine. */
export interface MachineContext<C extends object> {
  /** The current value of a field: the controlled value if its prop is set, the machine's own otherwise. */
  readonly get: <K extends keyof C>(key: K) => C[K];
  /**
   * Change a field. A value equal to the current one is dropped. An owned field takes the value
   * and reports it through `onChange`; a controlled field only reports it, and changes when the
   * owner passes the new value back.
   */
  readonly set: <K extends keyof C>(key: K, value: C[K]) => void;
}

/** What guards and delays receive: reads only. */
export interface MachineReadParams<S extends MachineSchema> {
  /** The current value of a prop, defaults filled in. */
  readonly prop: <K extends keyof S['props']>(key: K) => S['props'][K];
  /** Reads of the context. */
  readonly context: Pick<MachineContext<S['context']>, 'get'>;
  /** The event being handled. */
  readonly event: S['event'] | InternalEvent;
}

/** What actions and platform effects receive. */
export interface MachineParams<S extends MachineSchema> extends MachineReadParams<S> {
  /** Reads and writes of the context. */
  readonly context: MachineContext<S['context']>;
  /** Send an event to the machine. It is handled after the current one, never in the middle of it. */
  readonly send: (event: S['event']) => void;
}

/**
 * How one context field gets its value. Evaluated on every read and write, so it always sees
 * the current props.
 */
export interface ContextFieldConfig<T> {
  /**
   * The controlled value. While it is defined, the owner controls the field: reads return it and
   * writes only call `onChange`. `undefined` means the machine owns the field.
   */
  readonly value?: T | undefined;
  /** The starting value of the machine's own copy. Read once, when the service is created. */
  readonly defaultValue: T;
  /** Called with every new value, owned or controlled. Not called for a value equal to the current one. */
  readonly onChange?: ((value: T) => void) | undefined;
  /** Whether two values are the same. Defaults to `Object.is`. */
  readonly isEqual?: ((a: T, b: T) => boolean) | undefined;
}

/** What context fields read when they are evaluated. */
export interface ContextFieldParams<S extends MachineSchema> {
  readonly prop: <K extends keyof S['props']>(key: K) => S['props'][K];
}

/**
 * A transition: where an event leads and what runs on the way.
 *
 * - Without `target`, or with the current state as `target`, the machine stays in its state:
 *   only `actions` run; effects keep running and delays keep counting.
 * - With another `target`, the machine leaves its state (effects stop, delays are cancelled,
 *   `exit` actions run), runs `actions`, and enters the target (`entry` actions run, effects
 *   start, delays are scheduled).
 * - `reenter: true` leaves and enters the current state again, so its delays start over.
 */
export interface TransitionConfig<S extends MachineSchema> {
  readonly target?: S['state'] | undefined;
  /** Taken only when this guard returns `true`. */
  readonly guard?: S['guard'] | undefined;
  readonly actions?: ReadonlyArray<ActionName<S>> | undefined;
  readonly reenter?: boolean | undefined;
}

/** For each event, its transition, or a list tried in order: the first whose guard passes is taken. */
export type TransitionMap<S extends MachineSchema> = {
  readonly [T in S['event']['type']]?: TransitionConfig<S> | ReadonlyArray<TransitionConfig<S>>;
};

/** A state of a machine. */
export interface StateConfig<S extends MachineSchema> {
  /** The events this state handles. They take precedence over the machine's `on`. */
  readonly on?: TransitionMap<S> | undefined;
  /** Actions that run when the machine enters this state. */
  readonly entry?: ReadonlyArray<ActionName<S>> | undefined;
  /** Actions that run when the machine leaves this state. */
  readonly exit?: ReadonlyArray<ActionName<S>> | undefined;
  /** Platform effects that run while the machine is in this state. */
  readonly effects?: ReadonlyArray<S['platformEffect']> | undefined;
  /**
   * Delayed transitions: when a delay (`config.delays`) runs out while the machine is still in
   * this state, its transition is taken. A string is a target.
   */
  readonly after?: { readonly [D in S['delay']]?: S['state'] | TransitionConfig<S> } | undefined;
}

/** A machine: plain data plus the pure functions it is made of. Build one with {@link createMachine}. */
export interface MachineConfig<S extends MachineSchema> {
  /** Fills in the defaults of the input. Called on start and on every props update. */
  readonly props: (input: S['input']) => S['props'];
  /** How each context field gets its value. */
  readonly context: {
    readonly [K in keyof S['context']]: (
      params: ContextFieldParams<S>,
    ) => ContextFieldConfig<S['context'][K]>;
  };
  /** The state the machine starts in. */
  readonly initial: S['state'] | ((params: ContextFieldParams<S>) => S['state']);
  readonly states: { readonly [K in S['state']]: StateConfig<S> };
  /** Events handled in every state that does not handle them itself. */
  readonly on?: TransitionMap<S> | undefined;
  /** Actions to run when a prop changes: the way a machine follows a controlled prop. */
  readonly watch?: { readonly [K in keyof S['props']]?: ReadonlyArray<ActionName<S>> } | undefined;
  readonly actions: { readonly [A in S['action']]: (params: MachineParams<S>) => void };
  readonly guards: { readonly [G in S['guard']]: (params: MachineReadParams<S>) => boolean };
  readonly delays: { readonly [D in S['delay']]: (params: MachineReadParams<S>) => number };
}

/** A validated machine definition. */
export type Machine<S extends MachineSchema> = MachineConfig<S>;

/**
 * What a machine needs from its environment, given by the adapter (DOM, Soundor, tests). Core
 * has no clock and no globals of its own.
 */
export interface Platform<S extends MachineSchema> {
  /** Call `fire` after `ms` milliseconds; return a function that cancels the call. */
  schedule(ms: number, fire: () => void): () => void;
  /** The one-off side effects of the machine, by name. */
  readonly actions: { readonly [A in S['platformAction']]: (params: MachineParams<S>) => void };
  /**
   * The effects of the machine, by name: started when the machine enters a state that lists
   * them, and stopped, through the returned cleanup, when it leaves it.
   */
  readonly effects: {
    readonly [E in S['platformEffect']]: (params: MachineParams<S>) => (() => void) | undefined;
  };
}

/** What the runtime asks for when a transition is taken, in the order it does it. */
export type Command<S extends MachineSchema> =
  | { readonly type: 'run'; readonly action: ActionName<S> }
  | { readonly type: 'start'; readonly effect: S['platformEffect'] }
  | { readonly type: 'stop'; readonly effect: S['platformEffect'] }
  | { readonly type: 'schedule'; readonly delay: S['delay']; readonly ms: number }
  | { readonly type: 'cancel'; readonly delay: S['delay'] };

/** The outcome of an event: the next state and the commands that get there. */
export interface TransitionResult<S extends MachineSchema> {
  /** Whether the event meant anything in the current state. */
  readonly taken: boolean;
  readonly state: S['state'];
  readonly commands: ReadonlyArray<Command<S>>;
}

/**
 * What changes when the machine moves: its state and the values it owns. A new object after
 * every change and the same object otherwise, as `useSyncExternalStore` expects.
 */
export interface MachineSnapshot<S extends MachineSchema> {
  readonly state: S['state'];
  /**
   * The machine's own copy of every context field. A controlled field keeps its default here;
   * read current values through `service.context.get`.
   */
  readonly context: Readonly<S['context']>;
}

/**
 * A running machine. Create one with {@link createService}. Its members are plain functions, not
 * methods: pass them on as they are (`useSyncExternalStore(service.subscribe, …)`).
 */
export interface Service<S extends MachineSchema> {
  /** The current snapshot. */
  readonly getSnapshot: () => MachineSnapshot<S>;
  /** Call `listener` after every change of the snapshot; returns the unsubscribe function. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Handle an event. Ignored before `start()` and after `stop()`. */
  readonly send: (event: S['event']) => void;
  /** Whether the machine is in one of these states. */
  readonly matches: (...states: ReadonlyArray<S['state']>) => boolean;
  /** The current value of a prop, defaults filled in. */
  readonly prop: <K extends keyof S['props']>(key: K) => S['props'][K];
  /** Reads and writes of the context. Reads see controlled values from the current props. */
  readonly context: MachineContext<S['context']>;
  /**
   * Replace the props. Safe to call while rendering: it only stores them, so reads see them at
   * once. `watch` actions run on the next `syncProps()`.
   */
  readonly setProps: (input: S['input']) => void;
  /** Run the `watch` actions of the props that changed since the last call. */
  readonly syncProps: () => void;
  /**
   * Start the machine: enter its state (entry actions on the first start only), start the
   * effects of that state and schedule its delays.
   */
  readonly start: () => void;
  /**
   * Stop the machine: cancel its delays and stop its effects (no exit actions). Events sent
   * after it are ignored. `start()` resumes the current state.
   */
  readonly stop: () => void;
}
