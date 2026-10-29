'use client';

import { segmentGroup } from '@contour-ui/core';
import type { Platform } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useId, useLayoutEffect, useState } from 'react';
import type { ChangeEvent, CSSProperties, FocusEvent, RefCallback } from 'react';

import { schedule } from '../platform/clock.ts';
import { trackIndicator } from '../platform/indicator.ts';
import { visuallyHidden } from '../utils/visually-hidden.ts';

/**
 * Props of {@link useSegmentGroup}: the input of the segment group machine of
 * `@contour-ui/core`, and the attributes of the native radio buttons.
 */
export interface UseSegmentGroupProps extends segmentGroup.Input {
  /**
   * The name of the radio buttons, under which a form submits the value. Without it, the group
   * uses a generated one: the browser needs a shared name to move between them with the arrow keys.
   */
  readonly name?: string | undefined;
  /** The id of the form the radio buttons belong to, when they are outside of it. */
  readonly form?: string | undefined;
}

/** The orientation and the state of the group, as every part carries them. */
export interface SegmentGroupPartAttributes<Part extends string> {
  readonly 'data-scope': 'segment-group';
  readonly 'data-part': Part;
  readonly 'data-orientation': segmentGroup.Orientation;
  /** Present, empty, while the group is disabled (on the root and the label), or the item is. */
  readonly 'data-disabled': '' | undefined;
}

/** Props of the root: the element with the `radiogroup` role. */
export interface SegmentGroupRootAttributes extends SegmentGroupPartAttributes<'root'> {
  readonly role: 'radiogroup';
  /** The id of the label, while one is mounted. */
  readonly 'aria-labelledby': string | undefined;
  readonly 'aria-orientation': segmentGroup.Orientation;
  readonly 'aria-disabled': true | undefined;
  readonly 'aria-readonly': true | undefined;
  /** Present, empty, while the group is read-only. */
  readonly 'data-readonly': '' | undefined;
}

/** Props of the label: an id the root points to while it is mounted. */
export interface SegmentGroupLabelAttributes extends SegmentGroupPartAttributes<'label'> {
  /** A generated id; pass another one to the element, and the root follows it. */
  readonly id: string;
  readonly ref: RefCallback<HTMLElement>;
}

/** The state of an item, as `data-state` carries it. */
export type SegmentGroupItemDataState = 'checked' | 'unchecked';

/** What the parts of an item carry: its value and state. */
export interface SegmentGroupItemStateAttributes<
  Part extends string,
> extends SegmentGroupPartAttributes<Part> {
  readonly 'data-value': string;
  readonly 'data-state': SegmentGroupItemDataState;
  /** Present, empty, while the item has focus. */
  readonly 'data-focus': '' | undefined;
  /** Present, empty, while the item has focus and shows a focus ring (a keyboard focus). */
  readonly 'data-focus-visible': '' | undefined;
}

/** Props of an item: a `label` around its hidden radio button. */
export interface SegmentGroupItemAttributes extends SegmentGroupItemStateAttributes<'item'> {
  /** Tells the group the element of the item: the indicator follows the checked one. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the control of an item: decoration, hidden from assistive technology. */
export interface SegmentGroupItemControlAttributes extends SegmentGroupItemStateAttributes<'item-control'> {
  readonly 'aria-hidden': true;
}

/** Props of the native radio button of an item: out of sight, in the accessibility tree. */
export interface SegmentGroupItemHiddenInputAttributes {
  readonly 'data-scope': 'segment-group';
  readonly 'data-part': 'item-hidden-input';
  readonly type: 'radio';
  readonly name: string;
  readonly form: string | undefined;
  readonly value: string;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly style: Readonly<CSSProperties>;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLInputElement>) => void;
}

/**
 * Props of the indicator: a mark that follows the checked item, hidden from assistive
 * technology. `hidden` starts on: the indicator shows once an item is checked and laid out. It
 * gets `--left`, `--top`, `--width` and `--height` (in `px`): the box of the checked item,
 * relative to the padding box of the indicator's parent (the root).
 */
export interface SegmentGroupIndicatorAttributes extends SegmentGroupPartAttributes<'indicator'> {
  readonly 'aria-hidden': true;
  readonly hidden: true;
  /** Starts tracking the checked item. */
  readonly ref: RefCallback<HTMLElement>;
}

/** What {@link useSegmentGroup} returns: the API and the props of each element. */
export interface UseSegmentGroupReturn extends segmentGroup.Api {
  /** The name of the radio buttons: the `name` prop, or a generated one. */
  readonly name: string;
  readonly getRootProps: () => SegmentGroupRootAttributes;
  readonly getLabelProps: () => SegmentGroupLabelAttributes;
  readonly getItemProps: (item: segmentGroup.ItemProps) => SegmentGroupItemAttributes;
  readonly getItemTextProps: (
    item: segmentGroup.ItemProps,
  ) => SegmentGroupItemStateAttributes<'item-text'>;
  readonly getItemControlProps: (item: segmentGroup.ItemProps) => SegmentGroupItemControlAttributes;
  readonly getItemHiddenInputProps: (
    item: segmentGroup.ItemProps,
  ) => SegmentGroupItemHiddenInputAttributes;
  readonly getIndicatorProps: () => SegmentGroupIndicatorAttributes;
}

/**
 * The DOM platform of the segment group machine: the `setTimeout` clock and nothing else, since
 * native radio buttons handle the keyboard. A module-level constant, since `useMachine` reads it once.
 */
const platform: Platform<segmentGroup.Schema> = { schedule, actions: {}, effects: {} };

const present = (flag: boolean): '' | undefined => (flag ? '' : undefined);

