'use client';

import { getListIntent, tabs } from '@contour-ui/core';
import type { ListIntent, Platform } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useId, useLayoutEffect, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent, RefCallback } from 'react';

import { schedule } from '../platform/clock.ts';
import { trackIndicator } from '../platform/indicator.ts';

/**
 * Props of {@link useTabs}: the input of the tabs machine of `@contour-ui/core` but `triggers`,
 * which the triggers report as they mount, and how contents mount.
 */
export interface UseTabsProps extends Omit<tabs.Input, 'triggers'> {
  /**
   * Mount the children of a content only once its tab is first selected. Its element is always
   * there, hidden, so the trigger can point to it.
   *
   * @defaultValue false
   */
  readonly lazyMount?: boolean | undefined;
  /**
   * Unmount the children of a content when its tab is no longer selected, so they start over
   * the next time.
   *
   * @defaultValue false
   */
  readonly unmountOnExit?: boolean | undefined;
}

/** What every part of the tabs carries. */
export interface TabsPartAttributes<Part extends string> {
  readonly 'data-scope': 'tabs';
  readonly 'data-part': Part;
  readonly 'data-orientation': tabs.Orientation;
}

/** Present, empty, while a state holds; absent otherwise. */
type Flag = '' | undefined;

/** Props of the list: the `tablist` that holds the triggers and the indicator. */
export interface TabsListAttributes extends TabsPartAttributes<'list'> {
  readonly role: 'tablist';
  readonly 'aria-orientation': tabs.Orientation;
}

