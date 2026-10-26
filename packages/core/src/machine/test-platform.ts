import { platformNames } from './create-machine.ts';
import type { Machine, MachineParams, MachineSchema, Platform } from './types.ts';

/** Implementations to use instead of the recording stubs of {@link createTestPlatform}. */
export interface TestPlatformOverrides<S extends MachineSchema> {
  readonly actions?: { readonly [A in S['platformAction']]?: (params: MachineParams<S>) => void };
  readonly effects?: {
    readonly [E in S['platformEffect']]?: (params: MachineParams<S>) => (() => void) | undefined;
  };
}

/** A platform for tests: a fake clock and a log of what the machine asked for. */
export interface TestPlatform<S extends MachineSchema> {
  readonly platform: Platform<S>;
  /**
   * Move the fake clock forward by `ms`, firing every timer that falls due, in time order
   * (timers scheduled by those that fire count too).
   */
  readonly advance: (ms: number) => void;
  /** Milliseconds of fake time since the platform was created. */
  readonly now: () => number;
  /** How many timers wait to fire. */
  readonly pending: () => number;
  /**
   * What the machine asked the platform to do, in order: `run writeText`,
   * `start dismiss`, `stop dismiss`, `schedule 3000`, `cancel`, `fire`.
   */
  readonly log: readonly string[];
}

interface FakeTimer {
  readonly at: number;
  readonly order: number;
  readonly fire: () => void;
}

/**
 * A platform for testing a machine without a DOM or real time: every platform action and effect
 * the machine uses is recorded (and runs the override, when given), and the clock only moves
 * with `advance()`.
 *
 * @example
 * const test = createTestPlatform(clipboardMachine);
 * const service = createService(clipboardMachine, { props: {}, platform: test.platform });
 * service.start();
 * service.send({ type: 'COPY' });
 * test.advance(3000);
 * service.matches('idle'); // true
 */
export function createTestPlatform<S extends MachineSchema>(
  machine: Machine<S>,
  overrides: TestPlatformOverrides<S> = {},
): TestPlatform<S> {
  const log: string[] = [];
  let time = 0;
  let count = 0;
  let timers: FakeTimer[] = [];
  const names = platformNames(machine);

  const actions = Object.fromEntries(
    [...names.actions].map((name) => [
      name,
      (params: MachineParams<S>): void => {
        log.push(`run ${name}`);
        overrides.actions?.[name]?.(params);
      },
    ]),
  );
  const effects = Object.fromEntries(
    [...names.effects].map((name) => [
      name,
      (params: MachineParams<S>): (() => void) => {
        log.push(`start ${name}`);
        const cleanup = overrides.effects?.[name]?.(params);
        return () => {
          log.push(`stop ${name}`);
          cleanup?.();
        };
      },
    ]),
  );

  const platform: Platform<S> = {
    schedule(ms, fire) {
      log.push(`schedule ${ms}`);
      count += 1;
      const timer: FakeTimer = { at: time + ms, order: count, fire };
      timers.push(timer);
      return () => {
        if (timers.includes(timer)) {
          log.push('cancel');
          timers = timers.filter((other) => other !== timer);
        }
      };
    },
    // Keyed by every platform action and effect name the machine uses.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    actions: actions as Platform<S>['actions'],
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    effects: effects as Platform<S>['effects'],
  };

  return {
    platform,
    advance: (ms) => {
      const until = time + ms;
      for (;;) {
        const due = timers
          .filter((timer) => timer.at <= until)
          .toSorted((a, b) => a.at - b.at || a.order - b.order)[0];
        if (due === undefined) {
          break;
        }
        timers = timers.filter((timer) => timer !== due);
        time = due.at;
        log.push('fire');
        due.fire();
      }
      time = until;
    },
    now: () => time,
    pending: () => timers.length,
    log,
  };
}
