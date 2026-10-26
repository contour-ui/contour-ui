import { getListIntent, initialTypeahead, listbox, nextTypeahead } from '@contour-ui/core';
import type { ListIntent, Platform, TypeaheadState } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, RefCallback } from 'react';

import { schedule } from '../platform/clock.ts';
import { scrollIntoContainer } from '../platform/scroll.ts';

/** Props of {@link useListbox}: the input of the listbox machine of `@contour-ui/core`. */
export type UseListboxProps<T = unknown> = listbox.Input<T>;

/** What every part of a listbox carries. */
export interface ListboxPartAttributes<Part extends string> {
  readonly 'data-scope': 'listbox';
  readonly 'data-part': Part;
}

/** Present, empty, while a state holds; absent otherwise. */
type Flag = '' | undefined;

/** Props of the root. */
export interface ListboxRootAttributes extends ListboxPartAttributes<'root'> {
  readonly 'data-orientation': 'vertical' | 'horizontal';
  readonly 'data-disabled': Flag;
}

/** Props of the label: a `label` for the input, which also names the list. */
export interface ListboxLabelAttributes extends ListboxPartAttributes<'label'> {
  /** A generated id; pass another one to the element, and the list follows it. */
  readonly id: string;
  /** The id of the input, while one is mounted. */
  readonly htmlFor: string | undefined;
  readonly 'data-disabled': Flag;
  /** Tells the listbox the id of the mounted label, which names the list. */
  readonly ref: RefCallback<HTMLLabelElement>;
}

/**
 * Props of the input: a text field with the `combobox` role, whose arrow keys and Enter act on
 * the list it controls.
 */
export interface ListboxInputAttributes extends ListboxPartAttributes<'input'> {
  readonly id: string;
  readonly role: 'combobox';
  readonly disabled: boolean;
  readonly autoComplete: 'off';
  readonly autoCorrect: 'off';
  readonly spellCheck: false;
  /** Always: the list is shown with the input. */
  readonly 'aria-expanded': true;
  readonly 'aria-controls': string;
  readonly 'aria-autocomplete': 'list';
  /** The highlighted item, which the input's keys act on. */
  readonly 'aria-activedescendant': string | undefined;
  readonly 'data-disabled': Flag;
  readonly onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Tells the listbox the id of the mounted input, which the label is for. */
  readonly ref: RefCallback<HTMLInputElement>;
}

