/*
 * The Knob on every platform: one file, run by `headless-react` (Chromium, React DOM) and by
 * `headless-react:soundor` (Soundor's simulated runtime), with the parts and this file the same
 * source. It speaks through the harness of `@contour-ui/test-harness`, whose half the export
 * condition of the project picks; what only one platform has is in `knob.web.test.tsx` and
 * `knob.soundor.test.tsx`.
 */
import { formatDecibels, knob } from '@contour-ui/core';
import { PLATFORM, Primitive } from '@contour-ui/primitive';
import { harness } from '@contour-ui/test-harness';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import * as Knob from './index.ts';
import { useKnobContext } from './knob-context.ts';
import { useKnob } from './use-knob.ts';
import type { UseKnobProps, UseKnobReturn } from './use-knob.ts';

const { getByRole, semantics, user } = harness;

type ChangeSpy = ReturnType<typeof changeSpy>;

const changeSpy = () => vi.fn<(details: knob.ValueChangeDetails) => void>();

/** The values a spy was called with, in order. */
const valuesOf = (spy: ChangeSpy): number[] => spy.mock.calls.map(([{ value }]) => value);

/** The values a field of the API took, render after render, each change once. */
function changesOf<Key extends keyof UseKnobReturn>(
  renders: readonly UseKnobReturn[],
  key: Key,
): Array<UseKnobReturn[Key]> {
  const values: Array<UseKnobReturn[Key]> = [];
  for (const api of renders) {
    if (values.length === 0 || values.at(-1) !== api[key]) {
      values.push(api[key]);
    }
  }
  return values;
}

/** Calls `onRender` with the API the parts see, on every render. */
function Spy({ onRender }: { readonly onRender: (api: UseKnobReturn) => void }): null {
  onRender(useKnobContext());
  return null;
}

interface GainProps extends Knob.RootProps {
  readonly onRender?: (api: UseKnobReturn) => void;
}

/** A labelled knob with every part, between two buttons to move the focus with. */
function Gain({ onRender, ...props }: GainProps): ReactElement {
  return (
    <Primitive.div>
      <Primitive.button>Before</Primitive.button>
      <Knob.Root {...props}>
        <Knob.Label>Gain</Knob.Label>
        <Knob.Control width={40} height={40}>
          <Knob.Track />
          <Knob.Range />
          <Knob.Thumb />
        </Knob.Control>
        <Knob.ValueText />
        <Knob.HiddenInput />
        {onRender === undefined ? null : <Spy onRender={onRender} />}
      </Knob.Root>
      <Primitive.button>After</Primitive.button>
    </Primitive.div>
  );
}

/** Render a `Gain`, and find its control and the buttons around it. */
async function setup(props: Knob.RootProps = {}) {
  const renders: UseKnobReturn[] = [];
  const onRender = (api: UseKnobReturn): void => {
    renders.push(api);
  };
  const view = await harness.render(<Gain {...props} onRender={onRender} />);
  const control = getByRole('slider', { name: 'Gain' });
  return {
    control,
    before: getByRole('button', { name: 'Before' }),
    after: getByRole('button', { name: 'After' }),
    /** The API of every render, the latest last. */
    renders,
    /** The API the parts saw at the last render. */
    api: (): UseKnobReturn => {
      const api = renders.at(-1);
      if (api === undefined) {
        throw new Error('The knob has not rendered.');
      }
      return api;
    },
    /** The value, as assistive technology reads it. */
    now: () => semantics(control).value.now,
    rerender: (next: Knob.RootProps) => view.rerender(<Gain {...next} onRender={onRender} />),
  };
}

/** Give the control the focus from the keyboard: press the button before it, then Tab. */
async function tabTo(before: ReturnType<typeof getByRole>): Promise<void> {
  await user.press(before);
  await user.tab();
}

/** A knob whose owner keeps the value, with a button that sets it. */
function Controlled({ onValueChange }: { readonly onValueChange: ChangeSpy }): ReactElement {
  const [value, setValue] = useState(10);
  return (
    <Primitive.div>
      <Gain
        value={value}
        onValueChange={(details) => {
          onValueChange(details);
          setValue(details.value);
        }}
      />
      <Primitive.button
        onPress={() => {
          setValue(75);
        }}
      >
        Seventy-five
      </Primitive.button>
    </Primitive.div>
  );
}

