import { createMachine } from '../../machine/index.ts';
import type { Machine } from '../../machine/index.ts';
import type { ClipboardSchema } from './clipboard.types.ts';

/** How long the copied state lasts when the `timeout` prop is not set, in milliseconds. */
const DEFAULT_TIMEOUT = 3000;

/**
 * The clipboard machine: writes a text to the clipboard and stays `copied` for a while once the
 * write is done. It is never `copied` before the platform confirms a write.
 *
 * - `idle` → `COPY` → `copying`: the platform writes the value (`writeText`).
 * - `copying` → `COPY.DONE` → `copied`: `onStatusChange({ copied: true })` is called.
 *   `COPY.FAILED` returns to `idle` and reports nothing. Another `COPY` is ignored while the
 *   write is pending.
 * - `copied` → `idle` after `timeout` milliseconds, or on `COPY.FAILED`;
 *   `onStatusChange({ copied: false })` is called. A `COPY` writes again and stays `copied`; its
 *   `COPY.DONE` starts the timeout over, without a second report. If that write is done only
 *   after the timeout ended the state, its `COPY.DONE` starts `copied` again from `idle`.
 * - `VALUE.SET` changes the value in every state.
 *
 * The platform implements `writeText`: write `context.get('value')` to the clipboard, then send
 * `COPY.DONE`, or `COPY.FAILED` when that fails.
 *
 * @example
 * const service = createService(clipboardMachine, { props: { value: 'npm i' }, platform });
 * service.start();
 * service.send({ type: 'COPY' });
 */
export const clipboardMachine: Machine<ClipboardSchema> = createMachine<ClipboardSchema>({
  props: ({ timeout = DEFAULT_TIMEOUT, ...input }) => ({ ...input, timeout }),
  context: {
    value: ({ prop }) => ({
      value: prop('value'),
      defaultValue: prop('defaultValue') ?? '',
      onChange: (value) => prop('onValueChange')?.({ value }),
    }),
  },
  initial: 'idle',
  on: {
    'VALUE.SET': { actions: ['setValue'] },
  },
  states: {
    idle: {
      on: {
        COPY: { target: 'copying', actions: ['writeText'] },
        // Only a write started while copied can answer here, after the timeout ended that state:
        // the text was copied, so it is shown and reported.
        'COPY.DONE': { target: 'copied', actions: ['reportCopied'] },
      },
    },
    copying: {
      // No `COPY`: a copy while the write is pending is ignored.
      on: {
        'COPY.DONE': { target: 'copied', actions: ['reportCopied'] },
        // Nothing was copied, so there is nothing to report.
        'COPY.FAILED': { target: 'idle' },
      },
    },
    copied: {
      after: {
        timeout: { target: 'idle', actions: ['reportIdle'] },
      },
      on: {
        // Stays copied while the new write is pending, so the state does not flicker.
        COPY: { actions: ['writeText'] },
        // Re-entered, so the timeout starts over; the state is reported once, when it starts.
        'COPY.DONE': { target: 'copied', reenter: true },
        'COPY.FAILED': { target: 'idle', actions: ['reportIdle'] },
      },
    },
  },
  actions: {
    setValue: ({ context, event }) => {
      if (event.type === 'VALUE.SET') {
        context.set('value', event.value);
      }
    },
    reportCopied: ({ prop }) => {
      prop('onStatusChange')?.({ copied: true });
    },
    reportIdle: ({ prop }) => {
      prop('onStatusChange')?.({ copied: false });
    },
  },
  guards: {},
  delays: {
    timeout: ({ prop }) => prop('timeout'),
  },
});
