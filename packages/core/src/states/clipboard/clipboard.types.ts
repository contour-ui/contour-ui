/** What `onValueChange` receives. */
export interface ClipboardValueChangeDetails {
  /** The new text to copy. */
  readonly value: string;
}

/** What `onStatusChange` receives. */
export interface ClipboardStatusChangeDetails {
  /** `true` when a written copy starts the copied state, `false` when the state ends. */
  readonly copied: boolean;
}

/** What the owner of a clipboard passes. Every prop is optional. */
export interface ClipboardInput {
  /**
   * The text to copy, controlled by the owner. While it is defined, `setValue` only reports the
   * new value through `onValueChange`; the value changes when the owner passes it back.
   */
  readonly value?: string | undefined;
  /**
   * The starting text of a clipboard that keeps its own value. Read once, on creation.
   *
   * @defaultValue ''
   */
  readonly defaultValue?: string | undefined;
  /**
   * Called with every new value, controlled or not. Not called for a value equal to the current
   * one.
   */
  readonly onValueChange?: ((details: ClipboardValueChangeDetails) => void) | undefined;
  /**
   * Called with `{ copied: true }` when the platform has written the value and the copied state
   * starts, and with `{ copied: false }` when the state ends: after `timeout`, or when a later
   * write fails. A first write that fails reports nothing: nothing was copied. A copy during the
   * copied state reports nothing either; its write starts the timeout over.
   */
  readonly onStatusChange?: ((details: ClipboardStatusChangeDetails) => void) | undefined;
  /**
   * How long the copied state lasts, in milliseconds.
   *
   * @defaultValue 3000
   */
  readonly timeout?: number | undefined;
}

/** What the machine reads through `prop()`: the input with `timeout` filled in. */
export interface ClipboardProps extends ClipboardInput {
  readonly timeout: number;
}

/**
 * `idle`; `copying` while the first write is pending; `copied` for `timeout` milliseconds after
 * a write is done.
 */
export type ClipboardState = 'idle' | 'copying' | 'copied';

/**
 * The events of the clipboard machine.
 *
 * - `COPY`: write the value to the clipboard.
 * - `COPY.DONE`: the platform has written it.
 * - `COPY.FAILED`: the platform could not write it.
 * - `VALUE.SET`: change the value.
 */
export type ClipboardEvent =
  | { readonly type: 'COPY' }
  | { readonly type: 'COPY.DONE' }
  | { readonly type: 'COPY.FAILED' }
  | { readonly type: 'VALUE.SET'; readonly value: string };

/** The types the clipboard machine is made of (see `MachineSchema`). */
export interface ClipboardSchema {
  input: ClipboardInput;
  props: ClipboardProps;
  context: {
    /** The text to copy: controlled by the `value` prop, or owned by the machine. */
    value: string;
  };
  state: ClipboardState;
  event: ClipboardEvent;
  action: 'setValue' | 'reportCopied' | 'reportIdle';
  guard: never;
  delay: 'timeout';
  /**
   * Write `context.get('value')` to the clipboard, then send `COPY.DONE`, or `COPY.FAILED` when
   * that fails.
   */
  platformAction: 'writeText';
  platformEffect: never;
}

/** The state and actions of a clipboard, as `connect` returns them: no DOM, no platform. */
export interface ClipboardApi {
  /** Whether a write of the value was done less than `timeout` milliseconds ago. */
  readonly copied: boolean;
  /** The text to copy. */
  readonly value: string;
  /** Write the value to the clipboard. Ignored while a first write is pending. */
  readonly copy: () => void;
  /**
   * Change the value. It is reported through `onValueChange`; a controlled value changes when
   * the owner passes it back.
   */
  readonly setValue: (value: string) => void;
}
