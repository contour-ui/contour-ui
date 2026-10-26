import type {
  Placement,
  PositioningOptions,
  ResolvedPositioningOptions,
} from '../../positioning/index.ts';

/** What `onOpenChange` receives. */
export interface PopoverOpenChangeDetails {
  /** The state the popover moves to, or asks for while `open` is controlled. */
  readonly open: boolean;
}

/** What the owner of a popover passes. Every prop is optional. */
export interface PopoverInput {
  /**
   * Whether the popover is open, controlled by the owner. While it is defined, a request to open
   * or close the popover only calls `onOpenChange`; the popover opens or closes when the owner
   * passes the new value.
   */
  readonly open?: boolean | undefined;
  /**
   * Whether a popover that keeps its own state starts open. Read once, on creation.
   *
   * @defaultValue false
   */
  readonly defaultOpen?: boolean | undefined;
  /**
   * Called with `{ open }` for every request that opens or closes the popover: from its parts,
   * Escape or an interaction outside it. A popover that keeps its own state changes at once; a
   * controlled one changes when the owner passes the new `open`, which is not reported back.
   * Never called for a request for the state the popover is in.
   */
  readonly onOpenChange?: ((details: PopoverOpenChangeDetails) => void) | undefined;
  /**
   * Whether the popover is modal: while it is open, the rest of the page is hidden from input
   * and assistive technologies, focus stays inside the popover and the page does not scroll.
   *
   * @defaultValue false
   */
  readonly modal?: boolean | undefined;
  /**
   * Whether the content is rendered in a layer above the page, away from the trigger (a portal,
   * in the DOM). A popover that is not modal keeps it in the Tab order right after the trigger
   * all the same: Tab moves from the trigger into the open content, and from its end on to what
   * follows the trigger.
   *
   * @defaultValue true
   */
  readonly portalled?: boolean | undefined;
  /**
   * Whether focus moves into the content when the popover opens: to the element the adapter was
   * given, the first one that takes focus, or the content itself. A popover that starts open
   * leaves focus where it is.
   *
   * @defaultValue true
   */
  readonly autoFocus?: boolean | undefined;
  /**
   * Whether focus goes back, when the popover closes, to where it was before it opened: as a
   * rule, the trigger. Focus that has moved on to something outside the popover, such as a
   * field pressed outside it, stays there.
   *
   * @defaultValue true
   */
  readonly restoreFocus?: boolean | undefined;
  /**
   * Whether an interaction outside the open popover closes it: a press outside it, or focus
   * moving out of it.
   *
   * @defaultValue true
   */
  readonly closeOnInteractOutside?: boolean | undefined;
  /**
   * Whether Escape closes the open popover.
   *
   * @defaultValue true
   */
  readonly closeOnEscape?: boolean | undefined;
  /**
   * How the content is placed next to its anchor (the trigger, or an anchor part): its side and
   * alignment, its distance, and how it moves to stay in view. Options left out keep the
   * popover's defaults, then those of positioning.
   *
   * @defaultValue `{ placement: 'bottom-start', offset: 8, shift: 8, fitViewport: true }`
   */
  readonly positioning?: PositioningOptions | undefined;
}

/** What the machine reads through `prop()`: the input with every default filled in. */
export interface PopoverProps extends PopoverInput {
  readonly modal: boolean;
  readonly portalled: boolean;
  readonly autoFocus: boolean;
  readonly restoreFocus: boolean;
  readonly closeOnInteractOutside: boolean;
  readonly closeOnEscape: boolean;
  readonly positioning: ResolvedPositioningOptions;
}

/** `closed`, or `open` while the popover is shown. */
export type PopoverState = 'closed' | 'open';

/**
 * The events of the popover machine.
 *
 * - `OPEN`, `CLOSE`, `TOGGLE`: requests from the parts. While `open` is controlled, they are
 *   only reported.
 * - `ESCAPE`: Escape was pressed while the popover was the topmost layer. Sent by the
 *   platform's `dismiss` effect; a close request when `closeOnEscape` is set, ignored otherwise.
 * - `INTERACT_OUTSIDE`: a pointer or focus went outside the popover. Sent by `dismiss`; a close
 *   request when `closeOnInteractOutside` is set, ignored otherwise.
 * - `CONTROLLED.OPEN`, `CONTROLLED.CLOSE`: the owner passed a new `open`. Sent by the machine
 *   itself, which follows the prop without reporting it back.
 */
