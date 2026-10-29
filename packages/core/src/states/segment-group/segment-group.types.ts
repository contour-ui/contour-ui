/** What `onValueChange` receives. */
export interface SegmentGroupValueChangeDetails {
  /** The value of the checked item, or `null` when none is checked. */
  readonly value: string | null;
}

/** The direction the items are laid out in. */
export type SegmentGroupOrientation = 'horizontal' | 'vertical';

/** What the owner of a segment group passes. Every prop is optional. */
export interface SegmentGroupInput {
  /**
   * The value of the checked item, controlled by the owner; `null` checks none. While it is
   * defined, a check only reports the new value through `onValueChange`; the value changes when
   * the owner passes it back.
   */
  readonly value?: string | null | undefined;
  /**
   * The value checked at first in a group that keeps its own value. Read once, on creation.
   *
   * @defaultValue null
   */
  readonly defaultValue?: string | null | undefined;
  /** Called with every new value, controlled or not. Not called for the current value. */
  readonly onValueChange?: ((details: SegmentGroupValueChangeDetails) => void) | undefined;
  /**
   * Whether the whole group is disabled: no item can be checked or focused.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
  /**
   * Whether the value is shown but not changed by the user: items still take focus, and checks
   * are ignored. `setValue` still changes it.
   *
   * @defaultValue false
   */
  readonly readOnly?: boolean | undefined;
  /**
   * The direction the items are laid out in. Arrow keys of both axes move the check, as with
   * native radio buttons.
   *
   * @defaultValue 'horizontal'
   */
  readonly orientation?: SegmentGroupOrientation | undefined;
}

/** What the machine reads through `prop()`: the input with its defaults filled in. */
export interface SegmentGroupProps extends SegmentGroupInput {
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly orientation: SegmentGroupOrientation;
}

/** A segment group has a single state: everything it tracks is in its context. */
export type SegmentGroupState = 'idle';

/**
 * The events of the segment group machine.
 *
 * - `ITEM.CHECK`: the user checks an item (a click, an arrow key). Ignored while the group is
 *   disabled or read-only, and for a disabled item.
 * - `ITEM.FOCUS`: an item takes focus; `focusVisible` when the platform shows a focus ring for it
 *   (a keyboard focus).
 * - `ITEM.BLUR`: the focused item loses focus.
 * - `VALUE.SET`: change the value from code, whatever `disabled` and `readOnly` say.
 */
export type SegmentGroupEvent =
  | { readonly type: 'ITEM.CHECK'; readonly value: string; readonly disabled?: boolean }
  | { readonly type: 'ITEM.FOCUS'; readonly value: string; readonly focusVisible: boolean }
  | { readonly type: 'ITEM.BLUR' }
  | { readonly type: 'VALUE.SET'; readonly value: string | null };

/** The types the segment group machine is made of (see `MachineSchema`). */
export interface SegmentGroupSchema {
  input: SegmentGroupInput;
  props: SegmentGroupProps;
  context: {
    /** The value of the checked item: controlled by the `value` prop, or owned by the machine. */
    value: string | null;
    /** The value of the item that has focus, or `null`. */
    focusedValue: string | null;
    /** Whether the focused item shows a focus ring. */
    focusVisible: boolean;
  };
  state: SegmentGroupState;
  event: SegmentGroupEvent;
  action: 'checkItem' | 'setValue' | 'focusItem' | 'blurItem';
  guard: 'canCheck';
  delay: never;
  platformAction: never;
  platformEffect: never;
}

/** What `getItemState` takes: the props of an item. */
export interface SegmentGroupItemProps {
  /** The value of the item, unique in its group. */
  readonly value: string;
  /** Whether this item is disabled. */
  readonly disabled?: boolean | undefined;
}

/** The state of one item. */
export interface SegmentGroupItemState {
  readonly value: string;
  /** Whether the item is the checked one. */
  readonly checked: boolean;
  /** Whether the item or the whole group is disabled. */
  readonly disabled: boolean;
  /** Whether the item has focus. */
  readonly focused: boolean;
  /** Whether the item has focus and shows a focus ring. */
  readonly focusVisible: boolean;
}

/** The state and actions of a segment group, as `connect` returns them: no DOM, no platform. */
export interface SegmentGroupApi {
  /** The value of the checked item, or `null`. */
  readonly value: string | null;
  /** The value of the focused item, or `null`. */
  readonly focusedValue: string | null;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly orientation: SegmentGroupOrientation;
  /**
   * Change the value (`null` checks none), whatever `disabled` and `readOnly` say. It is
   * reported through `onValueChange`; a controlled value changes when the owner passes it back.
   */
  readonly setValue: (value: string | null) => void;
  /** Check an item as the user does: ignored while disabled or read-only. */
  readonly checkItem: (item: SegmentGroupItemProps) => void;
  /** Tell the machine an item took focus. */
  readonly focusItem: (value: string, focusVisible: boolean) => void;
  /** Tell the machine the focused item lost it. */
  readonly blurItem: () => void;
  /** The state of an item. */
  readonly getItemState: (item: SegmentGroupItemProps) => SegmentGroupItemState;
}
