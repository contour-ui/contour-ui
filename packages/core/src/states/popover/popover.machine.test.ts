import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform, transition } from '../../machine/index.ts';
import type {
  MachineContext,
  MachineReadParams,
  Service,
  TestPlatformOverrides,
  TransitionResult,
} from '../../machine/index.ts';
import { popoverMachine } from './popover.machine.ts';
import type {
  PopoverEvent,
  PopoverInput,
  PopoverOpenChangeDetails,
  PopoverSchema,
  PopoverState,
} from './popover.types.ts';

/** A started popover on the test platform. */
function popover(props: PopoverInput = {}, overrides?: TestPlatformOverrides<PopoverSchema>) {
  const test = createTestPlatform(popoverMachine, overrides);
  const service = createService(popoverMachine, { props, platform: test.platform });
  service.start();
  return { service, test };
}

/** Pass new props, as an adapter does on render, and follow them, as it does after the commit. */
function rerender(service: Service<PopoverSchema>, props: PopoverInput): void {
  service.setProps(props);
  service.syncProps();
}

/** An event the types reject, as a plain JavaScript caller could send it. */
function unknownEvent(type: string): PopoverEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { type } as PopoverEvent;
}

const openChangeSpy = () => vi.fn<(details: PopoverOpenChangeDetails) => void>();

/** The command that runs an action, of the machine or of the platform. */
const run = (action: string) => ({ type: 'run', action });

/** The effects of the open popover starting, in order. */
const STARTED = [
  'start position',
  'start dismiss',
  'start trapFocus',
  'start preventScroll',
  'start hideOutside',
  'start keepTabOrder',
];

/** The same effects stopping, last started first. */
const STOPPED = [
  'stop keepTabOrder',
  'stop hideOutside',
  'stop preventScroll',
  'stop trapFocus',
  'stop dismiss',
  'stop position',
];

/** What the platform is asked to do when the popover opens: move focus in, start the effects. */
const OPENED = ['run setInitialFocus', ...STARTED];

/** What the platform is asked to do when the popover closes: stop the effects, move focus back. */
const CLOSED = [...STOPPED, 'run restoreFocus'];

