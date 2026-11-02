import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import { knobMachine } from './knob.machine.ts';
import type { KnobInput, KnobValueChangeDetails } from './knob.types.ts';

/** A started knob on the test platform, with spies on its three callbacks. */
function knob(props: KnobInput = {}) {
  const onValueChange = vi.fn<(details: KnobValueChangeDetails) => void>();
  const onValueChangeStart = vi.fn<(details: KnobValueChangeDetails) => void>();
  const onValueChangeEnd = vi.fn<(details: KnobValueChangeDetails) => void>();
  const input: KnobInput = { onValueChange, onValueChangeStart, onValueChangeEnd, ...props };
  const test = createTestPlatform(knobMachine);
  const service = createService(knobMachine, { props: input, platform: test.platform });
  service.start();
  /** The values each callback received, in order. */
  const calls = () => ({
    change: onValueChange.mock.calls.map(([details]) => details.value),
    start: onValueChangeStart.mock.calls.map(([details]) => details.value),
    end: onValueChangeEnd.mock.calls.map(([details]) => details.value),
  });
  const update = (next: KnobInput) => {
    service.setProps({ ...input, ...next });
    service.syncProps();
  };
  return { service, test, calls, update, value: () => service.context.get('value') };
}

describe('knob machine', () => {
  it('starts idle at its origin, from 0 to 100', () => {
    const { service, value, calls } = knob();

    expect(service.matches('idle')).toBe(true);
    expect(value()).toBe(0);
    expect(service.prop('min')).toBe(0);
    expect(service.prop('max')).toBe(100);
    expect(service.prop('scale')).toBe('linear');
    expect(service.prop('dragDistance')).toBe(200);
    expect(service.context.get('focused')).toBe(false);
    expect(calls()).toStrictEqual({ change: [], start: [], end: [] });
  });

  it('starts at the default value, clamped and snapped, or at a bipolar origin', () => {
    expect(knob({ defaultValue: 150 }).value()).toBe(100);
    expect(knob({ defaultValue: 23, step: 10 }).value()).toBe(20);
    expect(knob({ min: -12, max: 12, origin: 0 }).value()).toBe(0);
    expect(knob({ origin: 500 }).value()).toBe(100);
  });

  it('drags up to raise the value, as one gesture', () => {
    const { service, value, calls } = knob({ defaultValue: 50 });

    service.send({ type: 'DRAG.START' });
    expect(service.matches('dragging')).toBe(true);
    service.send({ type: 'DRAG.MOVE', deltaY: -50, fine: false });
    expect(value()).toBe(75);
    service.send({ type: 'DRAG.MOVE', deltaY: 100, fine: false });
    expect(value()).toBe(25);
    service.send({ type: 'DRAG.END' });

    expect(service.matches('idle')).toBe(true);
    expect(calls()).toStrictEqual({ change: [75, 25], start: [50], end: [25] });
  });

  it('drags ten times as slowly while fine, and as far as dragDistance says', () => {
    const fine = knob({ defaultValue: 50 });
    fine.service.send({ type: 'DRAG.START' });
    fine.service.send({ type: 'DRAG.MOVE', deltaY: -100, fine: true });
    expect(fine.value()).toBe(55);

    const short = knob({ dragDistance: 100 });
    short.service.send({ type: 'DRAG.START' });
    short.service.send({ type: 'DRAG.MOVE', deltaY: -50, fine: false });
    expect(short.value()).toBe(50);
  });

  it('stops a drag at the ends of the range, and comes back from there at once', () => {
    const { service, value } = knob({ defaultValue: 90 });

    service.send({ type: 'DRAG.START' });
    service.send({ type: 'DRAG.MOVE', deltaY: -400, fine: false });
    expect(value()).toBe(100);
    service.send({ type: 'DRAG.MOVE', deltaY: 20, fine: false });
    expect(value()).toBe(90);
  });

  it('adds up small moves until they reach a step', () => {
    const { service, value, calls } = knob({ step: 10 });

    service.send({ type: 'DRAG.START' });
    for (let move = 0; move < 4; move += 1) {
      service.send({ type: 'DRAG.MOVE', deltaY: -2, fine: false });
    }
    expect(value()).toBe(0);
    service.send({ type: 'DRAG.MOVE', deltaY: -2, fine: false });
    expect(value()).toBe(10);
    service.send({ type: 'DRAG.END' });
    expect(calls().change).toStrictEqual([10]);
  });

  it('runs a burst of wheel events as one gesture that ends once the wheel rests', () => {
    const { service, test, value, calls } = knob({ defaultValue: 50 });

    service.send({ type: 'WHEEL', deltaY: -100, fine: false });
    expect(service.matches('scrolling')).toBe(true);
    expect(value()).toBe(55);
    test.advance(200);
    service.send({ type: 'WHEEL', deltaY: -100, fine: false });
    expect(value()).toBe(60);
    test.advance(200);
    // The rest started over with the second event.
    expect(service.matches('scrolling')).toBe(true);
    service.send({ type: 'WHEEL', deltaY: 1000, fine: true });
    expect(value()).toBe(55);
    test.advance(300);

    expect(service.matches('idle')).toBe(true);
    expect(calls()).toStrictEqual({ change: [55, 60, 55], start: [50], end: [55] });
  });

  it('steps by a hundredth of the travel, a tenth for a page and a thousandth when fine', () => {
    const { service, value } = knob({ defaultValue: 50 });

    service.send({ type: 'VALUE.STEP', direction: 1, size: 'step' });
    expect(value()).toBe(51);
    service.send({ type: 'VALUE.STEP', direction: -1, size: 'page' });
    expect(value()).toBe(41);
    service.send({ type: 'VALUE.STEP', direction: 1, size: 'fine' });
    expect(value()).toBeCloseTo(41.1, 9);
  });

  it('steps through the travel on a log scale, and one step at least on a coarse one', () => {
    const frequency = knob({ min: 20, max: 20_000, scale: 'log', defaultValue: 1000, step: 1 });
    frequency.service.send({ type: 'VALUE.STEP', direction: 1, size: 'page' });
    // A tenth of three decades: × 10^0.3.
    expect(frequency.value()).toBe(1995);

    const coarse = knob({ min: 0, max: 4, step: 1 });
    coarse.service.send({ type: 'VALUE.STEP', direction: 1, size: 'step' });
    expect(coarse.value()).toBe(1);
    coarse.service.send({ type: 'VALUE.STEP', direction: 1, size: 'fine' });
    expect(coarse.value()).toBe(2);
  });

  it('makes each key its own gesture', () => {
    const { service, calls } = knob({ defaultValue: 50 });

    service.send({ type: 'VALUE.STEP', direction: 1, size: 'step' });
    service.send({ type: 'VALUE.EDGE', edge: 'max' });
    service.send({ type: 'VALUE.EDGE', edge: 'min' });

    expect(service.matches('idle')).toBe(true);
    expect(calls()).toStrictEqual({
      change: [51, 100, 0],
      start: [50, 51, 100],
      end: [51, 100, 0],
    });
  });

  it('resets to the default value, or to the origin without one', () => {
    const withDefault = knob({ defaultValue: 30 });
    withDefault.service.send({ type: 'VALUE.EDGE', edge: 'max' });
    withDefault.service.send({ type: 'VALUE.RESET' });
    expect(withDefault.value()).toBe(30);
    expect(withDefault.calls().end).toStrictEqual([100, 30]);

    const pan = knob({ min: -1, max: 1, origin: 0 });
    pan.service.send({ type: 'VALUE.EDGE', edge: 'min' });
    pan.service.send({ type: 'VALUE.RESET' });
    expect(pan.value()).toBe(0);
  });

  it('commits a value the user gives in one go, clamped and snapped, and ignores NaN', () => {
    const { service, value, calls } = knob({ step: 0.5 });

    service.send({ type: 'VALUE.COMMIT', value: 12.3 });
    expect(value()).toBe(12.5);
    service.send({ type: 'VALUE.COMMIT', value: 1000 });
    expect(value()).toBe(100);
    service.send({ type: 'VALUE.COMMIT', value: Number.NaN });
    expect(value()).toBe(100);
    expect(calls().change).toStrictEqual([12.5, 100]);
  });

  it('snaps without binary noise', () => {
    const { service, value } = knob({ min: 0, max: 1, step: 0.1, defaultValue: 0.2 });

    service.send({ type: 'VALUE.STEP', direction: 1, size: 'page' });
    expect(value()).toBe(0.3);
  });

  it('sets the value from code without a gesture, whatever disabled and readOnly say', () => {
    const { service, value, calls } = knob({ disabled: true, readOnly: true, step: 5 });

    service.send({ type: 'VALUE.SET', value: 42 });
    expect(value()).toBe(40);
    service.send({ type: 'VALUE.SET', value: Number.NaN });
    expect(value()).toBe(40);
    expect(calls()).toStrictEqual({ change: [40], start: [], end: [] });
  });

  it('ignores the user while disabled or read-only', () => {
    for (const props of [{ disabled: true }, { readOnly: true }]) {
      const { service, value, calls } = knob({ ...props, defaultValue: 50 });

      service.send({ type: 'DRAG.START' });
      service.send({ type: 'DRAG.MOVE', deltaY: -100, fine: false });
      service.send({ type: 'WHEEL', deltaY: -100, fine: false });
      service.send({ type: 'VALUE.STEP', direction: 1, size: 'page' });
      service.send({ type: 'VALUE.EDGE', edge: 'max' });
      service.send({ type: 'VALUE.RESET' });
      service.send({ type: 'VALUE.COMMIT', value: 10 });

      expect(service.matches('idle')).toBe(true);
      expect(value()).toBe(50);
      expect(calls()).toStrictEqual({ change: [], start: [], end: [] });
    }
  });

  it('ends a drag and a run of wheel events when the knob turns disabled or read-only', () => {
    const dragged = knob({ defaultValue: 50 });
    dragged.service.send({ type: 'DRAG.START' });
    dragged.service.send({ type: 'DRAG.MOVE', deltaY: -20, fine: false });
    dragged.update({ defaultValue: 50, disabled: true });
    expect(dragged.service.matches('idle')).toBe(true);
    expect(dragged.calls()).toStrictEqual({ change: [60], start: [50], end: [60] });

    const scrolled = knob({ defaultValue: 50 });
    scrolled.service.send({ type: 'WHEEL', deltaY: -100, fine: false });
    scrolled.update({ defaultValue: 50, readOnly: true });
    expect(scrolled.service.matches('idle')).toBe(true);
    expect(scrolled.calls().end).toStrictEqual([55]);
    // Nothing is left to end once the wheel rests.
    scrolled.test.advance(1000);
    expect(scrolled.calls().end).toStrictEqual([55]);
  });

  it('ends a run of wheel events before the next change starts', () => {
    const { service, calls } = knob({ defaultValue: 50 });

    service.send({ type: 'WHEEL', deltaY: -100, fine: false });
    service.send({ type: 'VALUE.STEP', direction: 1, size: 'step' });
    expect(service.matches('idle')).toBe(true);
    service.send({ type: 'WHEEL', deltaY: -100, fine: false });
    service.send({ type: 'DRAG.START' });
    expect(service.matches('dragging')).toBe(true);
    service.send({ type: 'DRAG.END' });

    expect(calls()).toStrictEqual({
      change: [55, 56, 61],
      start: [50, 55, 56, 61],
      end: [55, 56, 61, 61],
    });
  });

  it('ignores keys, the wheel and resets while dragging', () => {
    const { service, value } = knob({ defaultValue: 50 });

    service.send({ type: 'DRAG.START' });
    service.send({ type: 'VALUE.STEP', direction: 1, size: 'page' });
    service.send({ type: 'WHEEL', deltaY: -100, fine: false });
    service.send({ type: 'VALUE.RESET' });
    expect(service.matches('dragging')).toBe(true);
    expect(value()).toBe(50);
  });

  it('only reports the changes of a controlled value, and ends with the last one it reported', () => {
    const { service, value, calls } = knob({ value: 50 });

    service.send({ type: 'DRAG.START' });
    service.send({ type: 'DRAG.MOVE', deltaY: -20, fine: false });
    service.send({ type: 'DRAG.MOVE', deltaY: -20, fine: false });
    service.send({ type: 'DRAG.END' });

    expect(value()).toBe(50);
    expect(calls()).toStrictEqual({ change: [60, 70], start: [50], end: [70] });
  });

  it('tracks the focus of the control and its ring', () => {
    const { service } = knob();

    service.send({ type: 'FOCUS', focusVisible: true });
    expect(service.context.get('focused')).toBe(true);
    expect(service.context.get('focusVisible')).toBe(true);
    service.send({ type: 'BLUR' });
    expect(service.context.get('focused')).toBe(false);
    expect(service.context.get('focusVisible')).toBe(false);
  });
});
