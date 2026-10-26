import type { ListCollection } from '../../collection/index.ts';

/** What `onValueChange` receives. */
export interface ListboxValueChangeDetails<T = unknown> {
  /** The values of the selected items, in the order they were selected. */
  readonly value: string[];
  /**
   * The selected items, in the same order. A value whose item is not in the collection, such as
   * one that a filter took out, has no item here.
   */
  readonly items: T[];
}

/** What `onHighlightChange` receives. */
export interface ListboxHighlightChangeDetails<T = unknown> {
  /** The value of the highlighted item, or `null` when none is. */
  readonly highlightedValue: string | null;
  /** The highlighted item, or `null`. */
  readonly highlightedItem: T | null;
  /** The position of the highlighted item in the collection, or `-1`. */
  readonly highlightedIndex: number;
}

/** What `onSelect` receives. */
export interface ListboxSelectDetails<T = unknown> {
  /** The value of the item the user selected. */
  readonly value: string;
  /** The item. */
  readonly item: T;
}

/**
 * How many items can be selected: one, which a new selection replaces, or any number, each
 * selection toggling one item.
 */
export type ListboxSelectionMode = 'single' | 'multiple';

/** What the owner of a listbox passes. Only `collection` is required. */
export interface ListboxInput<T = unknown> {
  /** The items, from `createListCollection`. */
  readonly collection: ListCollection<T>;
  /**
   * The values of the selected items, controlled by the owner. While it is defined, a selection
   * is only reported through `onValueChange`; it changes when the owner passes the new value back.
   */
  readonly value?: readonly string[] | undefined;
  /**
   * The values selected at first, in a listbox that keeps its own value. Read once, on creation.
   *
   * @defaultValue []
   */
  readonly defaultValue?: readonly string[] | undefined;
  /** Called with every new value, controlled or not. */
  readonly onValueChange?: ((details: ListboxValueChangeDetails<T>) => void) | undefined;
  /**
   * The value of the highlighted item, controlled by the owner: `null` for none. While it is
   * defined, a move of the highlight is only reported through `onHighlightChange`.
   */
  readonly highlightedValue?: string | null | undefined;
  /**
   * The value highlighted at first, in a listbox that keeps its own highlight. Read once, on
   * creation.
   *
   * @defaultValue null
   */
  readonly defaultHighlightedValue?: string | null | undefined;
  /** Called with every move of the highlight, controlled or not. */
  readonly onHighlightChange?: ((details: ListboxHighlightChangeDetails<T>) => void) | undefined;
  /**
   * Called when the user selects an item (Enter, Space, a click, or `selectValue`) and the item
   * ends up selected, also when it already was: selecting the selected item of a single
   * selection reports it again. Not called for an item a selection toggles off.
   */
  readonly onSelect?: ((details: ListboxSelectDetails<T>) => void) | undefined;
  /**
   * How many items can be selected.
   *
   * @defaultValue 'single'
   */
  readonly selectionMode?: ListboxSelectionMode | undefined;
  /**
   * In a single selection, selecting the selected item clears the value.
   *
   * @defaultValue false
   */
  readonly deselectable?: boolean | undefined;
  /**
   * In a single selection, select the item the keyboard highlights: with the arrow keys, Home,
   * End and typeahead.
   *
   * @defaultValue false
   */
  readonly selectOnHighlight?: boolean | undefined;
  /**
   * Arrow keys wrap around from the last item to the first, and back.
   *
   * @defaultValue false
   */
  readonly loopFocus?: boolean | undefined;
  /**
   * Typing the first letters of an item highlights it.
   *
   * @defaultValue true
   */
  readonly typeahead?: boolean | undefined;
  /**
   * The pointer highlights the item it moves over, so the highlight and the pointer never show
   * two different items. Leaving the list clears a highlight the pointer made while the listbox
   * had no focus.
   *
   * @defaultValue true
   */
  readonly highlightOnHover?: boolean | undefined;
  /**
   * Highlight the first item while the user types in the input: when the input gets focus with
   * nothing highlighted, and whenever the items change while the listbox has focus. Enter then
   * selects the best match at once, as in a search box.
   *
   * @defaultValue false
   */
  readonly autoHighlight?: boolean | undefined;
  /**
   * The listbox ignores the user: no highlight, no selection. The owner can still set the value.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
  /**
   * How the items are laid out, which sets the arrow keys: ↓ and ↑, or → and ←.
   *
   * @defaultValue 'vertical'
   */
  readonly orientation?: 'vertical' | 'horizontal' | undefined;
}

/** What the machine reads through `prop()`: the input with the defaults filled in. */
export interface ListboxProps extends ListboxInput {
  readonly selectionMode: ListboxSelectionMode;
  readonly deselectable: boolean;
  readonly selectOnHighlight: boolean;
  readonly loopFocus: boolean;
  readonly typeahead: boolean;
  readonly highlightOnHover: boolean;
  readonly autoHighlight: boolean;
  readonly disabled: boolean;
  readonly orientation: 'vertical' | 'horizontal';
}

/** The listbox has one state: what changes is its context. */
export type ListboxState = 'idle';

