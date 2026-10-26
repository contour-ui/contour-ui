import { createMachine } from './create-machine.ts';
import type { Machine } from './types.ts';

/** Props of the test player: a controlled-or-owned volume, a lock and an idle timeout. */
export interface PlayerInput {
  readonly volume?: number | undefined;
  readonly defaultVolume?: number | undefined;
  readonly onVolumeChange?: ((volume: number) => void) | undefined;
  readonly idleTimeout?: number | undefined;
  readonly locked?: boolean | undefined;
}

export interface PlayerProps extends PlayerInput {
  readonly idleTimeout: number;
}

export type PlayerEvent =
  | { readonly type: 'PLAY' }
  | { readonly type: 'PAUSE' }
  | { readonly type: 'STOP' }
  | { readonly type: 'RESTART' }
  | { readonly type: 'SEEK' }
  | { readonly type: 'VOLUME'; readonly volume: number };

export interface PlayerSchema {
  input: PlayerInput;
  props: PlayerProps;
  context: { volume: number; plays: number };
  state: 'stopped' | 'playing' | 'paused';
  event: PlayerEvent;
  action: 'countPlay' | 'setVolume' | 'stopIfLocked';
  guard: 'unlocked' | 'locked';
  delay: 'idle';
  platformAction: 'announce' | 'seek' | 'warnLocked';
  platformEffect: 'meter' | 'wakeLock';
}

/**
 * A machine that uses every feature of the runtime: guards (and a fallback transition),
 * entry and exit actions, effects, a delay, re-entry, machine-level events, owned and
 * controlled context, and `watch`.
 */
export const playerMachine: Machine<PlayerSchema> = createMachine<PlayerSchema>({
  props: ({ idleTimeout = 1000, ...input }) => ({ ...input, idleTimeout }),
  context: {
    volume: ({ prop }) => ({
      value: prop('volume'),
      defaultValue: prop('defaultVolume') ?? 50,
      onChange: (volume) => prop('onVolumeChange')?.(volume),
    }),
    plays: () => ({ defaultValue: 0 }),
  },
  initial: 'stopped',
  on: {
    VOLUME: { actions: ['setVolume'] },
    SEEK: { actions: ['seek'] },
  },
  watch: {
    locked: ['stopIfLocked'],
  },
  states: {
    stopped: {
      on: {
        PLAY: [
          { guard: 'unlocked', target: 'playing', actions: ['countPlay'] },
          { guard: 'locked', actions: ['warnLocked'] },
        ],
      },
    },
    playing: {
      entry: ['announce'],
      effects: ['meter', 'wakeLock'],
      on: {
        PAUSE: { target: 'paused' },
        STOP: { target: 'stopped' },
        RESTART: { target: 'playing', reenter: true },
        // Handled here, so the machine-level SEEK does not run in this state.
        SEEK: { target: 'playing' },
      },
    },
    paused: {
      after: { idle: 'stopped' },
      on: {
        PLAY: { target: 'playing', actions: ['countPlay'] },
        STOP: { target: 'stopped' },
      },
    },
  },
  actions: {
    countPlay: ({ context }) => {
      context.set('plays', context.get('plays') + 1);
    },
    setVolume: ({ context, event }) => {
      if (event.type === 'VOLUME') {
        context.set('volume', event.volume);
      }
    },
    stopIfLocked: ({ prop, send }) => {
      if (prop('locked') === true) {
        send({ type: 'STOP' });
      }
    },
  },
  guards: {
    unlocked: ({ prop }) => prop('locked') !== true,
    locked: ({ prop }) => prop('locked') === true,
  },
  delays: {
    idle: ({ prop }) => prop('idleTimeout'),
  },
});
