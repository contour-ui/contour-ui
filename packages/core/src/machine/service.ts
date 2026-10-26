import { platformNames } from './create-machine.ts';
import { enterState, keysOf, transition } from './transition.ts';
import type {
  ActionName,
  Command,
  ContextFieldConfig,
  ContextFieldParams,
  InternalEvent,
  Machine,
  MachineContext,
  MachineParams,
  MachineReadParams,
  MachineSchema,
  MachineSnapshot,
  Platform,
  Service,
} from './types.ts';

/** What {@link createService} takes besides the machine. */
export interface ServiceOptions<S extends MachineSchema> {
  /** The owner's props; replace them later with `setProps`. */
  readonly props: S['input'];
  /** The environment: the clock and the platform actions and effects of the machine. */
  readonly platform: Platform<S>;
}

/** A scheduled delay; the token tells a current timer from a cancelled one. */
interface Timer {
  readonly token: object;
  cancel: () => void;
}

type Status = 'created' | 'running' | 'stopped';

/** Throw when the platform lacks an action or an effect the machine uses. */
function checkPlatform<S extends MachineSchema>(machine: Machine<S>, platform: Platform<S>): void {
  const names = platformNames(machine);
  for (const action of names.actions) {
    if (!Object.hasOwn(platform.actions, action)) {
      throw new Error(`createService: the platform has no action "${action}".`);
    }
  }
  for (const effect of names.effects) {
    if (!Object.hasOwn(platform.effects, effect)) {
      throw new Error(`createService: the platform has no effect "${effect}".`);
    }
  }
}

/**
 * Run a machine: keep its state and context, take transitions, and carry out their commands
 * through the platform (actions, effects, the clock). Nothing runs until `start()`.
 *
 * Events are handled one at a time: an event sent while another is being handled waits in a
 * queue. Subscribers are called once per handled event, after its commands and the events it
 * caused, when the snapshot changed.
 *
 * @example
 * const service = createService(clipboardMachine, { props: { value: 'npm i' }, platform });
 * service.start();
 * service.send({ type: 'COPY' });
 * service.matches('copied'); // true
 */