/**
 * The events of the listbox machine. The adapter turns keys into intents (`getListIntent`,
 * `nextTypeahead`) and sends the matching event.
 *
 * - `HIGHLIGHT.FIRST`, `HIGHLIGHT.LAST`, `HIGHLIGHT.NEXT`, `HIGHLIGHT.PREVIOUS`: move the
 *   highlight as a key does (Home, End, ↓, ↑), and select with `selectOnHighlight`.
 * - `HIGHLIGHT.SET`: highlight an item, or nothing with `null`.
 * - `TYPEAHEAD`: highlight the item that the typed query matches.
 * - `ITEM.HOVER`: the pointer moved over an item. `POINTER.LEAVE`: it left the list.
 * - `ITEM.CLICK`: the user clicked an item: highlight and select it.
 * - `ITEM.SELECT`: select an item as a click does, without moving the highlight.
 * - `HIGHLIGHTED.SELECT`: select the highlighted item (Enter, Space).
 * - `VALUE.SET`: replace the selection.
 * - `CONTENT.FOCUS`, `INPUT.FOCUS`: the list or the input got focus. `BLUR`: focus left both.
 */
export type ListboxEvent =
  | { readonly type: 'HIGHLIGHT.FIRST' }
  | { readonly type: 'HIGHLIGHT.LAST' }
  | { readonly type: 'HIGHLIGHT.NEXT' }
  | { readonly type: 'HIGHLIGHT.PREVIOUS' }
  | { readonly type: 'HIGHLIGHT.SET'; readonly value: string | null }
  | { readonly type: 'TYPEAHEAD'; readonly query: string }
  | { readonly type: 'ITEM.HOVER'; readonly value: string }
  | { readonly type: 'POINTER.LEAVE' }
  | { readonly type: 'ITEM.CLICK'; readonly value: string }
  | { readonly type: 'ITEM.SELECT'; readonly value: string }
  | { readonly type: 'HIGHLIGHTED.SELECT' }
  | { readonly type: 'VALUE.SET'; readonly value: readonly string[] }
  | { readonly type: 'CONTENT.FOCUS' }
  | { readonly type: 'INPUT.FOCUS' }
  | { readonly type: 'BLUR' };

/** The types the listbox machine is made of (see `MachineSchema`). */
export interface ListboxSchema {
  input: ListboxInput;
  props: ListboxProps;
  context: {
    /** The values of the selected items: controlled by the `value` prop, or owned. */
    value: readonly string[];
    /** The value of the highlighted item: controlled by `highlightedValue`, or owned. */
    highlightedValue: string | null;
    /** Whether the list or the input has focus. */
    focused: boolean;
    /** The values of the collection the machine last saw, to tell new items from a new object. */
    collectionValues: readonly string[];
  };
  state: ListboxState;
  event: ListboxEvent;
  action:
    | 'highlightFirst'
    | 'highlightLast'
    | 'highlightNext'
    | 'highlightPrevious'
    | 'highlightMatch'
    | 'setHighlightedValue'
    | 'clearHighlightedValue'
    | 'clickItem'
    | 'selectItem'
    | 'selectHighlighted'
    | 'setValue'
    | 'setFocused'
    | 'clearFocused'
    | 'highlightSelectedOrFirst'
    | 'highlightFirstWhileTyping'
    | 'syncCollection';
  guard: 'interactive' | 'typeaheadEnabled' | 'hoverEnabled' | 'itemEnabled' | 'leavingUnfocused';
  delay: never;
  platformAction: never;
  platformEffect: never;
}

/** The state of one item, as its parts show it. */
export interface ListboxItemState {
  /** The value of the item. */
  readonly value: string;
  /** Whether the item, or the whole listbox, is disabled. */
  readonly disabled: boolean;
  /** Whether the item is selected. */
  readonly selected: boolean;
  /** Whether the item is highlighted: the one the keyboard acts on. */
  readonly highlighted: boolean;
}

/** The state and actions of a listbox, as `connect` returns them: no DOM, no platform. */
export interface ListboxApi<T = unknown> {
  /** The items. */
  readonly collection: ListCollection<T>;
  /** The values of the selected items. */
  readonly value: readonly string[];
  /** The selected items that are in the collection, in the order of `value`. */
  readonly selectedItems: readonly T[];
  /** The value of the highlighted item, or `null`. */
  readonly highlightedValue: string | null;
  /** The highlighted item, or `null`, also when the highlighted value is not in the collection. */
  readonly highlightedItem: T | null;
  /** Whether the list or the input has focus. */
  readonly focused: boolean;
  /** Whether the listbox is disabled. */
  readonly disabled: boolean;
  /** Whether several items can be selected. */
  readonly multiple: boolean;
  /** How the items are laid out. */
  readonly orientation: 'vertical' | 'horizontal';
  /** The state of an item of the collection. */
  readonly getItemState: (item: T) => ListboxItemState;
  /** Highlight the item with this value, or nothing with `null`. */
  readonly highlightValue: (value: string | null) => void;
  /** Highlight nothing. */
  readonly clearHighlightedValue: () => void;
  /** Highlight the first enabled item, as Home does. */
  readonly highlightFirst: () => void;
  /** Highlight the last enabled item, as End does. */
  readonly highlightLast: () => void;
  /** Highlight the next enabled item, as ↓ does. */
  readonly highlightNext: () => void;
  /** Highlight the previous enabled item, as ↑ does. */
  readonly highlightPrevious: () => void;
  /**
   * Select the item with this value as a click does: in a single selection it replaces the
   * value, in a multiple one it toggles the item.
   */
  readonly selectValue: (value: string) => void;
  /** Replace the selection, reported through `onValueChange`. */
  readonly setValue: (value: readonly string[]) => void;
  /** Deselect the item with this value, or every item without one. */
  readonly clearValue: (value?: string) => void;
}