/** Whether the element shows a focus ring: `:focus-visible`, where the browser knows it. */
function showsFocusRing(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/** The refs that tell the group its items and its indicator. */
interface IndicatorTracking {
  /** A stable ref callback for the item of each value. */
  readonly itemRef: (value: string) => RefCallback<HTMLElement>;
  readonly indicatorRef: RefCallback<HTMLElement>;
}

/**
 * Keep the indicator on the element of the checked item (`trackIndicator`): the items register
 * their elements by value through their refs, and the tracking reads the checked one on every
 * measure, so an item rendered later is followed.
 */
function useIndicatorTracking(value: string | null): IndicatorTracking {
  const [indicator, setIndicator] = useState<HTMLElement | null>(null);
  const [items] = useState(() => new Map<string, HTMLElement>());
  const [itemRefs] = useState(() => new Map<string, RefCallback<HTMLElement>>());

  const itemRef = useCallback(
    (itemValue: string): RefCallback<HTMLElement> => {
      let ref = itemRefs.get(itemValue);
      if (ref === undefined) {
        ref = (element) => {
          if (element === null) {
            return undefined;
          }
          items.set(itemValue, element);
          return () => {
            if (items.get(itemValue) === element) {
              items.delete(itemValue);
            }
          };
        };
        itemRefs.set(itemValue, ref);
      }
      return ref;
    },
    [items, itemRefs],
  );

  useLayoutEffect(() => {
    if (indicator === null) {
      return undefined;
    }
    return trackIndicator(indicator, () => (value === null ? null : items.get(value)));
  }, [indicator, items, value]);

  return { itemRef, indicatorRef: setIndicator };
}

/**
 * Run the segment group machine of `@contour-ui/core` in a component, on the DOM: its API
 * (`value`, `setValue()`, `getItemState()`…) and the props of the root, the label, the items,
 * their text, control and native radio button, and the indicator. The radio buttons give the
 * keyboard (Tab to the checked item, arrow keys to move the check) and form submission.
 * `SegmentGroup.Root` calls it; call it yourself to build the parts from your own elements.
 *
 * @example
 * const api = useSegmentGroup({ defaultValue: 'day' });
 * <div {...api.getRootProps()}>
 *   {['day', 'week'].map((value) => (
 *     <label key={value} {...api.getItemProps({ value })}>
 *       <span {...api.getItemTextProps({ value })}>{value}</span>
 *       <input {...api.getItemHiddenInputProps({ value })} />
 *     </label>
 *   ))}
 * </div>;
 */
export function useSegmentGroup(props: UseSegmentGroupProps = {}): UseSegmentGroupReturn {
  const { name: nameProp, form, ...input } = props;
  const service = useMachine(segmentGroup.machine, input, platform);
  const api = segmentGroup.connect(service);

  const baseId = useId();
  const name = nameProp ?? `${baseId}radio`;
  const [labelId, setLabelId] = useState<string | undefined>(undefined);
  const labelRef = useCallback<RefCallback<HTMLElement>>((element) => {
    if (element === null) {
      return undefined;
    }
    setLabelId(element.id);
    return () => {
      setLabelId(undefined);
    };
  }, []);

  const indicator = useIndicatorTracking(api.value);

  const orientation = api.orientation;
  const part = <Part extends string>(
    partName: Part,
    disabled: boolean,
  ): SegmentGroupPartAttributes<Part> => ({
    'data-scope': 'segment-group',
    'data-part': partName,
    'data-orientation': orientation,
    'data-disabled': present(disabled),
  });
  const itemPart = <Part extends string>(
    partName: Part,
    item: segmentGroup.ItemProps,
  ): SegmentGroupItemStateAttributes<Part> => {
    const state = api.getItemState(item);
    return {
      ...part(partName, state.disabled),
      'data-value': item.value,
      'data-state': state.checked ? 'checked' : 'unchecked',
      'data-focus': present(state.focused),
      'data-focus-visible': present(state.focusVisible),
    };
  };

  return {
    ...api,
    name,
    getRootProps: () => ({
      ...part('root', api.disabled),
      role: 'radiogroup',
      'aria-labelledby': labelId,
      'aria-orientation': orientation,
      'aria-disabled': api.disabled ? true : undefined,
      'aria-readonly': api.readOnly ? true : undefined,
      'data-readonly': present(api.readOnly),
    }),
    getLabelProps: () => ({
      ...part('label', api.disabled),
      id: `${baseId}label`,
      ref: labelRef,
    }),
    getItemProps: (item) => ({
      ...itemPart('item', item),
      ref: indicator.itemRef(item.value),
    }),
    getItemTextProps: (item) => itemPart('item-text', item),
    getItemControlProps: (item) => ({ ...itemPart('item-control', item), 'aria-hidden': true }),
    getItemHiddenInputProps: (item) => {
      const state = api.getItemState(item);
      return {
        'data-scope': 'segment-group',
        'data-part': 'item-hidden-input',
        type: 'radio',
        name,
        form,
        value: item.value,
        checked: state.checked,
        disabled: state.disabled,
        style: visuallyHidden,
        onChange: (event) => {
          // A read-only group ignores the check: React puts the controlled `checked` back.
          if (event.target.checked) {
            api.checkItem(item);
          }
        },
        onFocus: (event) => {
          api.focusItem(item.value, showsFocusRing(event.currentTarget));
        },
        onBlur: () => {
          api.blurItem();
        },
      };
    },
    getIndicatorProps: () => ({
      ...part('indicator', api.disabled),
      'aria-hidden': true,
      hidden: true,
      ref: indicator.indicatorRef,
    }),
  };
}
