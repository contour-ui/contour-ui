import { knob } from '@contour-ui/core';
import { Pressable, Text, View } from '@soundor/react';
import { Path, Svg } from '@soundor/react/svg';
import {
  act,
  advanceTime,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@soundor/testing-library/react';
import { pointerLockNode } from 'soundor:ui';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { formatDecibels, Knob, useKnob, useKnobContext } from '../index.ts';
import type { UseKnobProps, UseKnobReturn } from '../index.ts';

type Node = ReturnType<typeof screen.getByRole>;

const changeSpy = () => vi.fn<(details: knob.ValueChangeDetails) => void>();

/** Calls `onRender` with the API the parts see, on every render. */
function Spy({ onRender }: { readonly onRender: (api: UseKnobReturn) => void }): null {
  onRender(useKnobContext());
  return null;
}

interface GainProps extends Knob.RootProps {
  readonly onRender?: (api: UseKnobReturn) => void;
}

/** A labelled knob with every part. */
function Gain({ onRender, ...props }: GainProps): ReactElement {
  return (
    <Knob.Root {...props}>
      <Knob.Label>Gain</Knob.Label>
      <Knob.Control width={40} height={40}>
        <Knob.Track />
        <Knob.Range />
        <Knob.Thumb />
      </Knob.Control>
      <Knob.ValueText />
      {onRender === undefined ? null : <Spy onRender={onRender} />}
    </Knob.Root>
  );
}

/** A knob whose label changes its text, or goes. */
function Renamable({ name }: { readonly name: string | undefined }): ReactElement {
  return (
    <Knob.Root>
      {name === undefined ? null : <Knob.Label>{name}</Knob.Label>}
      <Knob.Control />
    </Knob.Root>
  );
}

/** A knob of its own parts, on useKnob. */
function Drive(props: UseKnobProps): ReactElement {
  const api = useKnob(props);
  return (
    <View>
      <Text {...api.getLabelProps()}>Drive</Text>
      <Svg {...api.getControlProps()} width={32} height={32}>
        <Path {...api.getRangeProps()} color="#ff0000" />
      </Svg>
      <Text {...api.getValueTextProps()}>{api.valueText}</Text>
    </View>
  );
}

/** A knob whose owner keeps its value. */
function Controlled(): ReactElement {
  const [value, setValue] = useState(30);
  return (
    <Gain
      value={value}
      onValueChange={(details) => {
        setValue(details.value);
      }}
    />
  );
}

/** A knob, and another control to move the focus to. */
async function setup(props: Knob.RootProps = {}) {
  const renders: UseKnobReturn[] = [];
  const onRender = (api: UseKnobReturn): void => {
    renders.push(api);
  };
  const view = (next: Knob.RootProps): ReactElement => (
    <>
      <Gain {...next} onRender={onRender} />
      <Pressable>
        <Text>Other</Text>
      </Pressable>
    </>
  );
  const user = userEvent.setup();
  const { rerender } = await render(view(props));
  const control = screen.getByRole('adjustable', { name: 'Gain' });
  return {
    user,
    control,
    other: screen.getByRole('button', { name: 'Other' }),
    /** The API after the last render. */
    api: (): UseKnobReturn => {
      const api = renders.at(-1);
      if (api === undefined) {
        throw new Error('The knob has not rendered.');
      }
      return api;
    },
    /** The value, as assistive technology reads it. */
    now: () => control.accessibility.value?.now,
    rerender: (next: Knob.RootProps) => rerender(view(next)),
  };
}

/** Press the control, move the pointer by each of `moves` (positive downwards), and release it. */
function drag(control: Node, moves: readonly number[], init: { shiftKey?: boolean } = {}): void {
  fireEvent.pointerDown(control);
  for (const movementY of moves) {
    fireEvent.pointerMove(control, { movementY, ...init });
  }
  fireEvent.pointerUp(control);
}

/** A wheel event over the control, in pixels unless `deltaMode` says otherwise. */
const wheel = (control: Node, init: Record<string, unknown>) =>
  fireEvent(control, 'wheel', { deltaX: 0, deltaY: 0, deltaMode: 0, ...init });

/** The shapes the control draws: the track, the range and the thumb. */
const shapesOf = (control: Node) => control.svgScene?.children ?? [];

afterEach(() => {
  vi.useRealTimers();
});

describe('Knob', () => {
  describe('parts', () => {
    it('is an adjustable control named by its label, with its range and its value', async () => {
      const { control } = await setup({
        min: -60,
        max: 12,
        defaultValue: -6,
        formatValue: formatDecibels,
      });
      expect(control.accessibility).toMatchObject({
        role: 'adjustable',
        label: 'Gain',
        value: { min: -60, max: 12, now: -6, text: formatDecibels(-6) },
        state: { disabled: false },
        actions: [{ name: 'increment' }, { name: 'decrement' }, { name: 'setValue' }],
      });
      expect(control.focusable).toBe(true);
    });

    it('shows the label and the value text, which assistive technology reads with the control', async () => {
      await setup({ defaultValue: 25, formatValue: (value) => `${value} %` });
      expect(screen.getByText('Gain')).toBeDefined();
      expect(screen.getByText('25 %')).toBeDefined();
      expect(screen.queryByRole('text', { name: 'Gain' })).toBeNull();
      expect(screen.queryByRole('text', { name: '25 %' })).toBeNull();
    });

    it('draws the shapes of the geometry in currentColor, with round caps and no fill', async () => {
      const { control } = await setup({ defaultValue: 75 });
      const { track, range, thumb } = knob.getGeometry(0.75, 0);
      const look = { stroke: 'currentColor', strokeLinecap: 'round', fill: 'none' };
      expect(control.svgScene).toMatchObject({
        viewBox: [0, 0, 100, 100],
        children: [
          { type: 'path', d: track.d, presentation: { ...look, strokeWidth: track.strokeWidth } },
          { type: 'path', d: range.d, presentation: { ...look, strokeWidth: range.strokeWidth } },
          {
            type: 'line',
            // The scene keeps its numbers in single precision.
            x1: Math.fround(thumb.x1),
            y1: Math.fround(thumb.y1),
            x2: Math.fround(thumb.x2),
            y2: Math.fround(thumb.y2),
            presentation: { ...look, strokeWidth: thumb.strokeWidth },
          },
        ],
      });
    });

    it('draws no range while the value is at its origin, and the scene follows it there', async () => {
      const { control, user } = await setup({ defaultValue: 0 });
      expect(shapesOf(control)[1]).toMatchObject({ type: 'path', d: '' });
      const updates = control.svgSceneUpdates;
      await user.tab();
      await user.keyboard('{ArrowUp}');
      expect(shapesOf(control)[1]).toMatchObject({ d: knob.getGeometry(0.01, 0).range.d });
      await user.keyboard('{Home}');
      expect(shapesOf(control)[1]).toMatchObject({ type: 'path', d: '' });
      expect(control.svgSceneUpdates).toBe(updates + 2);
    });

    it('draws the range from the origin of a bipolar knob, either way', async () => {
      const { control, user } = await setup({ min: -50, max: 50, origin: 0, defaultValue: 0 });
      expect(shapesOf(control)[1]).toMatchObject({ d: '' });
      await user.tab();
      await user.keyboard('{PageDown}');
      expect(shapesOf(control)[1]).toMatchObject({ d: knob.getGeometry(0.4, 0.5).range.d });
    });

    it('takes its name from the text of the label, as it changes, and loses it with the label', async () => {
      const { rerender } = await render(<Renamable name="Gain" />);
      const control = screen.getByRole('adjustable', { name: 'Gain' });
      await rerender(<Renamable name="Drive" />);
      expect(control.accessibility.label).toBe('Drive');
      await rerender(<Renamable name={undefined} />);
      expect(control.accessibility.label).toBeUndefined();
    });

    it('takes a name of its own, which wins over the label', async () => {
      await render(
        <>
          <Knob.Root>
            <Knob.Control accessibilityLabel="Pan" />
          </Knob.Root>
          <Knob.Root>
            <Knob.Label>Mix</Knob.Label>
            <Knob.Control accessibilityLabel="Dry and wet mix" />
          </Knob.Root>
        </>,
      );
      expect(screen.getByRole('adjustable', { name: 'Pan' })).toBeDefined();
      expect(screen.getByRole('adjustable', { name: 'Dry and wet mix' })).toBeDefined();
    });

    it('builds parts of your own with useKnob', async () => {
      await render(<Drive defaultValue={10} />);
      const control = screen.getByRole('adjustable', { name: 'Drive' });
      drag(control, [-20]);
      expect(control.accessibility.value?.now).toBe(20);
      expect(screen.getByText('20')).toBeDefined();
      expect(shapesOf(control)[0]).toMatchObject({ presentation: { color: '#ff0000' } });
    });

    it('throws from a part outside a root', async () => {
      // React reports what it throws, too.
      vi.spyOn(globalThis, 'reportError').mockImplementation(() => undefined);
      await expect(render(<Knob.Label>Gain</Knob.Label>)).rejects.toThrow(
        'Knob: render the parts inside <Knob.Root>.',
      );
    });
  });

  describe('drag', () => {
    it('raises the value as the pointer goes up, by the drag distance, and Shift slows it', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      expect(api().dragging).toBe(true);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
      fireEvent.pointerMove(control, { movementY: 40 });
      expect(now()).toBe(40);
      fireEvent.pointerMove(control, { movementY: -20, shiftKey: true });
      expect(now()).toBe(41);
      fireEvent.pointerUp(control);
      expect(api().dragging).toBe(false);
    });

    it('counts vertical moves only, and follows them wherever the pointer goes', async () => {
      const { control, other, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementX: 40 });
      expect(now()).toBe(50);
      // The press keeps the pointer: its moves reach the control.
      fireEvent.pointerMove(other, { movementY: -40 });
      expect(now()).toBe(70);
      fireEvent.pointerUp(other);
    });

    it('takes a drag distance of its own', async () => {
      const { control, now } = await setup({ defaultValue: 50, dragDistance: 100 });
      drag(control, [-10]);
      expect(now()).toBe(60);
    });

    it('drags with the primary button only', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control, { button: 2 });
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(api().dragging).toBe(false);
      expect(now()).toBe(50);
      fireEvent.pointerUp(control, { button: 2 });
    });

    it('ends with a cancel of the press', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerCancel(control);
      expect(api().dragging).toBe(false);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
    });

    it('ends with a context menu, which may take the release', async () => {
      const onValueChangeEnd = changeSpy();
      const { control, api, now } = await setup({ defaultValue: 50, onValueChangeEnd });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      // The secondary button, or Control and a click on macOS.
      fireEvent.pointerDown(control, { button: 2 });
      expect(api().dragging).toBe(false);
      expect(onValueChangeEnd).toHaveBeenCalledExactlyOnceWith({ value: 60 });
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
    });

    it('drags with the first pointer, and ignores a second one meanwhile', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control, { pointerId: 1 });
      fireEvent.pointerDown(control, { pointerId: 2 });
      fireEvent.pointerMove(control, { pointerId: 2, movementY: -40 });
      expect(now()).toBe(50);
      fireEvent.pointerUp(control, { pointerId: 2 });
      expect(api().dragging).toBe(true);
      fireEvent.pointerMove(control, { pointerId: 1, movementY: -20 });
      expect(now()).toBe(60);
      fireEvent.pointerUp(control, { pointerId: 1 });
      expect(api().dragging).toBe(false);
    });

    it('stays still when the owner prevents the press', async () => {
      await render(
        <Knob.Root defaultValue={50}>
          <Knob.Control
            accessibilityLabel="Gain"
            onPointerDown={(event) => {
              event.preventDefault();
            }}
          />
        </Knob.Root>,
      );
      const control = screen.getByRole('adjustable', { name: 'Gain' });
      drag(control, [-20]);
      expect(control.accessibility.value?.now).toBe(50);
    });

    it('focuses the control on a press, without showing it, until a key is pressed', async () => {
      const { control, api, user } = await setup({ defaultValue: 50 });
      drag(control, []);
      expect(control).toHaveFocus();
      expect(api()).toMatchObject({ focused: true, focusVisible: false });
      await user.keyboard('{ArrowUp}');
      expect(api()).toMatchObject({ focused: true, focusVisible: true });
    });
  });

  describe('pointer lock', () => {
    it('locks the pointer to the control while it drags, with pointerLock', async () => {
      const { control, now } = await setup({ defaultValue: 50, pointerLock: true });
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBe(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
      fireEvent.pointerUp(control);
      expect(pointerLockNode()).toBeNull();
    });

    it('gives the lock back when the press is cancelled', async () => {
      const { control, api } = await setup({ pointerLock: true });
      fireEvent.pointerDown(control);
      fireEvent.pointerCancel(control);
      expect(pointerLockNode()).toBeNull();
      expect(api().dragging).toBe(false);
    });

    it('drags unlocked without pointerLock', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBeNull();
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerUp(control);
      expect(now()).toBe(60);
    });

    it('drags unlocked when the lock is refused, as it is to a touch', async () => {
      const { control, now } = await setup({ defaultValue: 50, pointerLock: true });
      fireEvent.pointerDown(control, { pointerType: 'touch' });
      // The refusal settles: the press goes on.
      await act(async () => {
        await Promise.resolve();
      });
      expect(pointerLockNode()).toBeNull();
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerUp(control);
      expect(now()).toBe(60);
    });
  });

  describe('wheel', () => {
    it('turns with the wheel, up raising the value, and keeps scroll views still', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      expect(wheel(control, { deltaY: -100 }).defaultPrevented).toBe(true);
      expect(now()).toBe(55);
      wheel(control, { deltaY: 200 });
      expect(now()).toBe(45);
      // Lines, as some mice count them.
      wheel(control, { deltaY: -3, deltaMode: 1 });
      expect(now()).toBe(47.4);
    });

    it('turns finer with Shift, also when macOS sends the wheel sideways', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      wheel(control, { deltaY: -100, shiftKey: true });
      expect(now()).toBe(50.5);
      wheel(control, { deltaX: -100, shiftKey: true });
      expect(now()).toBe(51);
      // Without Shift, a sideways wheel turns nothing.
      wheel(control, { deltaX: -100 });
      expect(now()).toBe(51);
    });

    it('reports a run of wheel events as one change, which ends once the wheel rests', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const onValueChangeStart = changeSpy();
      const onValueChangeEnd = changeSpy();
      const { control } = await setup({ defaultValue: 50, onValueChangeStart, onValueChangeEnd });
      wheel(control, { deltaY: -100 });
      await advanceTime(200);
      wheel(control, { deltaY: -100 });
      await advanceTime(200);
      expect(onValueChangeStart).toHaveBeenCalledExactlyOnceWith({ value: 50 });
      expect(onValueChangeEnd).not.toHaveBeenCalled();
      await advanceTime(100);
      expect(onValueChangeEnd).toHaveBeenCalledExactlyOnceWith({ value: 60 });
    });
  });

  describe('keys', () => {
    it('steps with the arrows, finer with Shift, by pages and to the ends', async () => {
      const { user, now } = await setup({ defaultValue: 50 });
      await user.tab();
      await user.keyboard('{ArrowUp}');
      expect(now()).toBe(51);
      await user.keyboard('{ArrowRight}');
      expect(now()).toBe(52);
      await user.keyboard('{ArrowDown}{ArrowLeft}');
      expect(now()).toBe(50);
      await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
      expect(now()).toBe(50.1);
      await user.keyboard('{PageUp}');
      expect(now()).toBe(60.1);
      await user.keyboard('{PageDown}{PageDown}');
      expect(now()).toBe(40.1);
      await user.keyboard('{End}');
      expect(now()).toBe(100);
      await user.keyboard('{Home}');
      expect(now()).toBe(0);
    });

    it('takes a step of the knob at least', async () => {
      const { user, now } = await setup({ min: 0, max: 10, step: 2, defaultValue: 4 });
      await user.tab();
      await user.keyboard('{ArrowUp}');
      expect(now()).toBe(6);
    });

    it('prevents the default of the keys it handles only', async () => {
      const { control, user } = await setup({ defaultValue: 50 });
      await user.tab();
      expect(fireEvent.keyDown(control, { key: 'ArrowUp' }).defaultPrevented).toBe(true);
      expect(fireEvent.keyDown(control, { key: 'a' }).defaultPrevented).toBe(false);
      expect(fireEvent.keyDown(control, { key: 'ArrowUp', metaKey: true }).defaultPrevented).toBe(
        false,
      );
    });
  });

  describe('assistive technology', () => {
    it('steps on increment and decrement, and takes a value it is given', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      const increment = fireEvent.accessibilityAction(control, { actionName: 'increment' });
      expect(increment.defaultPrevented).toBe(true);
      expect(now()).toBe(51);
      fireEvent.accessibilityAction(control, { actionName: 'decrement' });
      fireEvent.accessibilityAction(control, { actionName: 'decrement' });
      expect(now()).toBe(49);
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 75 });
      expect(now()).toBe(75);
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: '20' });
      expect(now()).toBe(20);
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 500 });
      expect(now()).toBe(100);
    });

    it('leaves the actions it does not handle to the runtime', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      const text = fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 'x' });
      const activate = fireEvent.accessibilityAction(control, { actionName: 'activate' });
      expect(text.defaultPrevented).toBe(false);
      expect(activate.defaultPrevented).toBe(false);
      expect(now()).toBe(50);
    });
  });

  describe('focus', () => {
    it('shows the focus Tab gives, and hides it when the focus leaves', async () => {
      const { control, api, user } = await setup();
      await user.tab();
      expect(control).toHaveFocus();
      expect(api()).toMatchObject({ focused: true, focusVisible: true });
      await user.tab();
      expect(api()).toMatchObject({ focused: false, focusVisible: false });
    });

    it('is hovered while the pointer is over the control', async () => {
      const { control, other, api, user } = await setup();
      await user.pointer({ target: control });
      expect(api().hovered).toBe(true);
      await user.pointer({ target: other });
      expect(api().hovered).toBe(false);
    });
  });

  describe('changes', () => {
    it('reports every change the user starts with a start and an end', async () => {
      const onValueChangeStart = changeSpy();
      const onValueChangeEnd = changeSpy();
      const onValueChange = changeSpy();
      const { control, user } = await setup({
        defaultValue: 50,
        onValueChange,
        onValueChangeStart,
        onValueChangeEnd,
      });
      drag(control, [-20, -20]);
      expect(onValueChangeStart).toHaveBeenLastCalledWith({ value: 50 });
      expect(onValueChangeEnd).toHaveBeenLastCalledWith({ value: 70 });
      expect(onValueChange).toHaveBeenLastCalledWith({ value: 70 });
      await user.keyboard('{ArrowDown}');
      expect(onValueChangeStart).toHaveBeenLastCalledWith({ value: 70 });
      expect(onValueChangeEnd).toHaveBeenLastCalledWith({ value: 69 });
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 10 });
      expect(onValueChangeEnd).toHaveBeenLastCalledWith({ value: 10 });
      expect(onValueChangeStart).toHaveBeenCalledTimes(3);
      expect(onValueChangeEnd).toHaveBeenCalledTimes(3);
    });

    it('follows a controlled value', async () => {
      await render(<Controlled />);
      const control = screen.getByRole('adjustable', { name: 'Gain' });
      drag(control, [-20]);
      expect(control.accessibility.value?.now).toBe(40);
    });

    it('keeps a controlled value until the owner passes it back', async () => {
      const onValueChange = changeSpy();
      const { control, now } = await setup({ value: 30, onValueChange });
      drag(control, [-20]);
      expect(onValueChange).toHaveBeenLastCalledWith({ value: 40 });
      expect(now()).toBe(30);
    });

    it('changes from code, as setValue does', async () => {
      const { api, now } = await setup({ defaultValue: 50, readOnly: true });
      await act(() => {
        api().setValue(70);
      });
      expect(now()).toBe(70);
    });
  });

  describe('reset', () => {
    it('resets the value on a double press, whose second press drags nothing', async () => {
      const onValueChangeEnd = changeSpy();
      const { control, api, now } = await setup({ defaultValue: 50, onValueChangeEnd });
      drag(control, [-40]);
      expect(now()).toBe(70);
      await advanceTime(600);
      drag(control, []);
      await advanceTime(200);
      fireEvent.pointerDown(control);
      expect(now()).toBe(50);
      expect(onValueChangeEnd).toHaveBeenLastCalledWith({ value: 50 });
      expect(api().dragging).toBe(false);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(50);
      fireEvent.pointerUp(control);
    });

    it('takes no press that moved, and no press far in time or place, for a double press', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      // A drag, then a press at once: the drag was no click.
      drag(control, [-10]);
      fireEvent.pointerDown(control);
      expect(api().dragging).toBe(true);
      fireEvent.pointerUp(control);
      expect(now()).toBe(55);
      // Two clicks too far apart in time…
      await advanceTime(600);
      drag(control, []);
      await advanceTime(600);
      fireEvent.pointerDown(control);
      expect(api().dragging).toBe(true);
      fireEvent.pointerUp(control);
      // …or in place.
      await advanceTime(600);
      fireEvent.pointerDown(control, { clientX: 0 });
      fireEvent.pointerUp(control, { clientX: 0 });
      fireEvent.pointerDown(control, { clientX: 20 });
      expect(api().dragging).toBe(true);
      fireEvent.pointerUp(control, { clientX: 20 });
      expect(now()).toBe(55);
    });
  });

  describe('disabled', () => {
    it('takes no focus and no input, and says so to assistive technology', async () => {
      const { control, api, user, now } = await setup({ defaultValue: 50, disabled: true });
      expect(control.focusable).toBe(false);
      expect(control.accessibility).toMatchObject({ state: { disabled: true }, actions: [] });
      drag(control, [-20]);
      expect(control).not.toHaveFocus();
      expect(wheel(control, { deltaY: -100 }).defaultPrevented).toBe(false);
      fireEvent.accessibilityAction(control, { actionName: 'increment' });
      await user.tab();
      expect(control).not.toHaveFocus();
      fireEvent(control, 'pointerenter');
      expect(api().hovered).toBe(false);
      expect(now()).toBe(50);
    });

    it('gives up its focus and ends a drag when it turns disabled', async () => {
      const onValueChangeEnd = changeSpy();
      const { control, api, user, rerender } = await setup({ defaultValue: 50, onValueChangeEnd });
      await user.tab();
      await rerender({ defaultValue: 50, onValueChangeEnd, disabled: true });
      expect(control).not.toHaveFocus();
      expect(api()).toMatchObject({ focused: false, focusVisible: false });

      await rerender({ defaultValue: 50, onValueChangeEnd });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      await rerender({ defaultValue: 50, onValueChangeEnd, disabled: true });
      expect(api().dragging).toBe(false);
      expect(onValueChangeEnd).toHaveBeenCalledExactlyOnceWith({ value: 60 });
      fireEvent.pointerUp(control);
      expect(onValueChangeEnd).toHaveBeenCalledOnce();
    });
  });

  describe('read-only', () => {
    it('takes focus but not the changes of the user', async () => {
      const { control, api, user, now } = await setup({ defaultValue: 50, readOnly: true });
      expect(control.focusable).toBe(true);
      expect(control.accessibility.actions).toEqual([]);
      drag(control, [-20]);
      expect(control).toHaveFocus();
      expect(api().dragging).toBe(false);
      await user.keyboard('{ArrowUp}{End}');
      expect(wheel(control, { deltaY: -100 }).defaultPrevented).toBe(false);
      fireEvent.accessibilityAction(control, { actionName: 'increment' });
      await advanceTime(600);
      drag(control, []);
      drag(control, []);
      expect(now()).toBe(50);
    });
  });
});
