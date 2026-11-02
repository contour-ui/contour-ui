import { createMachine } from '../../machine/index.ts';
import type { Machine, MachineParams } from '../../machine/index.ts';
import { clampPosition } from '../../scales/index.ts';
import type { KnobSchema, KnobStepSize } from './knob.types.ts';
import { knobRange, positionOf, snapValue, valueAt } from './knob.value.ts';

/** How much Shift slows a drag and the wheel down. */
const FINE = 0.1;
/** How far the wheel scrolls from one end of the travel to the other, in pixels: a notch of a mouse wheel (100) moves a twentieth. */
const WHEEL_DISTANCE = 2000;
/** How long the wheel rests before a run of wheel events ends, in milliseconds. */
const WHEEL_IDLE = 300;
/** The share of the travel a step takes, by its size. */
const STEP_FRACTIONS: { readonly [S in KnobStepSize]: number } = {
  fine: 0.001,
  step: 0.01,
  page: 0.1,
};

type Params = MachineParams<KnobSchema>;

/** The range of the knob, from its current props. */
function rangeOf({ prop }: Pick<Params, 'prop'>) {
  return knobRange({
    min: prop('min'),
    max: prop('max'),
    step: prop('step'),
    scale: prop('scale'),
    origin: prop('origin'),
  });
}

/** Give the value the user's change reached: reported, and kept for the end of the change. */
function adjust({ context }: Params, value: number): void {
  context.set('value', value);
  context.set('gestureValue', value);
}

/** Move by `delta` of the travel from where the drag or the wheel has brought the knob. */
function moveBy(params: Params, delta: number): void {
  const position = clampPosition(params.context.get('gesturePosition') + delta);
  params.context.set('gesturePosition', position);
  adjust(params, valueAt(position, rangeOf(params)));
}

/**
 * The knob machine: a value in a range that the user changes by dragging (up raises it), with
 * the wheel, with keys and with a reset to its default. Its context holds the value, controlled
 * or owned, and the focus of the control.
 *
 * - `idle` → `dragging` on `DRAG.START`; `DRAG.MOVE` moves the value by `deltaY` over
 *   `dragDistance` of the travel (a tenth of that with `fine`), and `DRAG.END` ends the drag.
 * - `idle` → `scrolling` on `WHEEL`, a twentieth of the travel per 100 pixels; back to `idle`
 *   once the wheel has rested for 300 ms.
 * - `VALUE.STEP`, `VALUE.EDGE`, `VALUE.RESET` and `VALUE.COMMIT` change the value in one go.
 * - Every change the user starts calls `onValueChangeStart` and, when it ends, `onValueChangeEnd`
 *   with the value it left: a plugin records what lies between as one gesture. A drag or a run
 *   of wheel events adds up small moves before the value snaps to `step`.
 * - Nothing the user does changes a disabled or read-only knob; turning either on ends the
 *   change in progress (`GESTURE.CANCEL`). `VALUE.SET` changes the value from code at any time.
 *
 * Input belongs to the platform: it reads pointer moves, wheel deltas (`getWheelDelta`) and keys
 * (`getRangeIntent`) and sends these events.
 *
 * @example
 * const service = createService(knobMachine, { props: { min: 20, max: 20_000, scale: 'log' }, platform });
 * service.start();
 * service.send({ type: 'DRAG.START' });
 * service.send({ type: 'DRAG.MOVE', deltaY: -100, fine: false });
 * service.send({ type: 'DRAG.END' });
 */
