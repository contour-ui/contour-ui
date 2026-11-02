import { describe, expect, it } from 'vite-plus/test';

import { formatFrequency } from '../../format/index.ts';
import { createService, createTestPlatform } from '../../machine/index.ts';
import { connect } from './knob.connect.ts';
import { getKnobAngle, getKnobGeometry } from './knob.geometry.ts';
import { knobMachine } from './knob.machine.ts';
import type { KnobInput } from './knob.types.ts';

/** A started knob and its API, read again after every change. */
function knob(props: KnobInput = {}) {
  const test = createTestPlatform(knobMachine);
  const service = createService(knobMachine, { props, platform: test.platform });
  service.start();
  return { service, api: () => connect(service) };
}

describe('knob connect', () => {
  it('gives the value, its place on the travel and the shapes of the dial', () => {
    const { api } = knob({ defaultValue: 25 });

    expect(api()).toMatchObject({
      value: 25,
      valueText: '25',
      min: 0,
      max: 100,
      step: undefined,
      origin: 0,
      position: 0.25,
      originPosition: 0,
      angle: -67.5,
      dragging: false,
      focused: false,
      focusVisible: false,
      disabled: false,
      readOnly: false,
    });
    expect(api().geometry).toStrictEqual(getKnobGeometry(0.25, 0));
  });

  it('writes the value with formatValue, or with the decimals of the step or the range', () => {
    expect(
      knob({ defaultValue: 1234, min: 20, max: 20_000, formatValue: formatFrequency }).api()
        .valueText,
    ).toBe('1.23 kHz');
    expect(knob({ min: 0, max: 1, defaultValue: 0.5 }).api().valueText).toBe('0.50');
    expect(knob({ min: 0, max: 10, defaultValue: 2.5 }).api().valueText).toBe('2.5');
    expect(knob({ min: 0, max: 1, step: 0.001, defaultValue: 0.25 }).api().valueText).toBe('0.250');
    expect(knob({ min: -12, max: 12, step: 0.5, defaultValue: -3 }).api().valueText).toBe('−3.0');
  });

  it('places a bipolar origin and a log scale on the travel', () => {
    const pan = knob({ min: -1, max: 1, origin: 0, defaultValue: 0.5 }).api();
    expect(pan.originPosition).toBe(0.5);
    expect(pan.position).toBe(0.75);
    expect(pan.angle).toBe(67.5);

    const cutoff = knob({ min: 20, max: 20_000, scale: 'log', defaultValue: 632.455532 }).api();
    expect(cutoff.position).toBeCloseTo(0.5, 6);
    expect(cutoff.angle).toBeCloseTo(0, 4);
  });

  it('shows dragging, and a focus ring only while focused', () => {
    const { api } = knob();

    api().startDrag();
    expect(api().dragging).toBe(true);
    api().endDrag();
    expect(api().dragging).toBe(false);

    api().focusControl(true);
    expect(api()).toMatchObject({ focused: true, focusVisible: true });
    api().blurControl();
    expect(api()).toMatchObject({ focused: false, focusVisible: false });
    api().focusControl(false);
    expect(api()).toMatchObject({ focused: true, focusVisible: false });
  });

  it('sends the user changes and the value from code', () => {
    const { api } = knob({ defaultValue: 50 });

    api().startDrag();
    api().moveDrag(-20, false);
    api().endDrag();
    expect(api().value).toBe(60);
    api().scrollWheel(-100, false);
    expect(api().value).toBe(65);
    api().stepValue(-1, 'page');
    expect(api().value).toBe(55);
    api().setToEdge('max');
    expect(api().value).toBe(100);
    api().resetValue();
    expect(api().value).toBe(50);
    api().commitValue(12);
    expect(api().value).toBe(12);
    api().setValue(99);
    expect(api().value).toBe(99);
  });
});

describe('knob geometry', () => {
  it('maps the travel to a 270° sweep open at the bottom', () => {
    expect(getKnobAngle(0)).toBe(-135);
    expect(getKnobAngle(0.5)).toBe(0);
    expect(getKnobAngle(1)).toBe(135);
    expect(getKnobAngle(2)).toBe(135);
  });

  it('draws the track over the whole travel and the range from the origin to the value', () => {
    const atMin = getKnobGeometry(0, 0);
    expect(atMin.viewBox).toBe('0 0 100 100');
    expect(atMin.track).toStrictEqual({
      d: 'M 17.473 82.527 A 46 46 0 1 1 82.527 82.527',
      strokeWidth: 8,
    });
    expect(atMin.range.d).toBe('');

    expect(getKnobGeometry(0.5, 0).range.d).toBe('M 17.473 82.527 A 46 46 0 0 1 50 4');
    // Either way from a bipolar origin, always clockwise: from −67.5° up to the top.
    expect(getKnobGeometry(0.25, 0.5).range.d).toBe('M 7.502 32.397 A 46 46 0 0 1 50 4');
    expect(getKnobGeometry(1, 0).range.d).toBe(atMin.track.d);
  });

  it('points the thumb at the value', () => {
    expect(getKnobGeometry(0.5, 0).thumb).toStrictEqual({
      x1: 50,
      y1: 36,
      x2: 50,
      y2: 18,
      strokeWidth: 6,
    });
    const right = getKnobGeometry(5 / 6, 0).thumb;
    // At 90°, straight to the right.
    expect(right).toMatchObject({ x1: 64, y1: 50, x2: 82, y2: 50 });
  });
});