export type PopoverEvent =
  | { readonly type: 'OPEN' }
  | { readonly type: 'CLOSE' }
  | { readonly type: 'TOGGLE' }
  | { readonly type: 'ESCAPE' }
  | { readonly type: 'INTERACT_OUTSIDE' }
  | { readonly type: 'CONTROLLED.OPEN' }
  | { readonly type: 'CONTROLLED.CLOSE' };

/** The types the popover machine is made of (see `MachineSchema`). */
export interface PopoverSchema {
  input: PopoverInput;
  props: PopoverProps;
  context: {
    /**
     * Where the content sits next to its anchor: the placement `positioning` asked for on
     * creation, until the `position` effect has placed the content; from then on, the last
     * placement it found, which differs after a flip and stays while the popover is closed.
     */
    placement: Placement;
  };
  state: PopoverState;
  event: PopoverEvent;
  action: 'reportOpen' | 'reportClosed' | 'sendClose' | 'syncOpen';
  guard: 'isOpenControlled' | 'closeOnEscape' | 'closeOnInteractOutside';
  delay: never;
  /**
   * - `setInitialFocus`, when a request or the owner opens the popover, but not when it starts
   *   open: if `prop('autoFocus')` is set, move focus into the content, to the element the
   *   adapter was given, the first one that takes focus, or the content itself.
   * - `restoreFocus`, when it closes, after its effects have stopped: if `prop('restoreFocus')`
   *   is set and focus is still inside the popover or nowhere, move it back to where it was
   *   before the popover opened (as a rule, the trigger). Focus that has moved on to something
   *   outside, such as a field the user pressed, stays there.
   */
  platformAction: 'setInitialFocus' | 'restoreFocus';
  /**
   * The effects of the open popover, started in this order and stopped in reverse. The machine
   * starts all of them, whatever the props; those that depend on a prop check it.
   *
   * - `position`: place the content next to its anchor as `prop('positioning')` asks, keep it
   *   there while the page scrolls or resizes, and write the placement it ends up with to the
   *   `placement` context field.
   * - `dismiss`: while the popover is the topmost layer, send `ESCAPE` when Escape is pressed and
   *   `INTERACT_OUTSIDE` when a pointer or focus goes outside it. The trigger does not count as
   *   outside: pressing it toggles the popover.
   * - `trapFocus`: if `prop('modal')` is set, keep focus inside the popover.
   * - `preventScroll`: if `prop('modal')` is set, stop the page behind it from scrolling.
   * - `hideOutside`: if `prop('modal')` is set, hide the rest of the page from input and
   *   assistive technologies (`inert` in the DOM).
   * - `keepTabOrder`: if `prop('portalled')` is set and `prop('modal')` is not, keep the content
   *   in the Tab order right after the trigger, wherever it is rendered.
   */
  platformEffect:
    | 'position'
    | 'dismiss'
    | 'trapFocus'
    | 'preventScroll'
    | 'hideOutside'
    | 'keepTabOrder';
}

/** The state and actions of a popover, as `connect` returns them: no DOM, no platform. */
export interface PopoverApi {
  /** Whether the popover is open. */
  readonly open: boolean;
  /** Whether the popover is modal: the rest of the page is out of reach while it is open. */
  readonly modal: boolean;
  /** Whether the content is rendered in a layer above the page, away from the trigger. */
  readonly portalled: boolean;
  /** Where the content sits next to its anchor, after any flip. */
  readonly placement: Placement;
  /**
   * Ask to open (`true`) or close (`false`) the popover. While `open` is controlled, the
   * request is only reported through `onOpenChange`. A request for the current state does
   * nothing.
   */
  readonly setOpen: (open: boolean) => void;
  /** Ask to open the popover if it is closed, or to close it if it is open, as its trigger does. */
  readonly toggle: () => void;
}
