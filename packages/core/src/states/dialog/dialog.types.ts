/** What `onOpenChange` receives. */
export interface DialogOpenChangeDetails {
  /** The state the dialog moves to, or asks for while `open` is controlled. */
  readonly open: boolean;
}

/**
 * The kind of dialog. An `alertdialog` asks for a response to something urgent: unless told
 * otherwise, an interaction outside it does not close it.
 */
export type DialogRole = 'dialog' | 'alertdialog';

/** What the owner of a dialog passes. Every prop is optional. */
export interface DialogInput {
  /**
   * Whether the dialog is open, controlled by the owner. While it is defined, a request to open
   * or close the dialog only calls `onOpenChange`; the dialog opens or closes when the owner
   * passes the new value.
   */
  readonly open?: boolean | undefined;
  /**
   * Whether a dialog that keeps its own state starts open. Read once, on creation.
   *
   * @defaultValue false
   */
  readonly defaultOpen?: boolean | undefined;
  /**
   * Called with `{ open }` for every request that opens or closes the dialog: from its parts,
   * Escape or an interaction outside it. A dialog that keeps its own state changes at once; a
   * controlled one changes when the owner passes the new `open`, which is not reported back.
   * Never called for a request for the state the dialog is in.
   */
  readonly onOpenChange?: ((details: DialogOpenChangeDetails) => void) | undefined;
  /**
   * Whether the dialog is modal: while it is open, the rest of the page is hidden from input
   * and assistive technologies, focus stays inside the dialog and the page does not scroll.
   * The last two can be set on their own with `trapFocus` and `preventScroll`.
   *
   * @defaultValue true
   */
  readonly modal?: boolean | undefined;
  /**
   * Whether focus stays inside the open dialog: moving it past the last element brings it back
   * to the first one, and back from the first to the last.
   *
   * @defaultValue the value of `modal`
   */
  readonly trapFocus?: boolean | undefined;
  /**
   * Whether the page behind the open dialog stops scrolling.
   *
   * @defaultValue the value of `modal`
   */
  readonly preventScroll?: boolean | undefined;
  /**
   * Whether an interaction outside the open dialog, such as a press on its backdrop, closes it.
   *
   * @defaultValue `true` for a modal `dialog`; `false` for a non-modal one and for an `alertdialog`
   */
  readonly closeOnInteractOutside?: boolean | undefined;
  /**
   * Whether Escape closes the open dialog.
   *
   * @defaultValue true
   */
  readonly closeOnEscape?: boolean | undefined;
  /**
   * The kind of dialog.
   *
   * @defaultValue 'dialog'
   */
  readonly role?: DialogRole | undefined;
  /**
   * Whether focus goes back, when the dialog closes, to where it was before it opened: as a
   * rule, the trigger. Focus that has moved on to something outside the dialog stays there.
   *
   * @defaultValue true
   */
  readonly restoreFocus?: boolean | undefined;
}

/** What the machine reads through `prop()`: the input with every default filled in. */
export interface DialogProps extends DialogInput {
  readonly modal: boolean;
  readonly trapFocus: boolean;
  readonly preventScroll: boolean;
  readonly closeOnInteractOutside: boolean;
  readonly closeOnEscape: boolean;
  readonly role: DialogRole;
  readonly restoreFocus: boolean;
}

/** `closed`, or `open` while the dialog is shown. */
export type DialogState = 'closed' | 'open';

/**
 * The events of the dialog machine.
 *
 * - `OPEN`, `CLOSE`, `TOGGLE`: requests from the parts. While `open` is controlled, they are
 *   only reported.
 * - `ESCAPE`: Escape was pressed while the dialog was the topmost layer. Sent by the platform's
 *   `dismiss` effect; a close request when `closeOnEscape` is set, ignored otherwise.
 * - `INTERACT_OUTSIDE`: a pointer or focus went outside the dialog. Sent by `dismiss`; a close
 *   request when `closeOnInteractOutside` is set, ignored otherwise.
 * - `CONTROLLED.OPEN`, `CONTROLLED.CLOSE`: the owner passed a new `open`. Sent by the machine
 *   itself, which follows the prop without reporting it back.
 */
export type DialogEvent =
  | { readonly type: 'OPEN' }
  | { readonly type: 'CLOSE' }
  | { readonly type: 'TOGGLE' }
  | { readonly type: 'ESCAPE' }
  | { readonly type: 'INTERACT_OUTSIDE' }
  | { readonly type: 'CONTROLLED.OPEN' }
  | { readonly type: 'CONTROLLED.CLOSE' };

/** The types the dialog machine is made of (see `MachineSchema`). */
export interface DialogSchema {
  input: DialogInput;
  props: DialogProps;
  /** No values of its own: the state tells whether the dialog is open. */
  context: object;
  state: DialogState;
  event: DialogEvent;
  action: 'reportOpen' | 'reportClosed' | 'sendClose' | 'syncOpen';
  guard: 'isOpenControlled' | 'closeOnEscape' | 'closeOnInteractOutside';
  delay: never;
  /**
   * - `setInitialFocus`, when the dialog opens or starts open: move focus into it, to the
   *   element the adapter was given, the first one that takes focus, or the content itself.
   * - `restoreFocus`, when it closes, after its effects have stopped: if `prop('restoreFocus')`
   *   is set and focus is still inside the dialog or nowhere, move it back to where it was
   *   before the dialog opened (as a rule, the trigger). Focus that has moved on to something
   *   outside, such as a field pressed outside a non-modal dialog, stays there.
   */
  platformAction: 'setInitialFocus' | 'restoreFocus';
  /**
   * The effects of the open dialog, started in this order and stopped in reverse. The machine
   * starts all of them, whatever the props; those that depend on a prop check it.
   *
   * - `dismiss`: while the dialog is the topmost layer, send `ESCAPE` when Escape is pressed and
   *   `INTERACT_OUTSIDE` when a pointer or focus goes outside it.
   * - `trapFocus`: if `prop('trapFocus')` is set, keep focus inside the dialog.
   * - `preventScroll`: if `prop('preventScroll')` is set, stop the page behind it from scrolling.
   * - `hideOutside`: if `prop('modal')` is set, hide the rest of the page from input and
   *   assistive technologies (`inert` in the DOM).
   */
  platformEffect: 'dismiss' | 'trapFocus' | 'preventScroll' | 'hideOutside';
}

/** The state and actions of a dialog, as `connect` returns them: no DOM, no platform. */
export interface DialogApi {
  /** Whether the dialog is open. */
  readonly open: boolean;
  /** Whether the dialog is modal: the rest of the page is out of reach while it is open. */
  readonly modal: boolean;
  /** The kind of dialog. */
  readonly role: DialogRole;
  /**
   * Ask to open (`true`) or close (`false`) the dialog. While `open` is controlled, the request
   * is only reported through `onOpenChange`. A request for the current state does nothing.
   */
  readonly setOpen: (open: boolean) => void;
  /** Ask to open the dialog if it is closed, or to close it if it is open, as its trigger does. */
  readonly toggle: () => void;
}
