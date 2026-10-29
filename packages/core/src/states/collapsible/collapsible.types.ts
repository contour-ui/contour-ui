/** What `onOpenChange` receives. */
export interface CollapsibleOpenChangeDetails {
  /** The state the collapsible moves to, or asks for while `open` is controlled. */
  readonly open: boolean;
}

/** What the owner of a collapsible passes. Every prop is optional. */
export interface CollapsibleInput {
  /**
   * Whether the collapsible is open, controlled by the owner. While it is defined, a request to
   * open or close it only calls `onOpenChange`; it opens or closes when the owner passes the new
   * value.
   */
  readonly open?: boolean | undefined;
  /**
   * Whether a collapsible that keeps its own state starts open. Read once, on creation.
   *
   * @defaultValue false
   */
  readonly defaultOpen?: boolean | undefined;
  /**
   * Called with `{ open }` for every request that opens or closes the collapsible. One that keeps
   * its own state changes at once; a controlled one changes when the owner passes the new
   * `open`, which is not reported back. Never called for a request for the state the
   * collapsible is in, nor while it is disabled.
   */
  readonly onOpenChange?: ((details: CollapsibleOpenChangeDetails) => void) | undefined;
  /**
   * Whether the collapsible ignores requests to open or close it: its trigger is disabled. A
   * controlled `open` is still followed.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
}

/** What the machine reads through `prop()`: the input with `disabled` filled in. */
export interface CollapsibleProps extends CollapsibleInput {
  readonly disabled: boolean;
}

/** `closed`, or `open` while the content shows. */
export type CollapsibleState = 'closed' | 'open';

/**
 * The events of the collapsible machine.
 *
 * - `OPEN`, `CLOSE`, `TOGGLE`: requests from the parts. Ignored while disabled; while `open` is
 *   controlled, they are only reported.
 * - `CONTROLLED.OPEN`, `CONTROLLED.CLOSE`: the owner passed a new `open`. Sent by the machine
 *   itself, which follows the prop without reporting it back.
 */
export type CollapsibleEvent =
  | { readonly type: 'OPEN' }
  | { readonly type: 'CLOSE' }
  | { readonly type: 'TOGGLE' }
  | { readonly type: 'CONTROLLED.OPEN' }
  | { readonly type: 'CONTROLLED.CLOSE' };

/** The types the collapsible machine is made of (see `MachineSchema`). */
export interface CollapsibleSchema {
  input: CollapsibleInput;
  props: CollapsibleProps;
  context: object;
  state: CollapsibleState;
  event: CollapsibleEvent;
  action: 'reportOpen' | 'reportClosed' | 'syncOpen';
  guard: 'isDisabled' | 'isOpenControlled';
  delay: never;
  platformAction: never;
  platformEffect: never;
}

/** The state and actions of a collapsible, as `connect` returns them: no DOM, no platform. */
export interface CollapsibleApi {
  /** Whether the collapsible is open. */
  readonly open: boolean;
  /** Whether the collapsible ignores requests to open or close it. */
  readonly disabled: boolean;
  /**
   * Ask to open (`true`) or close (`false`) the collapsible. While `open` is controlled, the
   * request is only reported through `onOpenChange`. A request for the current state, or one
   * while disabled, does nothing.
   */
  readonly setOpen: (open: boolean) => void;
  /** Ask to open the collapsible if it is closed, or to close it if it is open, as its trigger does. */
  readonly toggle: () => void;
}
