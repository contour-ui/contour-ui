import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform, transition } from '../../machine/index.ts';
import type { MachineReadParams, Service, TransitionResult } from '../../machine/index.ts';
import { dialogMachine } from './dialog.machine.ts';
import type {
  DialogEvent,
  DialogInput,
  DialogOpenChangeDetails,
  DialogSchema,
  DialogState,
} from './dialog.types.ts';

/** A started dialog on the test platform. */
function dialog(props: DialogInput = {}) {
  const test = createTestPlatform(dialogMachine);
  const service = createService(dialogMachine, { props, platform: test.platform });
  service.start();
  return { service, test };
}

/** Pass new props, as an adapter does on render, and follow them, as it does after the commit. */
function rerender(service: Service<DialogSchema>, props: DialogInput): void {
  service.setProps(props);
  service.syncProps();
}

/** An event the types reject, as a plain JavaScript caller could send it. */
function unknownEvent(type: string): DialogEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { type } as DialogEvent;
}

/** The state of a dialog that starts open, once it has handled `event`. */
function stateAfter(props: DialogInput, event: DialogEvent): DialogState {
  const { service } = dialog({ defaultOpen: true, ...props });
  service.send(event);
  return service.getSnapshot().state;
}

/** Where `event` leads from `state` with these props, as the pure transition decides it. */
function step(
  state: DialogState,
  event: DialogEvent,
  input: DialogInput = {},
): TransitionResult<DialogSchema> {
  const props = dialogMachine.props(input);
  const reads: MachineReadParams<DialogSchema> = {
    prop: (key) => props[key],
    context: {
      get: () => {
        throw new Error('The dialog machine reads no context.');
      },
    },
    event,
  };
  return transition(dialogMachine, state, event, reads);
}

/** The command that runs an action the machine implements. */
const run = (action: 'reportOpen' | 'reportClosed' | 'sendClose') =>
  ({ type: 'run', action }) as const;

const openChangeSpy = () => vi.fn<(details: DialogOpenChangeDetails) => void>();

/** What the platform is asked to do when the dialog opens: move focus in, start the effects. */
const OPENED = [
  'run setInitialFocus',
  'start dismiss',
  'start trapFocus',
  'start preventScroll',
  'start hideOutside',
];

/** The effects stopping, last started first. */
const STOPPED = ['stop hideOutside', 'stop preventScroll', 'stop trapFocus', 'stop dismiss'];

/** What the platform is asked to do when the dialog closes: stop the effects, move focus back. */
const CLOSED = [...STOPPED, 'run restoreFocus'];

