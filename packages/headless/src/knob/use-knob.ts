'use client';

import { getRangeIntent, getRangeWheelDelta, knob } from '@contour-ui/core';
import type { Platform } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import {
  composeRefs,
  customProperties,
  mergeProps,
  useDrag,
  useInteraction,
  useInteractionField,
  useRangeActions,
  useWheel,
} from '@contour-ui/primitive';
import type {
  CustomPropertiesProps,
  InteractionStore,
  PrimitiveKeyboardEvent,
  PrimitiveNode,
  ServiceProps,
} from '@contour-ui/primitive';
import { useCallback, useId, useMemo, useState } from 'react';
import type { CSSProperties, Ref, RefCallback } from 'react';

/**
 * Props of {@link useKnob}: the input of the knob machine of `@contour-ui/core`, the pointer lock
 * of a drag, and the attributes of the hidden input that takes the value into a form on the web.
 */
export interface UseKnobProps extends knob.Input {
  /**
   * Lock the pointer to the control while it drags the knob (`requestPointerLock()`): the
   * pointer hides, and the drag has no edge of the screen to stop at. It is released with the
   * press, or when the user leaves it (Escape on the web), which ends the drag.
   *
   * @defaultValue false
   */
  readonly pointerLock?: boolean | undefined;
  /** The name under which a form submits the value (`Knob.HiddenInput`, on the web). */
  readonly name?: string | undefined;
  /** The id of the form the hidden input belongs to, when it is outside of it. */
  readonly form?: string | undefined;
}

/**
 * The state of the knob, as every part carries it: attributes of the web, for its styles, which
 * native platforms leave out.
 */
export interface KnobPartAttributes<Part extends string> {
  readonly 'data-scope': 'knob';
  readonly 'data-part': Part;
  /** Present, empty, while the knob is disabled. */
  readonly 'data-disabled': '' | undefined;
  /** Present, empty, while the knob is read-only. */
  readonly 'data-readonly': '' | undefined;
  /** Present, empty, while the user drags the knob. */
  readonly 'data-dragging': '' | undefined;
}

/** The custom properties of the root on the web, for a dial of one's own. */
export interface KnobRootStyle extends CSSProperties {
  /** The position of the value on the travel, from `0` at `min` to `1` at `max`, by the scale. */
  readonly '--knob-position': string;
  /** The angle of the value, clockwise from the top: `-135deg` at `min`, `135deg` at `max`. */
  readonly '--knob-angle': string;
}

/**
 * Props of the root: the state, and on the web the position and angle of the value as custom
 * properties in its `style` (native platforms have no CSS: read `position` and `angle`).
 */
export type KnobRootAttributes = KnobPartAttributes<'root'> &
  CustomPropertiesProps<KnobRootStyle> & {
    /**
     * While the knob is disabled: the label and the readout belong to an inactive control, whose
     * text WCAG exempts from contrast, and checkers such as axe read that from here.
     */
    readonly 'aria-disabled': true | undefined;
  };

/** Props of the label: an id the control points to while the label is mounted. */
export interface KnobLabelAttributes extends KnobPartAttributes<'label'> {
  /** A generated id. `Knob.Label` follows an id you give it; see `registerLabel`. */
  readonly id: string;
  /** Tells the control that the label is mounted, so it is named by the label's text. */
  readonly ref: RefCallback<PrimitiveNode<'text'>>;
}

/**
 * Props of the control: the `svg` of the dial, with the `slider` role, which takes focus and the
 * input (a vertical drag, the wheel, the keys, a double press, the actions of assistive
 * technology), with the props of the input services of the platform.
 */
export type KnobControlAttributes = ServiceProps &
  KnobPartAttributes<'control'> & {
    readonly role: 'slider';
    /** `0`, or none while the knob is disabled: a disabled knob takes no focus. */
    readonly tabIndex: 0 | undefined;
    /** The view box of the geometry, `0 0 100 100`. */
    readonly viewBox: string;
    readonly 'aria-valuemin': number;
    readonly 'aria-valuemax': number;
    readonly 'aria-valuenow': number;
    /** The text of the value: `formatValue(value)`, or the number. */
    readonly 'aria-valuetext': string;
    /** The id of the label, while one is mounted. */
    readonly 'aria-labelledby': string | undefined;
    /** Vertical: a drag up raises the value, and so do ↑ and →. */
    readonly 'aria-orientation': 'vertical';
    readonly 'aria-disabled': true | undefined;
    readonly 'aria-readonly': true | undefined;
    /** Present, empty, while the control has focus and shows a focus ring (a keyboard focus). */
    readonly 'data-focus-visible': '' | undefined;
    /** The node, for the services that need it (the wheel listener, the pointer lock). */
    readonly ref: Ref<PrimitiveNode<'svg'>>;
    readonly onKeyDown: (event: PrimitiveKeyboardEvent) => void;
  };

/** What the shapes of the dial draw with: a stroke in `currentColor`, round caps, no fill. */
export interface KnobShapeAttributes {
  readonly strokeWidth: number;
  readonly stroke: 'currentColor';
  readonly strokeLinecap: 'round';
  readonly fill: 'none';
}

