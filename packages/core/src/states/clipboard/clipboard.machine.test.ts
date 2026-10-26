import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform, transition } from '../../machine/index.ts';
import type {
  MachineReadParams,
  Service,
  TestPlatformOverrides,
  TransitionResult,
} from '../../machine/index.ts';
import { clipboardMachine } from './clipboard.machine.ts';
import type {
  ClipboardEvent,
  ClipboardInput,
  ClipboardProps,
  ClipboardSchema,
  ClipboardState,
  ClipboardStatusChangeDetails,
  ClipboardValueChangeDetails,
} from './clipboard.types.ts';

/** A started clipboard on the test platform, whose writes wait until the test answers them. */
function clipboard(props: ClipboardInput = {}, overrides?: TestPlatformOverrides<ClipboardSchema>) {
  const test = createTestPlatform(clipboardMachine, overrides);
  const service = createService(clipboardMachine, { props, platform: test.platform });
  service.start();
  return { service, test };
}

/** Copy, and answer the write as done, as the platform does. */
function copy(service: Service<ClipboardSchema>): void {
  service.send({ type: 'COPY' });
  service.send({ type: 'COPY.DONE' });
}

/** An event the types reject, as a plain JavaScript caller could send it. */
function unknownEvent(type: string): ClipboardEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { type } as ClipboardEvent;
}

const statusSpy = () => vi.fn<(details: ClipboardStatusChangeDetails) => void>();

