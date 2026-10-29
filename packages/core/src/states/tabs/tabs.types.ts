/** What `onValueChange` receives. */
export interface TabsValueChangeDetails {
  /** The value of the selected tab. */
  readonly value: string;
}

/** What `onFocusChange` receives. */
export interface TabsFocusChangeDetails {
  /** The value of the trigger that has focus, or `null` once focus left the triggers. */
  readonly focusedValue: string | null;
}

/** How the triggers are laid out, which sets the arrow keys: → and ←, or ↓ and ↑. */
export type TabsOrientation = 'horizontal' | 'vertical';

/**
 * When the keyboard selects a tab: `automatic`, as soon as an arrow key, Home or End moves focus
 * to its trigger; `manual`, only when the user presses Enter or Space on it (a click).
 */
export type TabsActivationMode = 'automatic' | 'manual';

/** A trigger of the tabs, as the adapter reports it. */
export interface TabsTrigger {
  /** The value of the tab the trigger selects. */
  readonly value: string;
  /**
   * The trigger ignores the user, and the keyboard skips it.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
}

/** What the owner of the tabs passes. Every prop is optional. */
export interface TabsInput {
  /**
   * The triggers, in the order the user moves through them: the adapter fills it with the
   * triggers it renders. Two triggers with one value count once, at the place of the first.
   *
   * @defaultValue []
   */
  readonly triggers?: readonly TabsTrigger[] | undefined;
  /**
   * The value of the selected tab, controlled by the owner: `null` for none. While it is defined,
   * a selection is only reported through `onValueChange`; it changes when the owner passes the
   * new value back. Any string works, also one without a trigger: then no trigger is selected,
   * and the content of that value, if any, shows.
   */
  readonly value?: string | null | undefined;
  /**
   * The tab selected at first, in tabs that keep their own value: `null` for none. Read once, on
   * creation. Without it no tab is selected, and no content shows, until the user picks one.
   *
   * @defaultValue null
   */
  readonly defaultValue?: string | null | undefined;
  /** Called with every new selection, controlled or not. */
  readonly onValueChange?: ((details: TabsValueChangeDetails) => void) | undefined;
  /** Called when focus moves to another trigger, or leaves them. */
  readonly onFocusChange?: ((details: TabsFocusChangeDetails) => void) | undefined;
  /**
   * How the triggers are laid out: → and ← move along a horizontal list, ↓ and ↑ along a
   * vertical one.
   *
   * @defaultValue 'horizontal'
   */
  readonly orientation?: TabsOrientation | undefined;
  /**
   * Whether moving focus with the keyboard selects the tab too.
   *
   * @defaultValue 'automatic'
   */
  readonly activationMode?: TabsActivationMode | undefined;
  /**
   * Arrow keys wrap around from the last trigger to the first, and back.
   *
   * @defaultValue true
   */
  readonly loopFocus?: boolean | undefined;
}

/** What the machine reads through `prop()`: the input with the defaults filled in. */
export interface TabsProps extends TabsInput {
  readonly triggers: readonly TabsTrigger[];
  readonly orientation: TabsOrientation;
  readonly activationMode: TabsActivationMode;
  readonly loopFocus: boolean;
}

/** The tabs have one state: what changes is their context. */
export type TabsState = 'idle';

/**
 * The events of the tabs machine. The adapter turns keys into intents (`getListIntent`) and
 * sends the matching event.
 *
 * - `FOCUS.FIRST`, `FOCUS.LAST`, `FOCUS.NEXT`, `FOCUS.PREVIOUS`: move focus to another trigger
 *   as Home, End and the arrow keys do, and select its tab in the `automatic` mode.
 * - `FOCUS.SET`: move focus to the trigger of `value`, without selecting it.
 * - `TRIGGER.FOCUS`: a trigger got focus (it is not selected for that). `BLUR`: focus left the
 *   triggers.
 * - `TRIGGER.CLICK`: the user clicked a trigger, or pressed Enter or Space on it: select its tab.
 * - `VALUE.SET`: select a tab.
 */
export type TabsEvent =
  | { readonly type: 'FOCUS.FIRST' }
  | { readonly type: 'FOCUS.LAST' }
  | { readonly type: 'FOCUS.NEXT' }
  | { readonly type: 'FOCUS.PREVIOUS' }
  | { readonly type: 'FOCUS.SET'; readonly value: string }
  | { readonly type: 'TRIGGER.FOCUS'; readonly value: string }
  | { readonly type: 'BLUR' }
  | { readonly type: 'TRIGGER.CLICK'; readonly value: string }
  | { readonly type: 'VALUE.SET'; readonly value: string };

/** The types the tabs machine is made of (see `MachineSchema`). */
export interface TabsSchema {
  input: TabsInput;
  props: TabsProps;
  context: {
    /** The value of the selected tab: controlled by the `value` prop, or owned. */
    value: string | null;
    /** The value of the trigger that has focus, or `null`. Owned by the machine. */
    focusedValue: string | null;
  };
  state: TabsState;
  event: TabsEvent;
  action:
    | 'focusFirst'
    | 'focusLast'
    | 'focusNext'
    | 'focusPrevious'
    | 'setFocusedValue'
    | 'clearFocusedValue'
    | 'selectFocusedAutomatically'
    | 'selectEventValue';
  guard: 'triggerEnabled';
  delay: never;
  /**
   * Move focus to the trigger of `context.get('focusedValue')`. The trigger reports the focus
   * back with `TRIGGER.FOCUS`.
   */
  platformAction: 'focusTrigger';
  platformEffect: never;
}

/** The state of one trigger, as its part shows it. */
export interface TabsTriggerState {
  /** The value of its tab. */
  readonly value: string;
  /** Whether its tab is selected. */
  readonly selected: boolean;
  /** Whether it has focus. */
  readonly focused: boolean;
  /** Whether it is disabled. */
  readonly disabled: boolean;
  /**
   * Whether Tab reaches it: the trigger of the selected tab, or the first enabled trigger when
   * that one is missing or disabled. The other triggers are reached with the arrow keys. While
   * no trigger is known (`triggers` is empty), the trigger of the selected tab.
   */
  readonly tabStop: boolean;
}

/** The state of one content, as its part shows it. */
export interface TabsContentState {
  /** The value of its tab. */
  readonly value: string;
  /** Whether its tab is selected: the content shows. */
  readonly selected: boolean;
}

/** The state and actions of the tabs, as `connect` returns them: no DOM, no platform. */
export interface TabsApi {
  /** The value of the selected tab, or `null`. */
  readonly value: string | null;
  /** The value of the trigger that has focus, or `null`. */
  readonly focusedValue: string | null;
  /** The triggers, in order, as the adapter reported them (one per value). */
  readonly triggers: readonly TabsTrigger[];
  /**
   * The value of the trigger that Tab reaches, or `null` when every trigger is disabled. While no
   * trigger is known, the selected value.
   */
  readonly tabStopValue: string | null;
  /** How the triggers are laid out. */
  readonly orientation: TabsOrientation;
  /** Whether moving focus selects. */
  readonly activationMode: TabsActivationMode;
  /** The state of a trigger, from its value and its own `disabled`. */
  readonly getTriggerState: (trigger: TabsTrigger) => TabsTriggerState;
  /** The state of a content, from its value. */
  readonly getContentState: (content: { readonly value: string }) => TabsContentState;
  /** Select the tab of this value, reported through `onValueChange`. */
  readonly setValue: (value: string) => void;
  /** Move focus to the trigger of this value, without selecting it. */
  readonly focus: (value: string) => void;
  /** Move focus to the first enabled trigger, as Home does. */
  readonly focusFirst: () => void;
  /** Move focus to the last enabled trigger, as End does. */
  readonly focusLast: () => void;
  /** Move focus to the next enabled trigger, as → (↓ when vertical) does. */
  readonly focusNext: () => void;
  /** Move focus to the previous enabled trigger, as ← (↑ when vertical) does. */
  readonly focusPrevious: () => void;
}
