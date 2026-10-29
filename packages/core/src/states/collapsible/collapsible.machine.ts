import { createMachine } from '../../machine/index.ts';
import type { Machine, TransitionConfig } from '../../machine/index.ts';
import type { CollapsibleSchema } from './collapsible.types.ts';

/**
 * A request to open: ignored while disabled; a controlled collapsible only reports it, and
 * opens when its owner passes `open: true`; any other one opens at once and reports it.
 */
const openRequest: ReadonlyArray<TransitionConfig<CollapsibleSchema>> = [
  { guard: 'isDisabled' },
  { guard: 'isOpenControlled', actions: ['reportOpen'] },
  { target: 'open', actions: ['reportOpen'] },
];

/** A request to close, handled the same way. */
const closeRequest: ReadonlyArray<TransitionConfig<CollapsibleSchema>> = [
  { guard: 'isDisabled' },
  { guard: 'isOpenControlled', actions: ['reportClosed'] },
  { target: 'closed', actions: ['reportClosed'] },
];

/**
 * The collapsible machine: `closed` or `open`, with its owner in control of the state or not.
 * It asks nothing of the platform: showing, hiding and animating the content is up to the
 * adapter.
 *
 * - `OPEN` and `TOGGLE` open a closed collapsible; `CLOSE` and `TOGGLE` close an open one. Each
 *   change is reported as `onOpenChange({ open })`; a request for the current state is ignored.
 * - While `disabled`, every request is ignored.
 * - While `open` is controlled, requests are only reported: the state follows `open` when the
 *   owner passes a new value (`watch`), disabled or not, and following it reports nothing.
 *   `undefined` hands the state back to the machine, which keeps it as it is.
 * - The initial state is `open ?? defaultOpen`; `defaultOpen` is read once.
 *
 * @example
 * const service = createService(collapsibleMachine, { props: {}, platform });
 * service.start();
 * service.send({ type: 'TOGGLE' });
 * service.matches('open'); // true
 */
export const collapsibleMachine: Machine<CollapsibleSchema> = createMachine<CollapsibleSchema>({
  props: ({ disabled = false, ...input }) => ({ ...input, disabled }),
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
      on: {
        CLOSE: closeRequest,
        TOGGLE: closeRequest,
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
    syncOpen: ({ prop, send }) => {
      const open = prop('open');
      // `undefined`: the owner hands the state back to the machine, which keeps it.
      if (open !== undefined) {
        send({ type: open ? 'CONTROLLED.OPEN' : 'CONTROLLED.CLOSE' });
      }
    },
  },
  guards: {
    isDisabled: ({ prop }) => prop('disabled'),
    isOpenControlled: ({ prop }) => prop('open') !== undefined,
  },
  delays: {},
});