describe('popover machine', () => {
  it('starts closed, placed as `positioning` asks, and asks nothing of the platform', () => {
    const { service, test } = popover();

    expect(service.matches('closed')).toBe(true);
    expect(service.context.get('placement')).toBe('bottom-start');
    expect(test.log).toStrictEqual([]);

    expect(popover({ positioning: { placement: 'top' } }).service.context.get('placement')).toBe(
      'top',
    );
  });

  it('fills in the props, positioning option by option over its own defaults', () => {
    const positioning = {
      placement: 'bottom-start',
      offset: 8,
      flip: true,
      shift: 8,
      sameWidth: false,
      fitViewport: true,
      strategy: 'absolute',
    };
    expect(popoverMachine.props({})).toStrictEqual({
      modal: false,
      portalled: true,
      autoFocus: true,
      restoreFocus: true,
      closeOnInteractOutside: true,
      closeOnEscape: true,
      positioning,
    });
    expect(
      popoverMachine.props({ positioning: { placement: 'top-end', offset: 4, flip: false } })
        .positioning,
    ).toStrictEqual({ ...positioning, placement: 'top-end', offset: 4, flip: false });

    // An adapter may pass every prop on, unset ones as `undefined`: the defaults still apply.
    expect(
      popoverMachine.props({
        modal: undefined,
        autoFocus: undefined,
        positioning: { placement: undefined, sameWidth: undefined },
      }),
    ).toMatchObject({ modal: false, autoFocus: true, positioning });

    // The rest is passed on as it is.
    const onOpenChange = openChangeSpy();
    expect(popoverMachine.props({ open: true, defaultOpen: false, onOpenChange })).toMatchObject({
      open: true,
      defaultOpen: false,
      onOpenChange,
    });
  });

  it('opens, closes and toggles, and reports every change', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ onOpenChange });

    service.send({ type: 'OPEN' });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual(OPENED);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);

    service.send({ type: 'CLOSE' });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);

    service.send({ type: 'TOGGLE' });
    expect(service.matches('open')).toBe(true);
    service.send({ type: 'TOGGLE' });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([...OPENED, ...CLOSED, ...OPENED, ...CLOSED]);
    expect(onOpenChange.mock.calls).toStrictEqual([
      [{ open: true }],
      [{ open: false }],
      [{ open: true }],
      [{ open: false }],
    ]);
  });

  it('ignores a request for the state it is in: no report, no platform call, no change', () => {
    const onOpenChange = openChangeSpy();
    const listener = vi.fn<() => void>();
    const { service, test } = popover({ onOpenChange });
    service.subscribe(listener);

    service.send({ type: 'CLOSE' });
    service.send({ type: 'ESCAPE' });
    service.send({ type: 'INTERACT_OUTSIDE' });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([]);

    service.send({ type: 'OPEN' });
    service.send({ type: 'OPEN' });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual(OPENED);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
    // Only the first OPEN changed the snapshot.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and on an interaction outside, as a close request', () => {
    const onOpenChange = openChangeSpy();
    const listener = vi.fn<() => void>();
    const { service, test } = popover({ defaultOpen: true, onOpenChange });
    service.subscribe(listener);

    service.send({ type: 'ESCAPE' });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([...STARTED, ...CLOSED]);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: false }]]);
    // The request it becomes is handled in the same step: subscribers hear of it once.
    expect(listener).toHaveBeenCalledTimes(1);

    service.send({ type: 'OPEN' });
    service.send({ type: 'INTERACT_OUTSIDE' });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([...STARTED, ...CLOSED, ...OPENED, ...CLOSED]);
    expect(onOpenChange.mock.calls).toStrictEqual([
      [{ open: false }],
      [{ open: true }],
      [{ open: false }],
    ]);
  });

  it('stays open on Escape or an interaction outside when its props say so, as they are now', () => {
    const onOpenChange = openChangeSpy();
    const props = { defaultOpen: true, onOpenChange };
    const { service, test } = popover({
      ...props,
      closeOnEscape: false,
      closeOnInteractOutside: false,
    });

    service.send({ type: 'ESCAPE' });
    service.send({ type: 'INTERACT_OUTSIDE' });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual(STARTED);
    expect(onOpenChange).not.toHaveBeenCalled();

    // The guards read the current props: no `watch`, no restart.
    service.setProps({ ...props, closeOnInteractOutside: false });
    service.send({ type: 'INTERACT_OUTSIDE' });
    expect(service.matches('open')).toBe(true);
    service.send({ type: 'ESCAPE' });
    expect(service.matches('closed')).toBe(true);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: false }]]);
  });

  it('starts open from `open ?? defaultOpen`, without a report and without moving focus', () => {
    const onOpenChange = openChangeSpy();

    const owned = popover({ defaultOpen: true, onOpenChange });
    expect(owned.service.matches('open')).toBe(true);
    // The effects start, but focus stays where it is: no `setInitialFocus` on mount.
    expect(owned.test.log).toStrictEqual(STARTED);

    expect(popover({ open: true, onOpenChange }).service.matches('open')).toBe(true);
    // `open` wins over `defaultOpen`.
    expect(popover({ open: false, defaultOpen: true }).service.matches('closed')).toBe(true);
    expect(popover({ defaultOpen: false }).service.matches('closed')).toBe(true);

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('reads `defaultOpen` once', () => {
    const { service, test } = popover();

    rerender(service, { defaultOpen: true });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([]);
  });

  it('only reports requests while `open` is controlled; the state follows the owner', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ open: false, onOpenChange });

    service.send({ type: 'OPEN' });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([]);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);

    // The owner agrees: the popover opens and moves focus in, without reporting it back.
    rerender(service, { open: true, onOpenChange });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual(OPENED);
    expect(onOpenChange).toHaveBeenCalledTimes(1);

    // Every way to close is a request, reported each time.
    service.send({ type: 'CLOSE' });
    service.send({ type: 'TOGGLE' });
    service.send({ type: 'ESCAPE' });
    service.send({ type: 'INTERACT_OUTSIDE' });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual(OPENED);
    expect(onOpenChange.mock.calls).toStrictEqual([
      [{ open: true }],
      [{ open: false }],
      [{ open: false }],
      [{ open: false }],
      [{ open: false }],
    ]);

    rerender(service, { open: false, onOpenChange });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
    expect(onOpenChange).toHaveBeenCalledTimes(5);
  });

  it('reports nothing while a controlled popover follows its owner without a request', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ open: false, onOpenChange });

    rerender(service, { open: true, onOpenChange });
    expect(service.matches('open')).toBe(true);
    rerender(service, { open: false, onOpenChange });
    expect(service.matches('closed')).toBe(true);

    expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps a controlled popover as it is while its owner does not answer', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ open: false, onOpenChange });

    service.send({ type: 'TOGGLE' });
    service.send({ type: 'OPEN' });
    // The same `open` again: there is nothing to follow.
    rerender(service, { open: false, onOpenChange });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([]);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: true }]]);
  });

  it('follows an owner that passes the new `open` from inside `onOpenChange`', () => {
    const onOpenChange = ({ open }: PopoverOpenChangeDetails): void => {
      // Called while the request is handled: the answer is followed before the request is over.
      rerender(service, { open, onOpenChange });
    };
    const { service, test } = popover({ open: false, onOpenChange });

    service.send({ type: 'TOGGLE' });
    expect(service.matches('open')).toBe(true);
    service.send({ type: 'ESCAPE' });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
  });

  it('keeps its state when `open` turns `undefined`, and owns it from then on', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ open: true, onOpenChange });

    rerender(service, { onOpenChange });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual(STARTED);

    service.send({ type: 'CLOSE' });
    expect(service.matches('closed')).toBe(true);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: false }]]);
  });

  it('follows `open` once an owned popover becomes controlled', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ defaultOpen: true, onOpenChange });

    rerender(service, { open: false, onOpenChange });
    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([...STARTED, ...CLOSED]);

    service.send({ type: 'OPEN' });
    expect(service.matches('closed')).toBe(true);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
  });

  it('stops the effects without moving focus or reporting when the service stops', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ onOpenChange });
    service.send({ type: 'OPEN' });

    service.stop();
    expect(test.log).toStrictEqual([...OPENED, ...STOPPED]);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);

    // Started again, as React does in Strict Mode: the effects resume, focus stays.
    service.start();
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual([...OPENED, ...STOPPED, ...STARTED]);
  });

  it('starts every effect and runs both focus actions; the platform checks the props', () => {
    const seen: string[] = [];
    const { service, test } = popover(
      { autoFocus: false, restoreFocus: false, modal: true },
      {
        actions: {
          setInitialFocus: ({ prop }) => {
            seen.push(`autoFocus ${String(prop('autoFocus'))}`);
          },
          restoreFocus: ({ prop }) => {
            seen.push(`restoreFocus ${String(prop('restoreFocus'))}`);
          },
        },
        effects: {
          trapFocus: ({ prop }) => {
            seen.push(`modal ${String(prop('modal'))}`);
            return undefined;
          },
          keepTabOrder: ({ prop }) => {
            seen.push(`portalled ${String(prop('portalled'))}`);
            return undefined;
          },
        },
      },
    );

    service.send({ type: 'OPEN' });
    service.send({ type: 'CLOSE' });
    expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
    // Defaults included: the platform never reads an unset prop.
    expect(seen).toStrictEqual([
      'autoFocus false',
      'modal true',
      'portalled true',
      'restoreFocus false',
    ]);
  });

  it('takes the placement the `position` effect finds, then or later', () => {
    let context: MachineContext<PopoverSchema['context']> | undefined;
    const listener = vi.fn<() => void>();
    const { service } = popover(
      { positioning: { placement: 'top' } },
      {
        effects: {
          position: (params) => {
            context = params.context;
            // No room above: flipped.
            params.context.set('placement', 'bottom');
            return undefined;
          },
        },
      },
    );
    service.subscribe(listener);

    service.send({ type: 'OPEN' });
    expect(service.context.get('placement')).toBe('bottom');
    expect(listener).toHaveBeenCalledTimes(1);

    // Measured again after a scroll, outside any event.
    context?.set('placement', 'top');
    expect(service.context.get('placement')).toBe('top');
    expect(listener).toHaveBeenCalledTimes(2);

    // Closed, the content keeps its last placement, for an exit animation.
    context?.set('placement', 'bottom');
    service.send({ type: 'CLOSE' });
    expect(service.context.get('placement')).toBe('bottom');
  });

  it('ignores unknown events in every state', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = popover({ onOpenChange });

    service.send(unknownEvent('HOVER'));
    expect(service.matches('closed')).toBe(true);
    service.send({ type: 'OPEN' });
    service.send(unknownEvent('HOVER'));
    expect(service.matches('open')).toBe(true);

    expect(test.log).toStrictEqual(OPENED);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('decides every step as a pure transition', () => {
    const context = { placement: 'bottom-start' } as const;
    const step = (
      state: PopoverState,
      event: PopoverEvent,
      input: PopoverInput = {},
    ): TransitionResult<PopoverSchema> => {
      const props = popoverMachine.props(input);
      const reads: MachineReadParams<PopoverSchema> = {
        prop: (key) => props[key],
        context: { get: (key) => context[key] },
        event,
      };
      return transition(popoverMachine, state, event, reads);
    };
    const start = STARTED.map((line) => ({ type: 'start', effect: line.slice('start '.length) }));
    const stop = STOPPED.map((line) => ({ type: 'stop', effect: line.slice('stop '.length) }));
    const controlled = { open: false };
    const ignored = { taken: false, state: 'closed', commands: [] };

    // Closed.
    const opens = {
      taken: true,
      state: 'open',
      commands: [run('reportOpen'), run('setInitialFocus'), ...start],
    };
    expect(step('closed', { type: 'OPEN' })).toStrictEqual(opens);
    expect(step('closed', { type: 'TOGGLE' })).toStrictEqual(opens);
    const asksToOpen = { taken: true, state: 'closed', commands: [run('reportOpen')] };
    expect(step('closed', { type: 'OPEN' }, controlled)).toStrictEqual(asksToOpen);
    expect(step('closed', { type: 'TOGGLE' }, controlled)).toStrictEqual(asksToOpen);
    expect(step('closed', { type: 'CONTROLLED.OPEN' }, { open: true })).toStrictEqual({
      taken: true,
      state: 'open',
      commands: [run('setInitialFocus'), ...start],
    });
    for (const type of ['CLOSE', 'ESCAPE', 'INTERACT_OUTSIDE', 'CONTROLLED.CLOSE'] as const) {
      expect(step('closed', { type })).toStrictEqual(ignored);
    }

    // Open.
    const closes = {
      taken: true,
      state: 'closed',
      commands: [...stop, run('restoreFocus'), run('reportClosed')],
    };
    expect(step('open', { type: 'CLOSE' })).toStrictEqual(closes);
    expect(step('open', { type: 'TOGGLE' })).toStrictEqual(closes);
    const asksToClose = { taken: true, state: 'open', commands: [run('reportClosed')] };
    expect(step('open', { type: 'CLOSE' }, controlled)).toStrictEqual(asksToClose);
    expect(step('open', { type: 'TOGGLE' }, controlled)).toStrictEqual(asksToClose);
    // Escape and an interaction outside become a close request, controlled or not.
    const sendsClose = { taken: true, state: 'open', commands: [run('sendClose')] };
    expect(step('open', { type: 'ESCAPE' })).toStrictEqual(sendsClose);
    expect(step('open', { type: 'ESCAPE' }, controlled)).toStrictEqual(sendsClose);
    expect(step('open', { type: 'INTERACT_OUTSIDE' })).toStrictEqual(sendsClose);
    expect(step('open', { type: 'ESCAPE' }, { closeOnEscape: false }).taken).toBe(false);
    expect(
      step('open', { type: 'INTERACT_OUTSIDE' }, { closeOnInteractOutside: false }).taken,
    ).toBe(false);
    expect(step('open', { type: 'CONTROLLED.CLOSE' }, controlled)).toStrictEqual({
      taken: true,
      state: 'closed',
      commands: [...stop, run('restoreFocus')],
    });
    expect(step('open', { type: 'OPEN' }).taken).toBe(false);
    expect(step('open', { type: 'CONTROLLED.OPEN' }).taken).toBe(false);
  });
});