export const knobMachine: Machine<KnobSchema> = createMachine<KnobSchema>({
  props: ({
    min = 0,
    max = 100,
    scale = 'linear',
    disabled = false,
    readOnly = false,
    dragDistance = 200,
    ...input
  }) => ({ ...input, min, max, scale, disabled, readOnly, dragDistance }),
  context: {
    value: ({ prop }) => {
      const range = rangeOf({ prop });
      return {
        value: prop('value'),
        defaultValue: snapValue(prop('defaultValue') ?? range.origin, range),
        onChange: (value) => prop('onValueChange')?.({ value }),
      };
    },
    focused: () => ({ defaultValue: false }),
    focusVisible: () => ({ defaultValue: false }),
    gesturePosition: () => ({ defaultValue: 0 }),
    gestureValue: () => ({ defaultValue: 0 }),
  },
  initial: 'idle',
  on: {
    'VALUE.SET': { actions: ['setValue'] },
    FOCUS: { actions: ['focus'] },
    BLUR: { actions: ['blur'] },
  },
  watch: {
    disabled: ['cancelGesture'],
    readOnly: ['cancelGesture'],
  },
  states: {
    idle: {
      on: {
        'DRAG.START': { guard: 'canAdjust', target: 'dragging', actions: ['beginGesture'] },
        WHEEL: { guard: 'canAdjust', target: 'scrolling', actions: ['beginGesture', 'wheel'] },
        'VALUE.STEP': { guard: 'canAdjust', actions: ['beginGesture', 'step', 'endGesture'] },
        'VALUE.EDGE': { guard: 'canAdjust', actions: ['beginGesture', 'edge', 'endGesture'] },
        'VALUE.RESET': { guard: 'canAdjust', actions: ['beginGesture', 'reset', 'endGesture'] },
        'VALUE.COMMIT': { guard: 'canAdjust', actions: ['beginGesture', 'commit', 'endGesture'] },
      },
    },
    dragging: {
      // Keys, the wheel and resets wait for the release.
      on: {
        'DRAG.MOVE': { actions: ['drag'] },
        'DRAG.END': { target: 'idle', actions: ['endGesture'] },
        'GESTURE.CANCEL': { target: 'idle', actions: ['endGesture'] },
      },
    },
    scrolling: {
      after: {
        wheelIdle: { target: 'idle', actions: ['endGesture'] },
      },
      on: {
        // Re-entered, so the rest starts over with every wheel event.
        WHEEL: { target: 'scrolling', reenter: true, actions: ['wheel'] },
        // Anything else ends the run of wheel events first.
        'DRAG.START': {
          guard: 'canAdjust',
          target: 'dragging',
          actions: ['endGesture', 'beginGesture'],
        },
        'VALUE.STEP': {
          guard: 'canAdjust',
          target: 'idle',
          actions: ['endGesture', 'beginGesture', 'step', 'endGesture'],
        },
        'VALUE.EDGE': {
          guard: 'canAdjust',
          target: 'idle',
          actions: ['endGesture', 'beginGesture', 'edge', 'endGesture'],
        },
        'VALUE.RESET': {
          guard: 'canAdjust',
          target: 'idle',
          actions: ['endGesture', 'beginGesture', 'reset', 'endGesture'],
        },
        'VALUE.COMMIT': {
          guard: 'canAdjust',
          target: 'idle',
          actions: ['endGesture', 'beginGesture', 'commit', 'endGesture'],
        },
        'GESTURE.CANCEL': { target: 'idle', actions: ['endGesture'] },
      },
    },
  },
  actions: {
    beginGesture: (params) => {
      const value = params.context.get('value');
      params.context.set('gesturePosition', positionOf(value, rangeOf(params)));
      params.context.set('gestureValue', value);
      params.prop('onValueChangeStart')?.({ value });
    },
    endGesture: ({ context, prop }) => {
      prop('onValueChangeEnd')?.({ value: context.get('gestureValue') });
    },
    cancelGesture: ({ prop, send }) => {
      if (prop('disabled') || prop('readOnly')) {
        send({ type: 'GESTURE.CANCEL' });
      }
    },
    drag: (params) => {
      const { event, prop } = params;
      if (event.type === 'DRAG.MOVE') {
        moveBy(params, (-event.deltaY / prop('dragDistance')) * (event.fine ? FINE : 1));
      }
    },
    wheel: (params) => {
      const { event } = params;
      if (event.type === 'WHEEL') {
        moveBy(params, (-event.deltaY / WHEEL_DISTANCE) * (event.fine ? FINE : 1));
      }
    },
    step: (params) => {
      const { event, context } = params;
      if (event.type !== 'VALUE.STEP') {
        return;
      }
      const range = rangeOf(params);
      const current = context.get('value');
      const position = clampPosition(
        positionOf(current, range) + event.direction * STEP_FRACTIONS[event.size],
      );
      let next = valueAt(position, range);
      // A coarse step can swallow a small share of the travel: take one step at least.
      if (next === current && range.step !== undefined) {
        next = snapValue(current + event.direction * range.step, range);
      }
      adjust(params, next);
    },
    edge: (params) => {
      const { event } = params;
      if (event.type === 'VALUE.EDGE') {
        const range = rangeOf(params);
        adjust(params, event.edge === 'min' ? range.min : range.max);
      }
    },
    reset: (params) => {
      const range = rangeOf(params);
      adjust(params, snapValue(params.prop('defaultValue') ?? range.origin, range));
    },
    commit: (params) => {
      const { event } = params;
      if (event.type === 'VALUE.COMMIT' && !Number.isNaN(event.value)) {
        adjust(params, snapValue(event.value, rangeOf(params)));
      }
    },
    setValue: (params) => {
      const { event, context } = params;
      if (event.type === 'VALUE.SET' && !Number.isNaN(event.value)) {
        context.set('value', snapValue(event.value, rangeOf(params)));
      }
    },
    focus: ({ context, event }) => {
      if (event.type === 'FOCUS') {
        context.set('focused', true);
        context.set('focusVisible', event.focusVisible);
      }
    },
    blur: ({ context }) => {
      context.set('focused', false);
      context.set('focusVisible', false);
    },
  },
  guards: {
    canAdjust: ({ prop }) => !prop('disabled') && !prop('readOnly'),
  },
  delays: {
    wheelIdle: () => WHEEL_IDLE,
  },
});
