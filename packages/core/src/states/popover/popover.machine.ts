import { createMachine } from '../../machine/index.ts';
import type { Machine, TransitionConfig } from '../../machine/index.ts';
import { resolvePositioningOptions } from '../../positioning/index.ts';
import type { PositioningOptions } from '../../positioning/index.ts';
import type { PopoverSchema } from './popover.types.ts';

/**
 * Where the content goes when `positioning` leaves an option out: below the anchor, lined up
 * with its start edge, 8px away from it and from the edges of the viewport, and no larger than
 * the room it has. Positioning fills in the rest.
 */
const POPOVER_POSITIONING: PositioningOptions = {
  placement: 'bottom-start',
  offset: 8,
  shift: 8,
  fitViewport: true,
};

/**
 * A request to open: a controlled popover only reports it, and opens when its owner passes
 * `open: true`; any other popover opens at once, reports it and moves focus into the content.
 */
const openRequest: ReadonlyArray<TransitionConfig<PopoverSchema>> = [
  { guard: 'isOpenControlled', actions: ['reportOpen'] },
  { target: 'open', actions: ['reportOpen', 'setInitialFocus'] },
];

/** A request to close, handled the same way; focus goes back on the way out of `open`. */
const closeRequest: ReadonlyArray<TransitionConfig<PopoverSchema>> = [
  { guard: 'isOpenControlled', actions: ['reportClosed'] },
  { target: 'closed', actions: ['reportClosed'] },
];

/**
 * The popover machine: `closed` or `open`, with its owner in control of the state or not.
 *
 * - `OPEN` and `TOGGLE` open a closed popover; `CLOSE` and `TOGGLE` close an open one. Each
 *   change is reported as `onOpenChange({ open })`; a request for the current state is ignored.
 * - `ESCAPE` and `INTERACT_OUTSIDE`, which the `dismiss` effect sends, are close requests when
 *   `closeOnEscape` and `closeOnInteractOutside` allow them, and are ignored otherwise.
 * - While `open` is controlled, requests are only reported: the state follows `open` when the
 *   owner passes a new value (`watch`), and following it reports nothing. `undefined` hands the
 *   state back to the machine, which keeps it as it is.
 * - The initial state is `open ?? defaultOpen`; `defaultOpen` is read once.
 * - `open` runs the platform effects `position`, `dismiss`, `trapFocus`, `preventScroll`,
 *   `hideOutside` and `keepTabOrder`: `modal` turns on the three in the middle, and
 *   `keepTabOrder` works for a portalled popover that is not modal. `position` writes the
 *   placement it finds to the context.
 * - Opening moves focus into the content (`setInitialFocus`, when `autoFocus` is set); a popover
 *   that starts open leaves focus alone. Leaving `open`, once the effects have stopped, moves
 *   focus back (`restoreFocus`). Stopping the service stops the effects but leaves focus alone.
 *
 * @example
 * const service = createService(popoverMachine, { props: { modal: true }, platform });
 * service.start();
 * service.send({ type: 'TOGGLE' });
 * service.matches('open'); // true
 */
export const popoverMachine: Machine<PopoverSchema> = createMachine<PopoverSchema>({
  props: ({
    modal = false,
    portalled = true,
    autoFocus = true,
    restoreFocus = true,
    closeOnInteractOutside = true,
    closeOnEscape = true,
    positioning,
    ...input
  }) => ({
    ...input,
    modal,
    portalled,
    autoFocus,
    restoreFocus,
    closeOnInteractOutside,
    closeOnEscape,
    positioning: resolvePositioningOptions(POPOVER_POSITIONING, positioning),
  }),
  context: {
    placement: ({ prop }) => ({ defaultValue: prop('positioning').placement }),
  },
  initial: ({ prop }) => ((prop('open') ?? prop('defaultOpen')) === true ? 'open' : 'closed'),
  watch: {
    open: ['syncOpen'],
  },
  states: {
    closed: {
      on: {
        OPEN: openRequest,
        TOGGLE: openRequest,
        'CONTROLLED.OPEN': { target: 'open', actions: ['setInitialFocus'] },
      },
    },
    open: {
      effects: ['position', 'dismiss', 'trapFocus', 'preventScroll', 'hideOutside', 'keepTabOrder'],
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