/** Props of the track (the whole travel) and the range (from the origin to the value): paths. */
export interface KnobArcAttributes<Part extends 'track' | 'range'>
  extends KnobPartAttributes<Part>, KnobShapeAttributes {
  /** The path data, in the view box of the control; empty for a range at its origin. */
  readonly d: string;
}

/** Props of the thumb: a line that points at the value. */
export interface KnobThumbAttributes extends KnobPartAttributes<'thumb'>, KnobShapeAttributes {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/**
 * Props of the value text: the control carries the value and its text (`aria-valuetext`), so
 * assistive technology does not read the readout again on its own.
 */
export interface KnobValueTextAttributes extends KnobPartAttributes<'value-text'> {
  readonly 'aria-hidden': true;
}

/** Props of the hidden input: the value of the knob, for its form on the web. */
export interface KnobHiddenInputAttributes extends KnobPartAttributes<'hidden-input'> {
  readonly type: 'hidden';
  readonly name: string | undefined;
  readonly form: string | undefined;
  /** The value, as a string. */
  readonly value: string;
  /** While the knob is disabled: a form leaves its value out, as it does a disabled input's. */
  readonly disabled: boolean;
}

/** What {@link useKnob} returns: the API and the props of each element. */
export interface UseKnobReturn extends knob.Api {
  /**
   * A mouse or a pen is over the control, and the knob can turn: never while disabled or
   * read-only, which keep their look under the pointer. The same on every platform.
   */
  readonly hovered: boolean;
  /**
   * The interaction state of the control (hover, press, focus), to follow one field of it with
   * `useInteractionField` of `@contour-ui/primitive`: only who reads the field renders again.
   */
  readonly interaction: InteractionStore;
  /**
   * Name the control by the label of this id while it is mounted, as `Knob.Label` does with the
   * id it renders; returns what forgets it. For a label of your own with an id of yours.
   */
  readonly registerLabel: (id: string) => () => void;
  readonly getRootProps: () => KnobRootAttributes;
  readonly getLabelProps: () => KnobLabelAttributes;
  readonly getControlProps: () => KnobControlAttributes;
  readonly getTrackProps: () => KnobArcAttributes<'track'>;
  readonly getRangeProps: () => KnobArcAttributes<'range'>;
  readonly getThumbProps: () => KnobThumbAttributes;
  readonly getValueTextProps: () => KnobValueTextAttributes;
  readonly getHiddenInputProps: () => KnobHiddenInputAttributes;
}

/**
 * The platform of the knob machine: the `setTimeout` clock of the runtime, for the end of a run of
 * wheel events, and nothing else, since the parts read the input through the services. A
 * module-level constant, since `useMachine` reads it once.
 */
const platform: Platform<knob.Schema> = {
  schedule: (ms, fire) => {
    const id = setTimeout(fire, ms);
    return () => {
      clearTimeout(id);
    };
  },
  actions: {},
  effects: {},
};

const present = (flag: boolean): '' | undefined => (flag ? '' : undefined);

/** The look of the shapes of the dial, the same for the three of them. */
const shape = (strokeWidth: number): KnobShapeAttributes => ({
  strokeWidth,
  stroke: 'currentColor',
  strokeLinecap: 'round',
  fill: 'none',
});

/**
 * Run the knob machine of `@contour-ui/core` in a component, on any platform: its API (`value`,
 * `valueText`, `position`, `angle`, `geometry`, `setValue()`…), whether the pointer is over the
 * control, and the props of the root, the label, the control, the track, the range, the thumb,
 * the value text and the hidden input, in the words of the elements of `@contour-ui/primitive`.
 * The control reads the input through the services of the platform: a vertical drag of the
 * primary button (up raises the value; Shift slows it down, by ten), the wheel, the keys of a
 * slider (arrows, Shift for fine steps, Page Up and Page Down, Home and End), a double press,
 * which resets the value at its second press, and the actions of assistive technology.
 * `Knob.Root` calls it; call it yourself to build the parts from the elements yourself.
 *
 * @example
 * const api = useKnob({ min: -60, max: 12, defaultValue: 0, formatValue: formatDecibels });
 * <Primitive.div {...api.getRootProps()}>
 *   <Primitive.text {...api.getLabelProps()}>Gain</Primitive.text>
 *   <Primitive.svg {...api.getControlProps()} width={40} height={40}>
 *     <Primitive.path {...api.getTrackProps()} />
 *     <Primitive.path {...api.getRangeProps()} />
 *     <Primitive.line {...api.getThumbProps()} />
 *   </Primitive.svg>
 *   <Primitive.text {...api.getValueTextProps()}>{api.valueText}</Primitive.text>
 * </Primitive.div>;
 */
export function useKnob(props: UseKnobProps = {}): UseKnobReturn {
  const { pointerLock = false, name, form, ...input } = props;
  const service = useMachine(knob.machine, input, platform);
  const api = knob.connect(service);
  const { disabled, readOnly, geometry } = api;

  const labelId = `${useId()}label`;
  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined);
  const registerLabel = useCallback((id: string) => {
    setLabelledBy(id);
    return () => {
      setLabelledBy((current) => (current === id ? undefined : current));
    };
  }, []);
  const labelRef = useCallback<RefCallback<PrimitiveNode<'text'>>>(
    (node) => (node === null ? undefined : registerLabel(labelId)),
    [registerLabel, labelId],
  );