/** Props of the content: the element with the `listbox` role, which holds the items. */
export interface ListboxContentAttributes extends ListboxPartAttributes<'content'> {
  readonly id: string;
  readonly role: 'listbox';
  /** In the tab order without an input, focusable by script with one, out of reach when disabled. */
  readonly tabIndex: 0 | -1 | undefined;
  readonly 'aria-labelledby': string | undefined;
  readonly 'aria-multiselectable': true | undefined;
  readonly 'aria-orientation': 'horizontal' | undefined;
  readonly 'aria-disabled': true | undefined;
  readonly 'aria-activedescendant': string | undefined;
  readonly 'data-orientation': 'vertical' | 'horizontal';
  readonly 'data-disabled': Flag;
  /** Present while the collection has no items. */
  readonly 'data-empty': Flag;
  readonly onFocus: (event: FocusEvent<HTMLElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  /** Tells the listbox the element and the id of the list, to scroll it and to point to it. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of a group of items. */
export interface ListboxItemGroupAttributes extends ListboxPartAttributes<'item-group'> {
  readonly role: 'group';
  readonly 'aria-labelledby': string | undefined;
}

/** Props of the label of a group. */
export interface ListboxItemGroupLabelAttributes extends ListboxPartAttributes<'item-group-label'> {
  readonly id: string;
}

/** The state of an item, which its parts carry. */
export interface ListboxItemStateAttributes {
  readonly 'data-selected': Flag;
  readonly 'data-highlighted': Flag;
  readonly 'data-disabled': Flag;
}

/** Props of an item: an `option` of the list. */
export interface ListboxItemAttributes
  extends ListboxPartAttributes<'item'>, ListboxItemStateAttributes {
  readonly id: string;
  readonly role: 'option';
  readonly 'aria-selected': boolean;
  readonly 'aria-disabled': true | undefined;
  readonly 'data-value': string;
  readonly onMouseDown: (event: MouseEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onClick: (event: MouseEvent<HTMLElement>) => void;
}

/** Props of the text of an item. */
export interface ListboxItemTextAttributes
  extends ListboxPartAttributes<'item-text'>, ListboxItemStateAttributes {}

/** Props of the indicator of an item: shown while the item is selected, hidden from assistive technology. */
export interface ListboxItemIndicatorAttributes
  extends ListboxPartAttributes<'item-indicator'>, ListboxItemStateAttributes {
  readonly 'aria-hidden': true;
  readonly hidden: boolean;
}

/** What {@link useListbox} returns: the listbox API and the props of each element. */
export interface UseListboxReturn<T = unknown> extends listbox.Api<T> {
  /** The id of the element of an item. */
  readonly getItemId: (value: string) => string;
  readonly getRootProps: () => ListboxRootAttributes;
  readonly getLabelProps: () => ListboxLabelAttributes;
  readonly getInputProps: () => ListboxInputAttributes;
  readonly getContentProps: () => ListboxContentAttributes;
  /** Props of a group, named by the label with `labelId`. */
  readonly getItemGroupProps: (props: {
    readonly labelId?: string | undefined;
  }) => ListboxItemGroupAttributes;
  readonly getItemGroupLabelProps: (props: {
    readonly id: string;
  }) => ListboxItemGroupLabelAttributes;
  readonly getItemProps: (props: { readonly item: T }) => ListboxItemAttributes;
  readonly getItemTextProps: (props: { readonly item: T }) => ListboxItemTextAttributes;
  readonly getItemIndicatorProps: (props: { readonly item: T }) => ListboxItemIndicatorAttributes;
  readonly getEmptyProps: () => ListboxPartAttributes<'empty'>;
}

/**
 * The DOM platform of the listbox machine: only the `setTimeout` clock, since the machine has no
 * platform actions or effects. A module-level constant, since `useMachine` reads it once.
 */
const platform: Platform<listbox.Schema> = { schedule, actions: {}, effects: {} };

/** The event of each intent of a key in the list. */
const INTENT_EVENTS: Readonly<Record<ListIntent, listbox.Event>> = {
  first: { type: 'HIGHLIGHT.FIRST' },
  last: { type: 'HIGHLIGHT.LAST' },
  next: { type: 'HIGHLIGHT.NEXT' },
  previous: { type: 'HIGHLIGHT.PREVIOUS' },
};

/** The key code browsers give the key presses an input method editor takes. */
const IME_KEY_CODE = 229;

/**
 * Whether an input method editor (for Chinese, Japanese, Korean…) is composing text: its keys,
 * Enter included, belong to it. Safari ends a composition with an Enter that only the key code
 * tells apart.
 */
const isComposing = (event: KeyboardEvent): boolean =>
  // `keyCode` is the only sign of that Enter in Safari.
  // oxlint-disable-next-line typescript/no-deprecated
  event.nativeEvent.isComposing || event.keyCode === IME_KEY_CODE;

const flag = (on: boolean): Flag => (on ? '' : undefined);

/**
 * Where the list is in the tab order: in it on its own; out of it next to an input, which takes
 * the keys (a click or a script can still focus the list); out of reach when disabled.
 */
function contentTabIndex(disabled: boolean, withInput: boolean): 0 | -1 | undefined {
  if (disabled) {
    return undefined;
  }
  return withInput ? -1 : 0;
}

/**
 * A stable ref callback for a part: it keeps the element in `node`, and tells `setId` the id of
 * the element when it is attached, and `undefined` when it is detached.
 */
function usePartRef<E extends HTMLElement>(
  setId: (id: string | undefined) => void,
): readonly [RefCallback<E>, { readonly current: E | null }] {
  const node = useRef<E | null>(null);
  const ref = useCallback<RefCallback<E>>(
    (element) => {
      node.current = element;
      if (element === null) {
        return undefined;
      }
      setId(element.id);
      return () => {
        node.current = null;
        setId(undefined);
      };
    },
    [setId],
  );
  return [ref, node];
}

/**
 * Run the listbox machine of `@contour-ui/core` in a component, on the DOM platform: its API
 * (the selection, the highlight, the state of each item, and functions such as `selectValue`)
 * and the props of each element. The props carry the ARIA roles and attributes, the keyboard
 * (arrow keys, Home, End, typeahead, Enter and Space in the list; ↓, ↑ and Enter in the input),
 * the pointer, and the scroll that keeps the highlighted item in view inside the list.
 * `Listbox.Root` calls it; call it yourself to build the parts from your own elements.
 *
 * @example
 * const collection = useMemo(() => createListCollection({ items: ['Kick', 'Snare'] }), []);
 * const api = useListbox({ collection });
 * <div {...api.getContentProps()}>
 *   {collection.items.map((item) => (
 *     <div key={item} {...api.getItemProps({ item })}>{item}</div>
 *   ))}
 * </div>;
 */
export function useListbox<T>(props: UseListboxProps<T>): UseListboxReturn<T> {
  // The machine takes items of any type: they only go from the collection to the callbacks.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const service = useMachine(listbox.machine, props as listbox.Input, platform);
  // The items of the API are the ones of `props.collection`, whose type is `T`.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const api = listbox.connect(service) as listbox.Api<T>;
  const { collection, disabled, highlightedValue, orientation } = api;
  const { send } = service;

  const baseId = useId();
  const getItemId = (value: string): string => `${baseId}item-${encodeURIComponent(value)}`;
  // The ids of the mounted parts, which may be the generated ones or the owner's.
  const [labelId, setLabelId] = useState<string | undefined>(undefined);
  const [inputId, setInputId] = useState<string | undefined>(undefined);
  const [contentId, setContentId] = useState<string | undefined>(undefined);
  const [labelRef] = usePartRef<HTMLLabelElement>(setLabelId);
  const [inputRef, inputNode] = usePartRef<HTMLInputElement>(setInputId);
  const [contentRef, contentNode] = usePartRef<HTMLElement>(setContentId);
  const typeahead = useRef<TypeaheadState>(initialTypeahead);
  // The item the pointer highlighted last: it is under the pointer, so it needs no scrolling.
  const hovered = useRef<string | null>(null);

  const highlightedId =
    highlightedValue !== null && collection.has(highlightedValue)
      ? getItemId(highlightedValue)
      : undefined;

  // Keep the highlighted item in view inside the list, before the browser paints.
  useLayoutEffect(() => {
    const content = contentNode.current;
    if (highlightedId === undefined || content === null || highlightedValue === hovered.current) {
      return;
    }
    const item = content.querySelector<HTMLElement>(`[id="${CSS.escape(highlightedId)}"]`);
    if (item !== null) {
      scrollIntoContainer(item, { container: content });
    }
  }, [contentNode, highlightedId, highlightedValue]);

  // Focus that came before the machine started (an input with `autoFocus`) was lost: send it now.
  useEffect(() => {
    const element = inputNode.current ?? contentNode.current;
    const active = element?.ownerDocument.activeElement;
    if (active === undefined || active === null) {
      return;
    }
    if (active === inputNode.current) {
      send({ type: 'INPUT.FOCUS' });
    } else if (active === contentNode.current) {
      send({ type: 'CONTENT.FOCUS' });
    }
  }, [contentNode, inputNode, send]);

  /** The keys act on the list: the pointer no longer decides what is in view. */
  const fromKeyboard = (event: listbox.Event): void => {
    hovered.current = null;
    send(event);
  };

  /** Focus left the input or the list: tell the machine, unless it went to the other one. */
  const onBlur = (event: FocusEvent<HTMLElement>): void => {
    const next = event.relatedTarget;
    if (
      (next !== null &&
        (contentNode.current?.contains(next) === true || next === inputNode.current)) ||
      // The window lost focus: the element keeps it, and gets it back with the window.
      event.currentTarget.ownerDocument.activeElement === event.currentTarget
    ) {
      return;
    }
    send({ type: 'BLUR' });
  };

  return {
    ...api,
    getItemId,
    getRootProps: () => ({
      'data-scope': 'listbox',
      'data-part': 'root',
      'data-orientation': orientation,
      'data-disabled': flag(disabled),
    }),
    getLabelProps: () => ({
      'data-scope': 'listbox',
      'data-part': 'label',
      id: `${baseId}label`,
      htmlFor: inputId,
      'data-disabled': flag(disabled),
      ref: labelRef,
    }),
    getInputProps: () => ({
      'data-scope': 'listbox',
      'data-part': 'input',
      id: `${baseId}input`,
      role: 'combobox',
      disabled,
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: false,
      'aria-expanded': true,
      // The generated id until the list is mounted, so the first render points to it too.
      'aria-controls': contentId ?? `${baseId}content`,
      'aria-autocomplete': 'list',
      'aria-activedescendant': highlightedId,
      'data-disabled': flag(disabled),
      onFocus: () => {
        send({ type: 'INPUT.FOCUS' });
      },
      onBlur,
      onKeyDown: (event) => {
        if (event.defaultPrevented || isComposing(event)) {
          return;
        }
        // Only the vertical arrows: Home, End, ← and → move the caret in the text.
        const intent = getListIntent(event);
        if (intent === 'next' || intent === 'previous') {
          event.preventDefault();
          fromKeyboard(INTENT_EVENTS[intent]);
          return;
        }
        // Enter without a highlighted item is left to the field, such as submitting its form.
        const highlighted = service.context.get('highlightedValue');
        if (event.key === 'Enter' && collection.has(highlighted)) {
          event.preventDefault();
          send({ type: 'HIGHLIGHTED.SELECT' });
        }
      },
      ref: inputRef,
    }),
    getContentProps: () => ({
      'data-scope': 'listbox',
      'data-part': 'content',
      id: `${baseId}content`,
      role: 'listbox',
      tabIndex: contentTabIndex(disabled, inputId !== undefined),
      'aria-labelledby': labelId,
      'aria-multiselectable': api.multiple ? true : undefined,
      'aria-orientation': orientation === 'horizontal' ? 'horizontal' : undefined,
      'aria-disabled': disabled ? true : undefined,
      'aria-activedescendant': highlightedId,
      'data-orientation': orientation,
      'data-disabled': flag(disabled),
      'data-empty': flag(collection.size === 0),
      onFocus: (event) => {
        // Not for focus that bubbled up from inside, such as from a button in an item.
        if (event.target === event.currentTarget) {
          send({ type: 'CONTENT.FOCUS' });
        }
      },
      onBlur,
      onKeyDown: (event) => {
        if (event.defaultPrevented || isComposing(event)) {
          return;
        }
        const dir =
          orientation === 'horizontal' && getComputedStyle(event.currentTarget).direction === 'rtl'
            ? 'rtl'
            : 'ltr';
        const intent = getListIntent(event, { orientation, dir });
        if (intent !== null) {
          event.preventDefault();
          fromKeyboard(INTENT_EVENTS[intent]);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          send({ type: 'HIGHLIGHTED.SELECT' });
          return;
        }
        const typed = service.prop('typeahead')
          ? nextTypeahead(typeahead.current, event, event.timeStamp)
          : null;
        if (typed !== null) {
          event.preventDefault();
          typeahead.current = typed;
          fromKeyboard({ type: 'TYPEAHEAD', query: typed.query });
          return;
        }
        // Space selects, unless typeahead took it as a space between words.
        if (event.key === ' ') {
          event.preventDefault();
          send({ type: 'HIGHLIGHTED.SELECT' });
        }
      },
      onPointerLeave: (event) => {
        if (event.pointerType === 'mouse') {
          send({ type: 'POINTER.LEAVE' });
        }
      },
      ref: contentRef,
    }),
    getItemGroupProps: ({ labelId: groupLabelId }) => ({
      'data-scope': 'listbox',
      'data-part': 'item-group',
      role: 'group',
      'aria-labelledby': groupLabelId,
    }),
    getItemGroupLabelProps: ({ id }) => ({
      'data-scope': 'listbox',
      'data-part': 'item-group-label',
      id,
    }),
    getItemProps: ({ item }) => {
      const state = api.getItemState(item);
      return {
        'data-scope': 'listbox',
        'data-part': 'item',
        id: getItemId(state.value),
        role: 'option',
        'aria-selected': state.selected,
        'aria-disabled': state.disabled ? true : undefined,
        'data-value': state.value,
        'data-selected': flag(state.selected),
        'data-highlighted': flag(state.highlighted),
        'data-disabled': flag(state.disabled),
        onMouseDown: (event) => {
          if (event.button !== 0) {
            return;
          }
          // Focus stays where it is, in the input or the list, and no text gets selected.
          event.preventDefault();
          const target = inputNode.current ?? contentNode.current;
          if (state.disabled || target === null || target.ownerDocument.activeElement === target) {
            return;
          }
          // Highlighted first, so that the focus does not highlight another item on its way.
          hovered.current = state.value;
          send({ type: 'HIGHLIGHT.SET', value: state.value });
          target.focus({ preventScroll: true });
        },
        onPointerMove: (event) => {
          if (
            event.pointerType !== 'mouse' ||
            state.highlighted ||
            state.disabled ||
            !service.prop('highlightOnHover')
          ) {
            return;
          }
          hovered.current = state.value;
          send({ type: 'ITEM.HOVER', value: state.value });
        },
        onClick: (event) => {
          if (!event.defaultPrevented) {
            send({ type: 'ITEM.CLICK', value: state.value });
          }
        },
      };
    },
    getItemTextProps: ({ item }) => {
      const state = api.getItemState(item);
      return {
        'data-scope': 'listbox',
        'data-part': 'item-text',
        'data-selected': flag(state.selected),
        'data-highlighted': flag(state.highlighted),
        'data-disabled': flag(state.disabled),
      };
    },
    getItemIndicatorProps: ({ item }) => {
      const state = api.getItemState(item);
      return {
        'data-scope': 'listbox',
        'data-part': 'item-indicator',
        'aria-hidden': true,
        hidden: !state.selected,
        'data-selected': flag(state.selected),
        'data-highlighted': flag(state.highlighted),
        'data-disabled': flag(state.disabled),
      };
    },
    getEmptyProps: () => ({ 'data-scope': 'listbox', 'data-part': 'empty' }),
  };
}
