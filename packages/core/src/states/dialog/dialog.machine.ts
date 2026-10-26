import { createMachine } from '../../machine/index.ts';
import type { Machine, TransitionConfig } from '../../machine/index.ts';
import type { DialogSchema } from './dialog.types.ts';

/**
 * A request to open: a controlled dialog only reports it, and opens when its owner passes
 * `open: true`; any other dialog opens at once and reports it.
 */
const openRequest: ReadonlyArray<TransitionConfig<DialogSchema>> = [
  { guard: 'isOpenControlled', actions: ['reportOpen'] },
  { target: 'open', actions: ['reportOpen'] },
];

/** A request to close, handled the same way. */
const closeRequest: ReadonlyArray<TransitionConfig<DialogSchema>> = [
  { guard: 'isOpenControlled', actions: ['reportClosed'] },
  { target: 'closed', actions: ['reportClosed'] },
];

/**
 * The dialog machine: `closed` or `open`, with its owner in control of the state or not.
 *
 * - `OPEN` and `TOGGLE` open a closed dialog; `CLOSE` and `TOGGLE` close an open one. Each
 *   change is reported as `onOpenChange({ open })`; a request for the current state is ignored.
 * - `ESCAPE` and `INTERACT_OUTSIDE`, which the `dismiss` effect sends, are close requests when
 *   `closeOnEscape` and `closeOnInteractOutside` allow them, and are ignored otherwise.
 * - While `open` is controlled, requests are only reported: the state follows `open` when the
 *   owner passes a new value (`watch`), and following it reports nothing. `undefined` hands the
 *   state back to the machine, which keeps it as it is.
 * - The initial state is `open ?? defaultOpen`; `defaultOpen` is read once.
 * - `open` runs the platform effects `dismiss`, `trapFocus`, `preventScroll` and `hideOutside`;
 *   `modal` turns the last three on, and `trapFocus` and `preventScroll` have their own props.
 *   Entering `open`, by a request, the owner or the start of a dialog that starts open, moves
 *   focus into the dialog (`setInitialFocus`); leaving it, once the effects have stopped, moves
 *   focus back (`restoreFocus`). Stopping the service stops the effects but leaves focus alone.
 *
 * @example
 * const service = createService(dialogMachine, { props: { role: 'alertdialog' }, platform });
 * service.start();
 * service.send({ type: 'OPEN' });
 * service.matches('open'); // true
 */
export const dialogMachine: Machine<DialogSchema> = createMachine<DialogSchema>({
  props: ({
    modal = true,
    role = 'dialog',
    trapFocus = modal,
    preventScroll = modal,
    closeOnInteractOutside = modal && role !== 'alertdialog',
    closeOnEscape = true,
    restoreFocus = true,
    ...input
  }) => ({
    ...input,
    modal,
    role,
    trapFocus,
    preventScroll,
    closeOnInteractOutside,
    closeOnEscape,
    restoreFocus,
  }),
  context: {},
  initial: ({ prop }) => ((prop('open') ?? prop('defaultOpen')) === true ? 'open' : 'closed'),
  watch: {
    open: ['syncOpen'],
  },
  states: {
    closed: {
      on: {
        OPEN: openRequest,
        TOGGLE: openRequest,
        'CONTROLLED.OPEN': { target: 'open' },
      },
    },
    open: {
      entry: ['setInitialFocus'],
      effects: ['dismiss', 'trapFocus', 'preventScroll', 'hideOutside'],
      // After the effects stop: focus can go back to an element they kept out of reach.
      exit: ['restoreFocus'],
      on: {
        CLOSE: closeRequest,
        TOGGLE: closeRequest,
        ESCAPE: { guard: 'closeOnEscape', actions: ['sendClose'] },
        INTERACT_OUTSIDE: { guard: 'closeOnInteractOutside', actions: ['sendClose'] },
        'CONTROLLED.CLOSE': { target: 'closed' },
      },
    },
  },
  actions: {
    reportOpen: ({ prop }) => {
      prop('onOpenChange')?.({ open: true });
    },
    reportClosed: ({ prop }) => {
      prop('onOpenChange')?.({ open: false });
    },
    // Guards cannot be combined, so a dismissal that is allowed becomes a plain close request.
    sendClose: ({ send }) => {
      send({ type: 'CLOSE' });
    },
    syncOpen: ({ prop, send }) => {
      const open = prop('open');
      // `undefined`: the owner hands the state back to the machine, which keeps it.
      if (open !== undefined) {
        send({ type: open ? 'CONTROLLED.OPEN' : 'CONTROLLED.CLOSE' });
      }
    },
  },
  guards: {
    isOpenControlled: ({ prop }) => prop('open') !== undefined,
    closeOnEscape: ({ prop }) => prop('closeOnEscape'),
    closeOnInteractOutside: ({ prop }) => prop('closeOnInteractOutside'),
  },
  delays: {},
});