export function createService<S extends MachineSchema>(
  machine: Machine<S>,
  options: ServiceOptions<S>,
): Service<S> {
  const { platform } = options;
  checkPlatform(machine, platform);

  let props = machine.props(options.props);
  let syncedProps = props;
  const prop = <K extends keyof S['props']>(key: K): S['props'][K] => props[key];
  const fieldParams: ContextFieldParams<S> = { prop };
  const field = <K extends keyof S['context']>(key: K): ContextFieldConfig<S['context'][K]> =>
    machine.context[key](fieldParams);

  const ownValues = Object.fromEntries(
    keysOf(machine.context).map((key) => [key, field(key).defaultValue]),
  );
  let snapshot: MachineSnapshot<S> = {
    state: typeof machine.initial === 'function' ? machine.initial(fieldParams) : machine.initial,
    // Built from every key of `machine.context`, which is typed by `S['context']`.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    context: ownValues as S['context'],
  };

  let status: Status = 'created';
  let busy = false;
  /** The first error an action, an effect or a callback threw during the current macrostep. */
  let failure: { readonly error: unknown } | undefined;
  const queue: Array<S['event'] | InternalEvent> = [];
  const timers = new Map<S['delay'], Timer>();
  const cleanups = new Map<S['platformEffect'], () => void>();
  const listeners = new Set<() => void>();

  /** The value of a field: the controlled one while its prop is set, the machine's own otherwise. */
  const current = <K extends keyof S['context']>(
    key: K,
    config: ContextFieldConfig<S['context'][K]>,
  ): S['context'][K] =>
    // Not `??`: `null` is a valid controlled value, only `undefined` means uncontrolled.
    // oxlint-disable-next-line typescript/prefer-nullish-coalescing
    config.value === undefined ? snapshot.context[key] : config.value;
  const get = <K extends keyof S['context']>(key: K): S['context'][K] => current(key, field(key));
  const context: MachineContext<S['context']> = {
    get,
    set(key, value) {
      macrostep(() => {
        const config = field(key);
        if ((config.isEqual ?? Object.is)(current(key, config), value)) {
          return;
        }
        if (config.value === undefined) {
          snapshot = { ...snapshot, context: { ...snapshot.context, [key]: value } };
        }
        attempt(() => config.onChange?.(value));
      });
    },
  };
  const reads = { get };

  const readParams = (event: S['event'] | InternalEvent): MachineReadParams<S> => ({
    prop,
    context: reads,
    event,
  });
  const params = (event: S['event'] | InternalEvent): MachineParams<S> => ({
    prop,
    context,
    event,
    send,
  });

  /**
   * Run code the machine does not own (actions, effects, callbacks). If it throws, the error is
   * kept and the macrostep goes on, so the transition completes and the subscribers hear of it;
   * the first error is rethrown at the end.
   */
  function attempt(run: () => void): void {
    try {
      run();
    } catch (error) {
      failure ??= { error };
    }
  }

  function rethrow(): void {
    if (failure === undefined) {
      return;
    }
    const { error } = failure;
    failure = undefined;
    // What an action, an effect or a callback threw, as it was.
    // oxlint-disable-next-line typescript/only-throw-error
    throw error;
  }

  function runAction(name: ActionName<S>, event: S['event'] | InternalEvent): void {
    if (Object.hasOwn(machine.actions, name)) {
      // An own key of `machine.actions`, whose keys are `S['action']`.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      machine.actions[name as S['action']](params(event));
    } else {
      // Every other action name is a platform action; `checkPlatform` made sure it exists.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      platform.actions[name as S['platformAction']](params(event));
    }
  }

  function schedule(delay: S['delay'], ms: number): void {
    timers.get(delay)?.cancel();
    const token = {};
    // In the map before `schedule` runs: a clock may fire at once, from inside the call.
    const timer: Timer = { token, cancel: () => {} };
    timers.set(delay, timer);
    timer.cancel = platform.schedule(
      ms,
      () => {
        if (timers.get(delay)?.token !== token) {
          return;
        }
        timers.delete(delay);
        dispatch({ type: 'machine.after', delay });
      },
      delay,
    );
  }

  function execute(command: Command<S>, event: S['event'] | InternalEvent): void {
    if (status !== 'running') {
      // Stopped by an earlier command: nothing more runs, starts or gets scheduled.
      return;
    }
    switch (command.type) {
      case 'run': {
        attempt(() => {
          runAction(command.action, event);
        });
        break;
      }
      case 'start': {
        attempt(() => {
          const cleanup = platform.effects[command.effect](params(event));
          if (cleanup !== undefined) {
            cleanups.set(command.effect, cleanup);
          }
        });
        break;
      }
      case 'stop': {
        const cleanup = cleanups.get(command.effect);
        cleanups.delete(command.effect);
        attempt(() => cleanup?.());
        break;
      }
      case 'schedule': {
        attempt(() => {
          schedule(command.delay, command.ms);
        });
        break;
      }
      case 'cancel': {
        const timer = timers.get(command.delay);
        timers.delete(command.delay);
        attempt(() => timer?.cancel());
        break;
      }
    }
  }

  function process(event: S['event'] | InternalEvent): void {
    const result = transition(machine, snapshot.state, event, readParams(event));
    if (!result.taken) {
      return;
    }
    if (result.state !== snapshot.state) {
      snapshot = { ...snapshot, state: result.state };
    }
    for (const command of result.commands) {
      execute(command, event);
    }
  }

  /**
   * Run `step`, then the events it queued, and notify the subscribers once if the snapshot
   * changed; then rethrow the first error that actions, effects or callbacks threw. Inside
   * another macrostep, `step` just runs: the outer one drains, notifies and rethrows.
   */
  function macrostep(step: () => void): void {
    if (busy) {
      step();
      return;
    }
    busy = true;
    const before = snapshot;
    try {
      step();
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        if (status === 'running') {
          process(next);
        }
      }
    } finally {
      busy = false;
      queue.length = 0;
    }
    if (snapshot !== before) {
      for (const listener of listeners) {
        attempt(listener);
      }
    }
    rethrow();
  }

  function dispatch(event: S['event'] | InternalEvent): void {
    if (status !== 'running') {
      return;
    }
    if (busy) {
      queue.push(event);
      return;
    }
    macrostep(() => {
      process(event);
    });
  }

  function send(event: S['event']): void {
    dispatch(event);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    send,
    matches: (...states) => states.includes(snapshot.state),
    prop,
    context,
    setProps(input) {
      props = machine.props(input);
    },
    syncProps() {
      const previous = syncedProps;
      syncedProps = props;
      const watch = machine.watch;
      if (status !== 'running' || watch === undefined) {
        return;
      }
      const changed = keysOf(watch).filter((key) => !Object.is(previous[key], props[key]));
      if (changed.length === 0) {
        return;
      }
      const event: InternalEvent = { type: 'machine.props' };
      macrostep(() => {
        for (const key of changed) {
          for (const action of watch[key] ?? []) {
            execute({ type: 'run', action }, event);
          }
        }
      });
    },
    start() {
      if (status === 'running') {
        return;
      }
      const first = status === 'created';
      status = 'running';
      const event: InternalEvent = { type: 'machine.start' };
      macrostep(() => {
        for (const command of enterState(machine, snapshot.state, readParams(event), {
          entry: first,
        })) {
          execute(command, event);
        }
      });
    },
    stop() {
      if (status !== 'running') {
        return;
      }
      status = 'stopped';
      queue.length = 0;
      for (const timer of timers.values()) {
        attempt(timer.cancel);
      }
      timers.clear();
      for (const cleanup of [...cleanups.values()].toReversed()) {
        attempt(cleanup);
      }
      cleanups.clear();
      rethrow();
    },
  };
}