/** A button of its own inside the root that sets the value through the context. */
function HalfButton(): ReactElement {
  const api = useKnobContext();
  return (
    <Primitive.button
      onPress={() => {
        api.setValue(50);
      }}
    >
      Half
    </Primitive.button>
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

/** A knob of parts of its own, on useKnob and the elements. */
function Drive(props: UseKnobProps): ReactElement {
  const api = useKnob(props);
  return (
    <Primitive.div {...api.getRootProps()}>
      <Primitive.text {...api.getLabelProps()}>Drive</Primitive.text>
      <Primitive.svg {...api.getControlProps()} width={32} height={32}>
        <Primitive.path {...api.getRangeProps()} color="#ff0000" />
      </Primitive.svg>
      <Primitive.text {...api.getValueTextProps()}>{api.valueText}</Primitive.text>
    </Primitive.div>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe(`Knob on ${harness.platform}`, () => {
  it('runs on the backend of its project', () => {
    expect(PLATFORM).toBe(harness.platform);
  });

  describe('parts', () => {
    it('is a slider named by its label, with its range and the text of its value', async () => {
      const { control } = await setup({
        min: -60,
        max: 12,
        defaultValue: -6,
        step: 0.5,
        formatValue: formatDecibels,
      });
      expect(semantics(control)).toStrictEqual({
        role: 'slider',
        name: 'Gain',
        description: '',
        value: { min: -60, max: 12, now: -6, text: '−6.0 dB' },
        disabled: false,
      });
    });

    it('shows the label and the readout, whose value the control carries alone', async () => {
      await setup({ defaultValue: 25, formatValue: (value) => `${value} %` });
      expect(harness.hasText('Gain')).toBe(true);
      expect(harness.hasText('25 %')).toBe(true);
      // The value is the control's (`aria-valuetext`): assistive technology does not read the
      // readout again on its own.
      expect(harness.readsText('25 %')).toBe(false);
    });

    it('draws the dial of the value from the geometry of core, in currentColor', async () => {
      const { control } = await setup({ min: -1, max: 1, origin: 0, defaultValue: 0.5 });
      const { track, range, thumb } = knob.getGeometry(0.75, 0.5);
      const look = { stroke: 'currentColor', strokeLinecap: 'round', fill: 'none' };
      expect(harness.drawing(control)).toStrictEqual({
        viewBox: [0, 0, 100, 100],
        shapes: [
          { type: 'path', d: track.d, ...look, strokeWidth: track.strokeWidth },
          { type: 'path', d: range.d, ...look, strokeWidth: range.strokeWidth },
          {
            type: 'line',
            x1: Math.fround(thumb.x1),
            y1: Math.fround(thumb.y1),
            x2: Math.fround(thumb.x2),
            y2: Math.fround(thumb.y2),
            ...look,
            strokeWidth: thumb.strokeWidth,
          },
        ],
      });
    });

    it('draws no range at the origin, and the range from the origin either way', async () => {
      const { control, before } = await setup({ min: -50, max: 50, origin: 0, defaultValue: 0 });
      const range = () => harness.drawing(control).shapes[1];
      expect(range()).toMatchObject({ type: 'path', d: '' });
      await tabTo(before);
      await user.keyboard('{PageDown}');
      expect(range()).toMatchObject({ d: knob.getGeometry(0.4, 0.5).range.d });
      await user.keyboard('{End}');
      expect(range()).toMatchObject({ d: knob.getGeometry(1, 0.5).range.d });
      await user.keyboard('{Home}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}');
      expect(range()).toMatchObject({ d: '' });
    });

    it('takes its name from the text of its label, as it changes, and loses it with the label', async () => {
      const view = await harness.render(<Renamable name="Gain" />);
      // Found by its role alone: a web locator finds its element again by what it was asked.
      const control = getByRole('slider');
      expect(semantics(control).name).toBe('Gain');
      await view.rerender(<Renamable name="Drive" />);
      await expect.poll(() => semantics(control).name).toBe('Drive');
      await view.rerender(<Renamable name={undefined} />);
      await expect.poll(() => semantics(control).name).toBe('');
    });

    it('is named by a label with an id of the owner, or by aria-label without a label', async () => {
      await harness.render(
        <Primitive.div>
          <Knob.Root>
            <Knob.Label id="own-label">Drive</Knob.Label>
            <Knob.Control />
          </Knob.Root>
          <Knob.Root>
            <Knob.Control aria-label="Tone" />
          </Knob.Root>
        </Primitive.div>,
      );
      expect(semantics(getByRole('slider', { name: 'Drive' })).name).toBe('Drive');
      expect(semantics(getByRole('slider', { name: 'Tone' })).name).toBe('Tone');
    });

    it('takes the name of its label over aria-label, as accname does', async () => {
      await harness.render(
        <Knob.Root>
          <Knob.Label>Mix</Knob.Label>
          <Knob.Control aria-label="Dry and wet mix" />
        </Knob.Root>,
      );
      expect(harness.queryByRole('slider', { name: 'Mix' })).not.toBeNull();
      expect(harness.queryByRole('slider', { name: 'Dry and wet mix' })).toBeNull();
    });

    it('builds parts of your own with useKnob', async () => {
      await harness.render(<Drive defaultValue={10} />);
      const control = getByRole('slider', { name: 'Drive' });
      await user.drag(control, -20);
      await expect.poll(() => semantics(control).value.now).toBe(20);
      expect(harness.hasText('20')).toBe(true);
      expect(harness.drawing(control).shapes).toMatchObject([{ type: 'path', color: '#ff0000' }]);
    });

    it('throws from a part outside a root', async () => {
      // React reports what a render throws, too.
      vi.spyOn(globalThis, 'reportError').mockImplementation(() => undefined);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await expect(harness.render(<Knob.Label>Lost</Knob.Label>)).rejects.toThrow(
        'Knob: render the parts inside <Knob.Root>.',
      );
    });
  });

  describe('drag', () => {
    it('turns with a vertical drag, up raising the value, each drag a change of its own', async () => {
      const onValueChange = changeSpy();
      const onValueChangeStart = changeSpy();
      const onValueChangeEnd = changeSpy();
      const { control, api, renders, now } = await setup({
        onValueChange,
        onValueChangeStart,
        onValueChangeEnd,
      });

      // 100 of the 200 pixels of the travel, in four moves.
      await user.drag(control, -100);
      await expect.poll(() => now()).toBe(50);
      expect(valuesOf(onValueChange)).toStrictEqual([12.5, 25, 37.5, 50]);
      expect(valuesOf(onValueChangeStart)).toStrictEqual([0]);
      expect(valuesOf(onValueChangeEnd)).toStrictEqual([50]);
      // Dragging from the press to the release.
      expect(changesOf(renders, 'dragging')).toStrictEqual([false, true, false]);
      // The press focused the control, without showing it.
      expect(harness.hasFocus(control)).toBe(true);
      expect(harness.focusVisible(control)).toBe(false);
      expect(api()).toMatchObject({ focused: true, focusVisible: false });

      await user.drag(control, 150);
      await expect.poll(() => now()).toBe(0);
      expect(valuesOf(onValueChangeEnd)).toStrictEqual([50, 0]);
    });

    it('drags ten times finer with Shift', async () => {
      const { control, now } = await setup({ defaultValue: 20 });
      await user.drag(control, -100, { shiftKey: true });
      await expect.poll(() => now()).toBe(25);
    });

    it('takes a drag distance of its own', async () => {
      const { control, now } = await setup({ defaultValue: 50, dragDistance: 100 });
      await user.drag(control, -20);
      await expect.poll(() => now()).toBe(70);
    });

    it('stays still when the owner prevents the press', async () => {
      await harness.render(
        <Knob.Root defaultValue={50}>
          <Knob.Control
            aria-label="Gain"
            width={40}
            height={40}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
          />
        </Knob.Root>,
      );
      const control = getByRole('slider', { name: 'Gain' });
      await user.drag(control, -20);
      expect(semantics(control).value.now).toBe(50);
    });
  });

  describe('wheel', () => {
    it('turns with the wheel, up raising the value, and keeps what is around still', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      // A notch of a mouse wheel: a twentieth of the travel.
      expect(await user.wheel(control, { y: -100 })).toBe(true);
      await expect.poll(() => now()).toBe(55);
      expect(await user.wheel(control, { y: 200 })).toBe(true);
      await expect.poll(() => now()).toBe(45);
    });

    it('turns finer with Shift, also when macOS sends the wheel sideways', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      await user.wheel(control, { y: -100 }, { shiftKey: true });
      await expect.poll(() => now()).toBe(50.5);
      await user.wheel(control, { x: -100 }, { shiftKey: true });
      await expect.poll(() => now()).toBe(51);
      // Without Shift, a sideways wheel turns nothing.
      await user.wheel(control, { x: -100 });
      expect(now()).toBe(51);
    });

    it('reports a run of wheel events as one change, which ends once the wheel rests', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const onValueChangeStart = changeSpy();
      const onValueChangeEnd = changeSpy();
      const { control } = await setup({ defaultValue: 50, onValueChangeStart, onValueChangeEnd });
      await user.wheel(control, { y: -100 });
      await harness.advanceTime(200);
      await user.wheel(control, { y: -100 });
      await harness.advanceTime(200);
      expect(valuesOf(onValueChangeStart)).toStrictEqual([50]);
      expect(onValueChangeEnd).not.toHaveBeenCalled();
      await harness.advanceTime(100);
      expect(valuesOf(onValueChangeEnd)).toStrictEqual([60]);
    });
  });

  describe('keys', () => {
    it('steps with the keys of a slider, finer with Shift, each key a change of its own', async () => {
      const onValueChangeStart = changeSpy();
      const onValueChangeEnd = changeSpy();
      const { before, now } = await setup({
        defaultValue: 50,
        onValueChangeStart,
        onValueChangeEnd,
      });
      await tabTo(before);

      const steps: ReadonlyArray<readonly [string, number]> = [
        ['{ArrowUp}', 51],
        ['{ArrowRight}', 52],
        ['{ArrowDown}', 51],
        ['{ArrowLeft}', 50],
        ['{Shift>}{ArrowUp}{/Shift}', 50.1],
        ['{Shift>}{ArrowDown}{/Shift}', 50],
        ['{PageUp}', 60],
        ['{PageDown}', 50],
        ['{End}', 100],
        ['{Home}', 0],
      ];
      for (const [keys, value] of steps) {
        // oxlint-disable-next-line no-await-in-loop -- one key after the other.
        await user.keyboard(keys);
        expect(now()).toBe(value);
      }
      expect(valuesOf(onValueChangeStart)).toStrictEqual([
        50, 51, 52, 51, 50, 50.1, 50, 60, 50, 100,
      ]);
      expect(valuesOf(onValueChangeEnd)).toStrictEqual([51, 52, 51, 50, 50.1, 50, 60, 50, 100, 0]);

      // Other keys and shortcuts are the page's.
      await user.keyboard('{a}{Control>}{ArrowUp}{/Control}');
      expect(now()).toBe(0);
    });

    it('prevents the default of the keys it handles only', async () => {
      const { control, before } = await setup({ defaultValue: 50 });
      await tabTo(before);
      expect(harness.keyDown(control, 'ArrowUp')).toBe(true);
      expect(harness.keyDown(control, 'End')).toBe(true);
      expect(harness.keyDown(control, 'Shift', { shiftKey: true })).toBe(false);
      expect(harness.keyDown(control, 'a')).toBe(false);
      expect(harness.keyDown(control, 'ArrowUp', { metaKey: true })).toBe(false);
    });

    it('takes a step of the knob at least', async () => {
      const { before, now } = await setup({ min: 0, max: 10, step: 2.5, defaultValue: 5 });
      await tabTo(before);
      await user.keyboard('{ArrowUp}');
      expect(now()).toBe(7.5);
      await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
      expect(now()).toBe(5);
    });
  });

  describe('double press', () => {
    it('resets the value at its second press, which starts no drag', async () => {
      const onValueChangeStart = changeSpy();
      const onValueChangeEnd = changeSpy();
      const { control, before, api, renders, now } = await setup({
        defaultValue: 25,
        onValueChangeStart,
        onValueChangeEnd,
      });
      await tabTo(before);
      await user.keyboard('{End}');
      expect(now()).toBe(100);
      const rendered = renders.length;

      await user.doublePress(control);
      await expect.poll(() => now()).toBe(25);
      // Two changes: the first press, a drag that goes nowhere, and the reset of the second.
      expect(valuesOf(onValueChangeStart)).toStrictEqual([25, 100, 100]);
      expect(valuesOf(onValueChangeEnd)).toStrictEqual([100, 100, 25]);
      // Only the first press dragged.
      expect(changesOf(renders.slice(rendered), 'dragging')).toStrictEqual([false, true, false]);
      expect(api().dragging).toBe(false);
    });
  });

  describe('focus and hover', () => {
    it('shows the focus Tab gives, not the focus of a press, until a key is pressed', async () => {
      const { control, before, api } = await setup({ defaultValue: 50 });
      await tabTo(before);
      expect(harness.hasFocus(control)).toBe(true);
      await expect.poll(() => harness.focusVisible(control)).toBe(true);
      expect(api()).toMatchObject({ focused: true, focusVisible: true });
      // Tab takes the focus on, and the knob shows none.
      await user.tab();
      expect(harness.hasFocus(control)).toBe(false);
      expect(api()).toMatchObject({ focused: false, focusVisible: false });

      await user.press(control);
      expect(harness.hasFocus(control)).toBe(true);
      expect(harness.focusVisible(control)).toBe(false);
      expect(api()).toMatchObject({ focused: true, focusVisible: false });
      await user.keyboard('{ArrowUp}');
      await expect.poll(() => api().focusVisible).toBe(true);
      expect(harness.focusVisible(control)).toBe(true);
    });

    it('is hovered while a mouse is over the control', async () => {
      const { control, api } = await setup();
      await user.unhover(control);
      await expect.poll(() => api().hovered).toBe(false);
      await user.hover(control);
      await expect.poll(() => api().hovered).toBe(true);
      await user.unhover(control);
      await expect.poll(() => api().hovered).toBe(false);
    });

    it('gives up its focus when it turns disabled, and takes it again once enabled', async () => {
      const { control, before, api, rerender } = await setup({ defaultValue: 50 });
      await tabTo(before);
      expect(harness.hasFocus(control)).toBe(true);
      await rerender({ defaultValue: 50, disabled: true });
      await expect.poll(() => harness.hasFocus(control)).toBe(false);
      expect(semantics(control).disabled).toBe(true);
      await expect.poll(() => api()).toMatchObject({ focused: false, focusVisible: false });

      // Enabled again, it shows the focus it has, which the platform took away.
      await rerender({ defaultValue: 50 });
      expect(harness.hasFocus(control)).toBe(false);
      expect(api()).toMatchObject({ focused: false, focusVisible: false });
      await tabTo(before);
      expect(harness.hasFocus(control)).toBe(true);
      await expect.poll(() => api()).toMatchObject({ focused: true, focusVisible: true });
    });
  });

  describe('disabled and read-only', () => {
    it('ignores the user and takes no focus while disabled; the wheel scrolls what is around', async () => {
      const onValueChange = changeSpy();
      const { control, before, after, api, now } = await setup({
        disabled: true,
        defaultValue: 40,
        onValueChange,
      });
      expect(semantics(control).disabled).toBe(true);

      await user.drag(control, -100);
      await user.doublePress(control);
      expect(harness.hasFocus(control)).toBe(false);
      expect(await user.wheel(control, { y: 200 })).toBe(false);
      await user.hover(control);
      expect(api().hovered).toBe(false);
      // Tab passes it by.
      await tabTo(before);
      expect(harness.hasFocus(after)).toBe(true);

      expect(now()).toBe(40);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('shows the value but ignores the user while read-only, and still takes focus', async () => {
      const onValueChange = changeSpy();
      const onValueChangeStart = changeSpy();
      const { control, api, renders, now } = await setup({
        readOnly: true,
        defaultValue: 40,
        onValueChange,
        onValueChangeStart,
      });

      await user.drag(control, -100);
      expect(harness.hasFocus(control)).toBe(true);
      expect(changesOf(renders, 'dragging')).toStrictEqual([false]);
      await user.keyboard('{ArrowUp}{End}');
      expect(await user.wheel(control, { y: -100 })).toBe(false);
      await user.doublePress(control);
      // Nothing to turn: the pointer over it is no hover.
      await user.hover(control);
      expect(api().hovered).toBe(false);

      expect(now()).toBe(40);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(onValueChangeStart).not.toHaveBeenCalled();
    });
  });

  describe('value', () => {
    it('follows a controlled value', async () => {
      const onValueChange = changeSpy();
      await harness.render(<Controlled onValueChange={onValueChange} />);
      const control = getByRole('slider', { name: 'Gain' });
      await tabTo(getByRole('button', { name: 'Before' }));

      await user.keyboard('{ArrowUp}');
      await expect.poll(() => semantics(control).value.now).toBe(11);
      await user.press(getByRole('button', { name: 'Seventy-five' }));
      await expect.poll(() => semantics(control).value.now).toBe(75);
      // A new value from the owner is no change of the user's.
      expect(valuesOf(onValueChange)).toStrictEqual([11]);
    });

    it('reports a controlled change and waits for the owner to take it', async () => {
      const onValueChange = changeSpy();
      const { control, now } = await setup({ value: 30, onValueChange });
      await user.drag(control, -40);
      await expect.poll(() => valuesOf(onValueChange).at(-1)).toBe(50);
      expect(now()).toBe(30);
    });

    it('sets the value from code through the context, read-only or not', async () => {
      await harness.render(
        <Knob.Root readOnly>
          <Knob.Control aria-label="Mix" />
          <HalfButton />
        </Knob.Root>,
      );
      await user.press(getByRole('button', { name: 'Half' }));
      await expect.poll(() => semantics(getByRole('slider', { name: 'Mix' })).value.now).toBe(50);
    });
  });
});