describe('clipboard machine', () => {
  it('starts idle, with an empty value and a timeout of 3 seconds', () => {
    const { service, test } = clipboard();

    expect(service.matches('idle')).toBe(true);
    expect(service.context.get('value')).toBe('');
    expect(service.prop('timeout')).toBe(3000);
    expect(test.log).toStrictEqual([]);
  });

  it('waits for the write, reports the copy, and returns to idle after the timeout', () => {
    const onStatusChange = statusSpy();
    const { service, test } = clipboard({ defaultValue: 'npm i', onStatusChange });

    service.send({ type: 'COPY' });
    expect(service.matches('copying')).toBe(true);
    expect(test.log).toStrictEqual(['run writeText']);
    expect(onStatusChange).not.toHaveBeenCalled();

    service.send({ type: 'COPY.DONE' });
    expect(service.matches('copied')).toBe(true);
    expect(test.log).toStrictEqual(['run writeText', 'schedule timeout 3000']);
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }]]);

    test.advance(2999);
    expect(service.matches('copied')).toBe(true);
    test.advance(1);
    expect(service.matches('idle')).toBe(true);
    expect(test.log.at(-1)).toBe('fire timeout');
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }], [{ copied: false }]]);
    expect(test.pending()).toBe(0);
  });

  it('stays copied for the timeout the props give', () => {
    const { service, test } = clipboard({ timeout: 500 });

    copy(service);
    expect(test.log).toStrictEqual(['run writeText', 'schedule timeout 500']);
    test.advance(499);
    expect(service.matches('copied')).toBe(true);
    test.advance(1);
    expect(service.matches('idle')).toBe(true);
  });

  it('ignores a copy while the write is pending', () => {
    const { service, test } = clipboard();

    service.send({ type: 'COPY' });
    service.send({ type: 'COPY' });
    expect(service.matches('copying')).toBe(true);
    expect(test.log).toStrictEqual(['run writeText']);
  });

  it('returns to idle without a report when the first write fails', () => {
    const onStatusChange = statusSpy();
    const { service, test } = clipboard({ onStatusChange });

    service.send({ type: 'COPY' });
    service.send({ type: 'COPY.FAILED' });
    expect(service.matches('idle')).toBe(true);
    expect(test.log).toStrictEqual(['run writeText']);
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('stays copied while a new write is pending, and restarts the timeout when it is done', () => {
    const onStatusChange = statusSpy();
    const { service, test } = clipboard({ onStatusChange });
    copy(service);
    test.advance(2000);

    service.send({ type: 'COPY' });
    expect(service.matches('copied')).toBe(true);
    expect(test.log).toStrictEqual(['run writeText', 'schedule timeout 3000', 'run writeText']);

    // The first timeout keeps running until the write is done.
    test.advance(500);
    service.send({ type: 'COPY.DONE' });
    expect(test.log.slice(3)).toStrictEqual(['cancel timeout', 'schedule timeout 3000']);

    test.advance(2999);
    expect(service.matches('copied')).toBe(true);
    test.advance(1);
    expect(service.matches('idle')).toBe(true);
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }], [{ copied: false }]]);
  });

  it('returns to idle and reports it when a write fails while copied', () => {
    const onStatusChange = statusSpy();
    const { service, test } = clipboard({ onStatusChange });
    copy(service);

    service.send({ type: 'COPY' });
    service.send({ type: 'COPY.FAILED' });
    expect(service.matches('idle')).toBe(true);
    expect(test.log.at(-1)).toBe('cancel timeout');
    expect(test.pending()).toBe(0);
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }], [{ copied: false }]]);
  });

  it('shows a write that is done after the copied state ended', () => {
    const onStatusChange = statusSpy();
    const { service, test } = clipboard({ onStatusChange });
    copy(service);

    test.advance(2999);
    service.send({ type: 'COPY' });
    test.advance(1);
    expect(service.matches('idle')).toBe(true);

    // The second write answers late: the text was copied, so the state starts again.
    service.send({ type: 'COPY.DONE' });
    expect(service.matches('copied')).toBe(true);
    expect(onStatusChange.mock.calls).toStrictEqual([
      [{ copied: true }],
      [{ copied: false }],
      [{ copied: true }],
    ]);
    test.advance(3000);
    expect(service.matches('idle')).toBe(true);
  });

  it('handles an answer that writeText sends before the copy is over', () => {
    // A platform that answers at once: done, or failed as on a page without the Clipboard API.
    const done = clipboard(
      {},
      {
        actions: {
          writeText: ({ send }) => {
            send({ type: 'COPY.DONE' });
          },
        },
      },
    );
    done.service.send({ type: 'COPY' });
    expect(done.service.matches('copied')).toBe(true);
    expect(done.test.log).toStrictEqual(['run writeText', 'schedule timeout 3000']);

    const onStatusChange = statusSpy();
    const failed = clipboard(
      { onStatusChange },
      {
        actions: {
          writeText: ({ send }) => {
            send({ type: 'COPY.FAILED' });
          },
        },
      },
    );
    failed.service.send({ type: 'COPY' });
    expect(failed.service.matches('idle')).toBe(true);
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('writes the current value, owned or controlled', () => {
    const written: string[] = [];
    const overrides: TestPlatformOverrides<ClipboardSchema> = {
      actions: {
        writeText: ({ context, send }) => {
          written.push(context.get('value'));
          send({ type: 'COPY.DONE' });
        },
      },
    };

    const owned = clipboard({ defaultValue: 'npm i' }, overrides);
    owned.service.send({ type: 'COPY' });
    owned.service.send({ type: 'VALUE.SET', value: 'pnpm i' });
    owned.service.send({ type: 'COPY' });

    const controlled = clipboard({ value: 'yarn' }, overrides);
    controlled.service.send({ type: 'COPY' });
    controlled.service.setProps({ value: 'bun i' });
    controlled.service.send({ type: 'COPY' });

    expect(written).toStrictEqual(['npm i', 'pnpm i', 'yarn', 'bun i']);
  });

  it('owns its value when uncontrolled: VALUE.SET changes it and reports it', () => {
    const onValueChange = vi.fn<(details: ClipboardValueChangeDetails) => void>();
    const { service } = clipboard({ defaultValue: 'npm i', onValueChange });

    service.send({ type: 'VALUE.SET', value: 'pnpm i' });
    expect(service.context.get('value')).toBe('pnpm i');
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'pnpm i' }]]);

    // The same value again: dropped.
    service.send({ type: 'VALUE.SET', value: 'pnpm i' });
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('follows a controlled value: VALUE.SET only reports the new one', () => {
    const onValueChange = vi.fn<(details: ClipboardValueChangeDetails) => void>();
    const { service } = clipboard({ value: 'npm i', onValueChange });

    service.send({ type: 'VALUE.SET', value: 'pnpm i' });
    expect(service.context.get('value')).toBe('npm i');
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'pnpm i' }]]);

    service.setProps({ value: 'pnpm i', onValueChange });
    expect(service.context.get('value')).toBe('pnpm i');
  });

  it('changes the value while copied without leaving the state or restarting the timeout', () => {
    const { service, test } = clipboard({ defaultValue: 'npm i' });

    copy(service);
    service.send({ type: 'VALUE.SET', value: 'pnpm i' });
    expect(service.matches('copied')).toBe(true);
    expect(service.context.get('value')).toBe('pnpm i');
    expect(test.log).toStrictEqual(['run writeText', 'schedule timeout 3000']);
  });

  it('ignores events that mean nothing in the current state, and unknown ones', () => {
    const onStatusChange = statusSpy();
    const listener = vi.fn<() => void>();
    const { service, test } = clipboard({ onStatusChange });
    service.subscribe(listener);

    // Nothing is being written, so nothing failed.
    service.send({ type: 'COPY.FAILED' });
    service.send(unknownEvent('PASTE'));
    expect(service.matches('idle')).toBe(true);

    service.send({ type: 'COPY' });
    service.send(unknownEvent('PASTE'));
    expect(service.matches('copying')).toBe(true);
    service.send({ type: 'COPY.DONE' });
    service.send(unknownEvent('PASTE'));
    expect(service.matches('copied')).toBe(true);

    expect(test.log).toStrictEqual(['run writeText', 'schedule timeout 3000']);
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    // Only COPY and COPY.DONE changed the snapshot.
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('cancels the timeout without a report when the service stops while copied', () => {
    const onStatusChange = statusSpy();
    const { service, test } = clipboard({ onStatusChange });

    copy(service);
    service.stop();
    expect(test.pending()).toBe(0);
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }]]);
  });

  it('decides every step as a pure transition', () => {
    const props: ClipboardProps = { timeout: 3000 };
    const context = { value: 'npm i' };
    const step = (
      state: ClipboardState,
      event: ClipboardEvent,
    ): TransitionResult<ClipboardSchema> => {
      const reads: MachineReadParams<ClipboardSchema> = {
        prop: (key) => props[key],
        context: { get: (key) => context[key] },
        event,
      };
      return transition(clipboardMachine, state, event, reads);
    };
    const writeText = { type: 'run', action: 'writeText' } as const;
    const schedule = { type: 'schedule', delay: 'timeout', ms: 3000 } as const;
    const cancel = { type: 'cancel', delay: 'timeout' } as const;

    expect(step('idle', { type: 'COPY' })).toStrictEqual({
      taken: true,
      state: 'copying',
      commands: [writeText],
    });
    // A write that started while copied and is done after the timeout ended that state.
    expect(step('idle', { type: 'COPY.DONE' })).toStrictEqual({
      taken: true,
      state: 'copied',
      commands: [{ type: 'run', action: 'reportCopied' }, schedule],
    });
    expect(step('copying', { type: 'COPY' }).taken).toBe(false);
    expect(step('copying', { type: 'COPY.DONE' })).toStrictEqual({
      taken: true,
      state: 'copied',
      commands: [{ type: 'run', action: 'reportCopied' }, schedule],
    });
    expect(step('copying', { type: 'COPY.FAILED' })).toStrictEqual({
      taken: true,
      state: 'idle',
      commands: [],
    });
    // A copy while copied writes without leaving the state: the timeout keeps running.
    expect(step('copied', { type: 'COPY' })).toStrictEqual({
      taken: true,
      state: 'copied',
      commands: [writeText],
    });
    // Its write re-enters the state: the timeout starts over, without a second report.
    expect(step('copied', { type: 'COPY.DONE' })).toStrictEqual({
      taken: true,
      state: 'copied',
      commands: [cancel, schedule],
    });
    expect(step('copied', { type: 'COPY.FAILED' })).toStrictEqual({
      taken: true,
      state: 'idle',
      commands: [cancel, { type: 'run', action: 'reportIdle' }],
    });
  });
});