  const interaction = useInteraction({
    disabled,
    hoverable: !readOnly,
    onFocusChange: (focused, focusVisible) => {
      if (focused) {
        api.focusControl(focusVisible);
      } else {
        api.blurControl();
      }
    },
  });
  const hovered = useInteractionField(interaction.store, 'hovered');
  const drag = useDrag({
    disabled,
    readOnly,
    pointerLock,
    onStart: () => {
      api.startDrag();
    },
    onMove: ({ deltaY, shiftKey }) => {
      // Sideways moves make a press a drag, but only the vertical ones turn the knob.
      if (deltaY !== 0) {
        api.moveDrag(deltaY, shiftKey);
      }
    },
    onEnd: () => {
      api.endDrag();
    },
    onDoublePress: () => {
      api.resetValue();
    },
  });
  const wheel = useWheel({
    disabled: disabled || readOnly,
    onWheel: (turn) => {
      // Vertical only; macOS sends it sideways under Shift, which slows it down.
      const deltaY = getRangeWheelDelta(turn);
      if (deltaY !== 0) {
        api.scrollWheel(deltaY, turn.shiftKey);
      }
    },
  });
  const actions = useRangeActions({
    disabled: disabled || readOnly,
    onStep: (direction) => {
      api.stepValue(direction, 'step');
    },
    onSetValue: (value) => {
      api.commitValue(value);
    },
  });
  const controlRef = useMemo(
    () => composeRefs<PrimitiveNode<'svg'>>(interaction.ref, drag.ref, wheel.ref, actions.ref),
    [interaction.ref, drag.ref, wheel.ref, actions.ref],
  );

  const part = <Part extends string>(partName: Part): KnobPartAttributes<Part> => ({
    'data-scope': 'knob',
    'data-part': partName,
    'data-disabled': present(disabled),
    'data-readonly': present(readOnly),
    'data-dragging': present(api.dragging),
  });

  return {
    ...api,
    hovered,
    interaction: interaction.store,
    registerLabel,
    getRootProps: () => ({
      ...part('root'),
      ...customProperties<KnobRootStyle>({
        '--knob-position': String(api.position),
        '--knob-angle': `${api.angle}deg`,
      }),
      'aria-disabled': disabled ? true : undefined,
    }),
    getLabelProps: () => ({ ...part('label'), id: labelId, ref: labelRef }),
    getControlProps: () =>
      mergeProps(drag.props, interaction.props, wheel.props, actions.props, {
        ...part('control'),
        role: 'slider' as const,
        tabIndex: disabled ? undefined : (0 as const),
        viewBox: geometry.viewBox,
        'aria-valuemin': api.min,
        'aria-valuemax': api.max,
        'aria-valuenow': api.value,
        'aria-valuetext': api.valueText,
        'aria-labelledby': labelledBy,
        'aria-orientation': 'vertical' as const,
        'aria-disabled': disabled ? (true as const) : undefined,
        'aria-readonly': readOnly ? (true as const) : undefined,
        'data-focus-visible': present(api.focusVisible),
        ref: controlRef,
        onKeyDown: (event: PrimitiveKeyboardEvent) => {
          // The owner's handler runs first: `event.preventDefault()` there keeps the knob still.
          if (event.defaultPrevented || disabled) {
            return;
          }
          const intent = getRangeIntent(event);
          if (intent === null) {
            return;
          }
          event.preventDefault();
          const size = event.shiftKey ? 'fine' : 'step';
          switch (intent) {
            case 'increment':
            case 'decrement': {
              api.stepValue(intent === 'increment' ? 1 : -1, size);
              break;
            }
            case 'increment-page':
            case 'decrement-page': {
              api.stepValue(intent === 'increment-page' ? 1 : -1, 'page');
              break;
            }
            case 'min':
            case 'max': {
              api.setToEdge(intent);
              break;
            }
          }
        },
      }),
    getTrackProps: () => ({
      ...part('track'),
      ...shape(geometry.track.strokeWidth),
      d: geometry.track.d,
    }),
    getRangeProps: () => ({
      ...part('range'),
      ...shape(geometry.range.strokeWidth),
      d: geometry.range.d,
    }),
    getThumbProps: () => {
      const { x1, y1, x2, y2, strokeWidth } = geometry.thumb;
      return { ...part('thumb'), ...shape(strokeWidth), x1, y1, x2, y2 };
    },
    getValueTextProps: () => ({ ...part('value-text'), 'aria-hidden': true }),
    getHiddenInputProps: () => ({
      ...part('hidden-input'),
      type: 'hidden',
      name,
      form,
      value: String(api.value),
      disabled,
    }),
  };
}