describe('dialog machine', () => {
  it('starts closed and asks nothing of the platform', () => {
    const { service, test } = dialog();

    expect(service.matches('closed')).toBe(true);
    expect(test.log).toStrictEqual([]);
  });

  it('fills in the props: modal sets the defaults of the options that keep the page out of reach', () => {
    expect(dialogMachine.props({})).toStrictEqual({
      modal: true,
      role: 'dialog',
      trapFocus: true,
      preventScroll: true,
      closeOnInteractOutside: true,
      closeOnEscape: true,
      restoreFocus: true,
    });
    expect(dialogMachine.props({ modal: false })).toMatchObject({
      trapFocus: false,
      preventScroll: false,
      closeOnInteractOutside: false,
      closeOnEscape: true,
    });
    // Each option can be set on its own, either way.
    expect(dialogMachine.props({ modal: false, trapFocus: true })).toMatchObject({
      trapFocus: true,
      preventScroll: false,
    });
    expect(dialogMachine.props({ trapFocus: false, preventScroll: false })).toMatchObject({
      modal: true,
      trapFocus: false,
      preventScroll: false,
    });
    // An alert dialog waits for an answer: an interaction outside it does not close it.
    expect(dialogMachine.props({ role: 'alertdialog' })).toMatchObject({
      closeOnInteractOutside: false,
      closeOnEscape: true,
    });
    expect(
      dialogMachine.props({ role: 'alertdialog', closeOnInteractOutside: true }),
    ).toMatchObject({ closeOnInteractOutside: true });
    // An adapter may pass every prop on, unset ones as `undefined`: the defaults still apply.
    expect(
      dialogMachine.props({ modal: undefined, trapFocus: undefined, role: undefined }),
    ).toMatchObject({ modal: true, trapFocus: true, role: 'dialog' });
  });

  it('opens, closes and toggles, and reports every change', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = dialog({ onOpenChange });

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

  it('closes on Escape and on an interaction outside it', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = dialog({ defaultOpen: true, onOpenChange });

    service.send({ type: 'ESCAPE' });
    expect(service.matches('closed')).toBe(true);
    service.send({ type: 'OPEN' });
    service.send({ type: 'INTERACT_OUTSIDE' });
    expect(service.matches('closed')).toBe(true);

    expect(test.log).toStrictEqual([...OPENED, ...CLOSED, ...OPENED, ...CLOSED]);
    expect(onOpenChange.mock.calls).toStrictEqual([
      [{ open: false }],
      [{ open: true }],
      [{ open: false }],
    ]);
  });

  it('closes on Escape and on an outside interaction only when their props allow it', () => {
    const escape = { type: 'ESCAPE' } as const;
    const outside = { type: 'INTERACT_OUTSIDE' } as const;

    expect(stateAfter({ closeOnEscape: false }, escape)).toBe('open');
    expect(stateAfter({ closeOnEscape: false }, outside)).toBe('closed');
    expect(stateAfter({ closeOnInteractOutside: false }, outside)).toBe('open');
    expect(stateAfter({ closeOnInteractOutside: false }, escape)).toBe('closed');
    // By default, a non-modal dialog and an alert dialog stay open on an outside interaction.
    expect(stateAfter({ modal: false }, outside)).toBe('open');
    expect(stateAfter({ modal: false }, escape)).toBe('closed');
    expect(stateAfter({ role: 'alertdialog' }, outside)).toBe('open');
    expect(stateAfter({ role: 'alertdialog' }, escape)).toBe('closed');
  });

  it('neither reports nor notifies a dismissal its props turn off, and still closes from its parts', () => {
    const onOpenChange = openChangeSpy();
    const listener = vi.fn<() => void>();
    const { service, test } = dialog({
      defaultOpen: true,
      closeOnEscape: false,
      closeOnInteractOutside: false,
      onOpenChange,
    });
    service.subscribe(listener);

    service.send({ type: 'ESCAPE' });
    service.send({ type: 'INTERACT_OUTSIDE' });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual(OPENED);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();

    service.send({ type: 'CLOSE' });
    expect(service.matches('closed')).toBe(true);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: false }]]);
  });

  it('ignores requests for the state it is in, and unknown events', () => {
    const onOpenChange = openChangeSpy();
    const listener = vi.fn<() => void>();
    const { service, test } = dialog({ onOpenChange });
    service.subscribe(listener);

    service.send({ type: 'CLOSE' });
    service.send({ type: 'ESCAPE' });
    service.send({ type: 'INTERACT_OUTSIDE' });
    service.send({ type: 'CONTROLLED.CLOSE' });
    service.send(unknownEvent('PING'));
    expect(service.matches('closed')).toBe(true);

    service.send({ type: 'OPEN' });
    service.send({ type: 'OPEN' });
    service.send({ type: 'CONTROLLED.OPEN' });
    service.send(unknownEvent('PING'));
    expect(service.matches('open')).toBe(true);

    expect(test.log).toStrictEqual(OPENED);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
    // Only the first OPEN changed the snapshot.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('starts open with defaultOpen: focus moves in and the effects start when the service does', () => {
    const onOpenChange = openChangeSpy();
    const test = createTestPlatform(dialogMachine);
    const service = createService(dialogMachine, {
      props: { defaultOpen: true, onOpenChange },
      platform: test.platform,
    });
    expect(service.matches('open')).toBe(true);
    expect(test.log).toStrictEqual([]);

    service.start();
    expect(test.log).toStrictEqual(OPENED);
    // Nothing was requested: the dialog started in its state.
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('reads defaultOpen once', () => {
    const { service } = dialog({ defaultOpen: true });

    rerender(service, { defaultOpen: false });
    expect(service.matches('open')).toBe(true);

    service.send({ type: 'CLOSE' });
    rerender(service, { defaultOpen: true });
    expect(service.matches('closed')).toBe(true);
  });

  it('runs the same effects, modal or not: each one checks the prop that turns it on', () => {
    for (const modal of [true, false]) {
      const { service, test } = dialog({ modal });

      service.send({ type: 'OPEN' });
      expect(test.log).toStrictEqual(OPENED);
      service.send({ type: 'CLOSE' });
      expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
      // What the platform reads to decide which of them to turn on.
      expect([service.prop('trapFocus'), service.prop('preventScroll')]).toStrictEqual([
        modal,
        modal,
      ]);
    }
  });

  it('stops its effects without moving focus or reporting when the service stops while open', () => {
    const onOpenChange = openChangeSpy();
    const { service, test } = dialog({ defaultOpen: true, onOpenChange });

    service.stop();
    expect(test.log).toStrictEqual([...OPENED, ...STOPPED]);

    // Started again, as React's Strict Mode does: the effects start over, focus stays.
    service.start();
    expect(test.log).toStrictEqual([...OPENED, ...STOPPED, ...OPENED.slice(1)]);
    expect(service.matches('open')).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  describe('controlled', () => {
    it('only reports a request, and follows open when the owner passes it', () => {
      const onOpenChange = openChangeSpy();
      const { service, test } = dialog({ open: false, onOpenChange });

      service.send({ type: 'OPEN' });
      expect(service.matches('closed')).toBe(true);
      expect(test.log).toStrictEqual([]);
      expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);

      rerender(service, { open: true, onOpenChange });
      expect(service.matches('open')).toBe(true);
      expect(test.log).toStrictEqual(OPENED);

      service.send({ type: 'CLOSE' });
      expect(service.matches('open')).toBe(true);
      expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);

      rerender(service, { open: false, onOpenChange });
      expect(service.matches('closed')).toBe(true);
      expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
      // Following the prop reports nothing: the owner knows what it passed.
      expect(onOpenChange).toHaveBeenCalledTimes(2);
    });

    it('reports every close request its props allow, each time, until the owner acts', () => {
      const onOpenChange = openChangeSpy();
      const { service, test } = dialog({ open: true, closeOnEscape: false, onOpenChange });

      service.send({ type: 'TOGGLE' });
      service.send({ type: 'INTERACT_OUTSIDE' });
      service.send({ type: 'ESCAPE' });
      service.send({ type: 'CLOSE' });
      expect(service.matches('open')).toBe(true);
      expect(test.log).toStrictEqual(OPENED);
      // TOGGLE, INTERACT_OUTSIDE and CLOSE; Escape does not close this dialog.
      expect(onOpenChange.mock.calls).toStrictEqual([
        [{ open: false }],
        [{ open: false }],
        [{ open: false }],
      ]);
    });

    it('follows open the owner changes on its own, without reporting it', () => {
      const onOpenChange = openChangeSpy();
      const { service, test } = dialog({ open: false, onOpenChange });

      rerender(service, { open: true, onOpenChange });
      expect(service.matches('open')).toBe(true);
      rerender(service, { open: false, onOpenChange });
      expect(service.matches('closed')).toBe(true);

      expect(test.log).toStrictEqual([...OPENED, ...CLOSED]);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('starts in the state open gives, whatever defaultOpen says', () => {
      expect(dialog({ open: true, defaultOpen: false }).service.matches('open')).toBe(true);
      expect(dialog({ open: false, defaultOpen: true }).service.matches('closed')).toBe(true);
    });

    it('keeps its state when the owner stops controlling it, and owns it from then on', () => {
      const onOpenChange = openChangeSpy();
      const { service, test } = dialog({ open: true, onOpenChange });

      rerender(service, { onOpenChange });
      expect(service.matches('open')).toBe(true);
      expect(test.log).toStrictEqual(OPENED);

      service.send({ type: 'CLOSE' });
      expect(service.matches('closed')).toBe(true);
      expect(onOpenChange.mock.calls).toStrictEqual([[{ open: false }]]);
    });

    it('follows open from the moment the owner starts controlling it', () => {
      const { service } = dialog({ defaultOpen: true });

      rerender(service, { open: false });
      expect(service.matches('closed')).toBe(true);
    });
  });

  it('decides every step as a pure transition', () => {
    const opens = [
      { type: 'run', action: 'setInitialFocus' },
      { type: 'start', effect: 'dismiss' },
      { type: 'start', effect: 'trapFocus' },
      { type: 'start', effect: 'preventScroll' },
      { type: 'start', effect: 'hideOutside' },
    ] as const;
    const closes = [
      { type: 'stop', effect: 'hideOutside' },
      { type: 'stop', effect: 'preventScroll' },
      { type: 'stop', effect: 'trapFocus' },
      { type: 'stop', effect: 'dismiss' },
      { type: 'run', action: 'restoreFocus' },
    ] as const;

    // Closed.
    expect(step('closed', { type: 'OPEN' })).toStrictEqual({
      taken: true,
      state: 'open',
      commands: [run('reportOpen'), ...opens],
    });
    expect(step('closed', { type: 'TOGGLE' })).toStrictEqual(step('closed', { type: 'OPEN' }));
    expect(step('closed', { type: 'OPEN' }, { open: false })).toStrictEqual({
      taken: true,
      state: 'closed',
      commands: [run('reportOpen')],
    });
    expect(step('closed', { type: 'CONTROLLED.OPEN' }, { open: true })).toStrictEqual({
      taken: true,
      state: 'open',
      commands: [...opens],
    });
    for (const type of ['CLOSE', 'ESCAPE', 'INTERACT_OUTSIDE', 'CONTROLLED.CLOSE'] as const) {
      expect(step('closed', { type }).taken).toBe(false);
    }

    // Open.
    expect(step('open', { type: 'CLOSE' })).toStrictEqual({
      taken: true,
      state: 'closed',
      commands: [...closes, run('reportClosed')],
    });
    expect(step('open', { type: 'TOGGLE' })).toStrictEqual(step('open', { type: 'CLOSE' }));
    expect(step('open', { type: 'CLOSE' }, { open: true })).toStrictEqual({
      taken: true,
      state: 'open',
      commands: [run('reportClosed')],
    });
    // An allowed dismissal becomes a CLOSE, handled next; one the props turn off means nothing.
    expect(step('open', { type: 'ESCAPE' })).toStrictEqual({
      taken: true,
      state: 'open',
      commands: [run('sendClose')],
    });
    expect(step('open', { type: 'ESCAPE' }, { closeOnEscape: false }).taken).toBe(false);
    expect(step('open', { type: 'INTERACT_OUTSIDE' })).toStrictEqual({
      taken: true,
      state: 'open',
      commands: [run('sendClose')],
    });
    expect(
      step('open', { type: 'INTERACT_OUTSIDE' }, { closeOnInteractOutside: false }).taken,
    ).toBe(false);
    expect(step('open', { type: 'CONTROLLED.CLOSE' }, { open: false })).toStrictEqual({
      taken: true,
      state: 'closed',
      commands: [...closes],
    });
    for (const type of ['OPEN', 'CONTROLLED.OPEN'] as const) {
      expect(step('open', { type }).taken).toBe(false);
    }
  });
});