/** Props of a trigger: a `button` with the `tab` role, in the tab order while it is the tab stop. */
export interface TabsTriggerAttributes extends TabsPartAttributes<'trigger'> {
  readonly type: 'button';
  readonly role: 'tab';
  /** A generated id; pass another one to the element, and the content follows it. */
  readonly id: string;
  readonly disabled: boolean;
  readonly tabIndex: 0 | -1;
  readonly 'aria-selected': boolean;
  /** The id of the content of its value, while one is mounted. */
  readonly 'aria-controls': string | undefined;
  readonly 'data-value': string;
  readonly 'data-selected': Flag;
  readonly 'data-focus': Flag;
  readonly 'data-disabled': Flag;
  readonly onClick: (event: MouseEvent<HTMLElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** Tells the tabs the element, its order among the triggers, and its id. Stable per value. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of a content: the `tabpanel` of one value, `hidden` while its tab is not selected. */
export interface TabsContentAttributes extends TabsPartAttributes<'content'> {
  readonly role: 'tabpanel';
  /** A generated id; pass another one to the element, and the trigger follows it. */
  readonly id: string;
  /** In the tab order, so the panel is reached after its tab even without focusable children. */
  readonly tabIndex: 0;
  readonly hidden: boolean;
  /** The id of the trigger of its value, while one is mounted. */
  readonly 'aria-labelledby': string | undefined;
  readonly 'data-value': string;
  readonly 'data-selected': Flag;
  /** Tells the tabs the id of the content. Stable per value. */
  readonly ref: RefCallback<HTMLElement>;
}

/**
 * Props of the indicator: a mark that follows the trigger of the selected tab, hidden from
 * assistive technology. `hidden` starts on: the indicator shows once it has a trigger to point
 * at. It gets `--left`, `--top`, `--width` and `--height` (in `px`): the box of the selected
 * trigger, relative to the padding box of the indicator's parent (the list).
 */
export interface TabsIndicatorAttributes extends TabsPartAttributes<'indicator'> {
  readonly 'aria-hidden': true;
  readonly hidden: true;
  /** Starts tracking the selected trigger. */
  readonly ref: RefCallback<HTMLElement>;
}

/** What {@link useTabs} returns: the tabs API and the props of each element. */
export interface UseTabsReturn extends tabs.Api {
  /** Whether contents mount their children only once first selected. */
  readonly lazyMount: boolean;
  /** Whether contents unmount their children once deselected. */
  readonly unmountOnExit: boolean;
  readonly getRootProps: () => TabsPartAttributes<'root'>;
  readonly getListProps: () => TabsListAttributes;
  readonly getTriggerProps: (props: tabs.Trigger) => TabsTriggerAttributes;
  readonly getContentProps: (props: { readonly value: string }) => TabsContentAttributes;
  readonly getIndicatorProps: () => TabsIndicatorAttributes;
}

/** A mounted trigger, as its ref callback reports it. */
interface TriggerEntry {
  readonly value: string;
  readonly disabled: boolean;
}

/** The mounted parts of one tabs, kept outside React state: read by the platform and handlers. */
interface Registry {
  readonly triggers: Map<HTMLElement, TriggerEntry>;
  /** Ref callbacks of the triggers and contents, one per value (and `disabled`), stable. */
  readonly refs: Map<string, RefCallback<HTMLElement>>;
  /** Watches the parents of the triggers for children that move. */
  moves: MutationObserver | null;
}

/** The trigger element of a value: the first in the document, as the machine counts it. */
function triggerElement(registry: Registry, value: string | null): HTMLElement | null {
  let found: HTMLElement | null = null;
  for (const [element, entry] of registry.triggers) {
    if (
      entry.value === value &&
      (found === null ||
        (found.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) !== 0)
    ) {
      found = element;
    }
  }
  return found;
}

/** The mounted triggers, in document order. */
function orderedTriggers(registry: Registry): tabs.Trigger[] {
  return [...registry.triggers]
    .toSorted(([a], [b]) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) === 0 ? 1 : -1,
    )
    .map(([, entry]) => entry);
}

const sameTriggers = (a: readonly tabs.Trigger[], b: readonly tabs.Trigger[]): boolean =>
  a.length === b.length &&
  a.every((trigger, index) => {
    const other = b[index];
    return other?.value === trigger.value && other.disabled === trigger.disabled;
  });

const sameIds = (a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): boolean =>
  a.size === b.size && [...a].every(([value, id]) => b.get(value) === id);

/** A copy of `map` with `id` for `value`, or without `value` for `undefined`. */
function withId(
  map: ReadonlyMap<string, string>,
  value: string,
  id: string | undefined,
): ReadonlyMap<string, string> {
  const next = new Map(map);
  if (id === undefined || id === '') {
    next.delete(value);
  } else {
    next.set(value, id);
  }
  return sameIds(map, next) ? map : next;
}

/**
 * The DOM platform of the tabs machine: it focuses the trigger of the focused value, found in
 * the registry of the instance. One per instance, created once.
 */
function createDomPlatform(registry: Registry): Platform<tabs.Schema> {
  return {
    schedule,
    actions: {
      focusTrigger: ({ context }) => {
        const element = triggerElement(registry, context.get('focusedValue'));
        if (element !== null && element.ownerDocument.activeElement !== element) {
          element.focus();
        }
      },
    },
    effects: {},
  };
}

/** The event of each intent of a key on a trigger. */
const INTENT_EVENTS: Readonly<Record<ListIntent, tabs.Event>> = {
  first: { type: 'FOCUS.FIRST' },
  last: { type: 'FOCUS.LAST' },
  next: { type: 'FOCUS.NEXT' },
  previous: { type: 'FOCUS.PREVIOUS' },
};

const flag = (on: boolean): Flag => (on ? '' : undefined);

/**
 * Run the tabs machine of `@contour-ui/core` in a component, on the DOM platform: its API (the
 * selected tab, the focused trigger, `setValue`, `focus`…) and the props of each element. The
 * props carry the ARIA roles and links, the roving tab stop, the keyboard (arrow keys by
 * orientation, Home and End; Enter and Space click the focused trigger), and the indicator.
 * `Tabs.Root` calls it; call it yourself to build the parts from your own elements.
 *
 * The triggers report themselves through their `ref`, in document order. Until they have (the
 * first render, and on a server), the trigger of the selected tab is the tab stop, and the
 * triggers and contents point to no ids (`aria-controls`, `aria-labelledby`).
 *
 * @example
 * const api = useTabs({ defaultValue: 'mix' });
 * <div {...api.getRootProps()}>
 *   <div {...api.getListProps()}>
 *     <button {...api.getTriggerProps({ value: 'mix' })}>Mix</button>
 *   </div>
 *   <div {...api.getContentProps({ value: 'mix' })}>Faders</div>
 * </div>;
 */
export function useTabs(props: UseTabsProps): UseTabsReturn {
  const { lazyMount = false, unmountOnExit = false, ...input } = props;
  const [registry] = useState<Registry>(() => ({
    triggers: new Map(),
    refs: new Map(),
    moves: null,
  }));
  const [platform] = useState(() => createDomPlatform(registry));
  const [triggers, setTriggers] = useState<readonly tabs.Trigger[]>([]);
  const [triggerIds, setTriggerIds] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [contentIds, setContentIds] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [indicator, setIndicator] = useState<HTMLElement | null>(null);

  const service = useMachine(tabs.machine, { ...input, triggers }, platform);
  const api = tabs.connect(service);
  const { send } = service;
  const { orientation, value } = api;
  const baseId = useId();

  const syncTriggers = useCallback(() => {
    const next = orderedTriggers(registry);
    setTriggers((current) => (sameTriggers(current, next) ? current : next));
  }, [registry]);

  useLayoutEffect(() => {
    if (indicator === null) {
      return undefined;
    }
    return trackIndicator(indicator, () => triggerElement(registry, value));
  }, [indicator, registry, value]);

  /** The ref callback of a trigger: one per value and `disabled`, stable across renders. */
  const triggerRef = (trigger: tabs.Trigger): RefCallback<HTMLElement> => {
    const disabled = trigger.disabled === true;
    const key = `trigger:${String(disabled)}:${trigger.value}`;
    let ref = registry.refs.get(key);
    if (ref === undefined) {
      ref = (element) => {
        if (element === null) {
          return undefined;
        }
        registry.triggers.set(element, { value: trigger.value, disabled });
        // Triggers that move without remounting, as keyed children do, change their order here.
        if (element.parentElement !== null) {
          registry.moves ??= new MutationObserver(syncTriggers);
          registry.moves.observe(element.parentElement, { childList: true });
        }
        setTriggerIds((ids) => withId(ids, trigger.value, element.id));
        syncTriggers();
        return () => {
          registry.triggers.delete(element);
          setTriggerIds((ids) =>
            ids.get(trigger.value) === element.id ? withId(ids, trigger.value, undefined) : ids,
          );
          syncTriggers();
        };
      };
      registry.refs.set(key, ref);
    }
    return ref;
  };

  /** The ref callback of a content: one per value, stable across renders. */
  const contentRef = (contentValue: string): RefCallback<HTMLElement> => {
    const key = `content:${contentValue}`;
    let ref = registry.refs.get(key);
    if (ref === undefined) {
      ref = (element) => {
        if (element === null) {
          return undefined;
        }
        setContentIds((ids) => withId(ids, contentValue, element.id));
        return () => {
          setContentIds((ids) =>
            ids.get(contentValue) === element.id ? withId(ids, contentValue, undefined) : ids,
          );
        };
      };
      registry.refs.set(key, ref);
    }
    return ref;
  };

  const part = <Part extends string>(name: Part): TabsPartAttributes<Part> => ({
    'data-scope': 'tabs',
    'data-part': name,
    'data-orientation': orientation,
  });

  return {
    ...api,
    lazyMount,
    unmountOnExit,
    getRootProps: () => part('root'),
    getListProps: () => ({
      ...part('list'),
      role: 'tablist',
      'aria-orientation': orientation,
    }),
    getTriggerProps: (trigger) => {
      const state = api.getTriggerState(trigger);
      return {
        ...part('trigger'),
        type: 'button',
        role: 'tab',
        id: `${baseId}trigger-${encodeURIComponent(trigger.value)}`,
        disabled: state.disabled,
        tabIndex: state.tabStop ? 0 : -1,
        'aria-selected': state.selected,
        'aria-controls': contentIds.get(trigger.value),
        'data-value': trigger.value,
        'data-selected': flag(state.selected),
        'data-focus': flag(state.focused),
        'data-disabled': flag(state.disabled),
        onClick: (event) => {
          if (!event.defaultPrevented) {
            send({ type: 'TRIGGER.CLICK', value: trigger.value });
          }
        },
        onFocus: () => {
          send({ type: 'TRIGGER.FOCUS', value: trigger.value });
        },
        onBlur: (event) => {
          const next = event.relatedTarget;
          if (
            (next instanceof HTMLElement && registry.triggers.has(next)) ||
            // The window lost focus: the trigger keeps it, and gets it back with the window.
            event.currentTarget.ownerDocument.activeElement === event.currentTarget
          ) {
            return;
          }
          send({ type: 'BLUR' });
        },
        onKeyDown: (event) => {
          if (event.defaultPrevented) {
            return;
          }
          const dir =
            orientation === 'horizontal' &&
            getComputedStyle(event.currentTarget).direction === 'rtl'
              ? 'rtl'
              : 'ltr';
          const intent = getListIntent(event, { orientation, dir });
          if (intent !== null) {
            event.preventDefault();
            send(INTENT_EVENTS[intent]);
          }
        },
        ref: triggerRef(trigger),
      };
    },
    getContentProps: ({ value: contentValue }) => {
      const state = api.getContentState({ value: contentValue });
      return {
        ...part('content'),
        role: 'tabpanel',
        id: `${baseId}content-${encodeURIComponent(contentValue)}`,
        tabIndex: 0,
        hidden: !state.selected,
        'aria-labelledby': triggerIds.get(contentValue),
        'data-value': contentValue,
        'data-selected': flag(state.selected),
        ref: contentRef(contentValue),
      };
    },
    getIndicatorProps: () => ({
      ...part('indicator'),
      'aria-hidden': true,
      hidden: true,
      ref: setIndicator,
    }),
  };
}
