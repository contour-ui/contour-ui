import type { Service } from '../../machine/index.ts';
import { getKnobAngle, getKnobGeometry } from './knob.geometry.ts';
import type { KnobApi, KnobSchema } from './knob.types.ts';
import { defaultValueText, knobRange, positionOf } from './knob.value.ts';

/**
 * The state and actions of a running knob machine, as its parts need them: the value and its
 * text, the position and angle on the travel, the shapes of the dial, the flags of the knob, and
 * functions that send the events. No DOM and no platform.
 *
 * Call it on every render: it reads the current snapshot.
 *
 * @example
 * const api = connect(service);
 * api.valueText; // '50'
 * api.stepValue(1, 'step');
 */
export function connect(service: Service<KnobSchema>): KnobApi {
  const range = knobRange({
    min: service.prop('min'),
    max: service.prop('max'),
    step: service.prop('step'),
    scale: service.prop('scale'),
    origin: service.prop('origin'),
  });
  const value = service.context.get('value');
  const position = positionOf(value, range);
  const originPosition = positionOf(range.origin, range);
  const formatValue = service.prop('formatValue');
  const focused = service.context.get('focused');
  return {
    value,
    valueText: formatValue === undefined ? defaultValueText(value, range) : formatValue(value),
    min: range.min,
    max: range.max,
    step: range.step,
    origin: range.origin,
    position,
    originPosition,
    angle: getKnobAngle(position),
    geometry: getKnobGeometry(position, originPosition),
    dragging: service.matches('dragging'),
    focused,
    focusVisible: focused && service.context.get('focusVisible'),
    disabled: service.prop('disabled'),
    readOnly: service.prop('readOnly'),
    setValue: (next) => {
      service.send({ type: 'VALUE.SET', value: next });
    },
    startDrag: () => {
      service.send({ type: 'DRAG.START' });
    },
    moveDrag: (deltaY, fine) => {
      service.send({ type: 'DRAG.MOVE', deltaY, fine });
    },
    endDrag: () => {
      service.send({ type: 'DRAG.END' });
    },
    scrollWheel: (deltaY, fine) => {
      service.send({ type: 'WHEEL', deltaY, fine });
    },
    stepValue: (direction, size) => {
      service.send({ type: 'VALUE.STEP', direction, size });
    },
    setToEdge: (edge) => {
      service.send({ type: 'VALUE.EDGE', edge });
    },
    resetValue: () => {
      service.send({ type: 'VALUE.RESET' });
    },
    commitValue: (next) => {
      service.send({ type: 'VALUE.COMMIT', value: next });
    },
    focusControl: (focusVisible) => {
      service.send({ type: 'FOCUS', focusVisible });
    },
    blurControl: () => {
      service.send({ type: 'BLUR' });
    },
  };
}
