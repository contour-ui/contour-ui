import type { UseKnobReturn } from '@contour-ui/soundor-headless';
import { soundorTokens } from '@contour-ui/tokens/soundor';
import type { Style } from '@soundor/react';
import { Circle } from '@soundor/react/svg';
import { fireEvent, render, screen, userEvent } from '@soundor/testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { Button, formatFrequency, Knob } from '../index.ts';
import { ThemeProvider } from '../theme-provider/theme-provider.tsx';

const { dark, light } = soundorTokens;

type Node = ReturnType<typeof screen.getByRole>;

/** The focus ring: an outline outside the dial, as far out as it is wide, as on the web. */
const RING = {
  outlineWidth: dark['border-width'].focus,
  outlineColor: dark.color.border.focus,
  outlineOffset: dark['border-width'].focus,
};

/** A labelled knob with the default dial. */
function Gain(props: Knob.RootProps): ReactElement {
  return (
    <Knob.Root defaultValue={50} {...props}>
      <Knob.Label>Gain</Knob.Label>
      <Knob.Control />
      <Knob.ValueText />
    </Knob.Root>
  );
}

const control = (): Node => screen.getByRole('adjustable', { name: 'Gain' });

/** A style function: no pointer while the knob drags. */
const dragCursor = (knob: UseKnobReturn): Style => ({ cursor: knob.dragging ? 'none' : 'pointer' });

/** The colors the dial draws its track, its range and its thumb in. */
const colorsOf = (node: Node) =>
  (node.svgScene?.children ?? []).map((shape) => shape.presentation?.color);

describe('Knob', () => {
  it('is a column of the label, the dial and the readout, a control gap apart', async () => {
    const { container } = await render(<Gain />);
    const root = container.children[0];
    expect(root?.style).toMatchObject({
      flexDirection: 'column',
      alignItems: 'center',
      gap: dark.space['control-gap'],
    });
    expect(root?.children).toHaveLength(3);
  });

  it.each([
    ['sm', dark.size['knob-sm']],
    ['md', dark.size['knob-md']],
    ['lg', dark.size['knob-lg']],
  ] as const)('draws the %s dial as wide as its size token, round', async (size, diameter) => {
    await render(<Gain size={size} />);
    expect(control().style).toMatchObject({
      width: diameter,
      height: diameter,
      borderRadius: dark.radius.round,
    });
  });

  it('is md by default', async () => {
    await render(<Gain />);
    expect(control().style).toMatchObject({ width: dark.size['knob-md'] });
  });

  it('draws the track, the range and the thumb of the dial in their colors', async () => {
    await render(<Gain />);
    expect(control().svgScene?.children.map((shape) => shape.type)).toEqual([
      'path',
      'path',
      'line',
    ]);
    expect(colorsOf(control())).toEqual([
      dark.color.border.default,
      dark.color.accent.fill,
      dark.color.fg.default,
    ]);
  });

  it('sets the label and the readout in their text styles', async () => {
    await render(
      <Gain defaultValue={1000} formatValue={formatFrequency} min={20} max={20_000} scale="log" />,
    );
    expect(screen.getByText('Gain').style).toMatchObject({
      ...dark.text.label,
      color: dark.color.fg.muted,
    });
    const readout = screen.getByText(formatFrequency(1000));
    expect(readout.style).toMatchObject({ ...dark.text.value, color: dark.color.fg.default });
  });

  it('brightens the range while the dial is hovered or dragged', async () => {
    const user = userEvent.setup();
    await render(<Gain />);
    const dial = control();
    await user.pointer({ target: dial });
    expect(colorsOf(dial)[1]).toBe(dark.color.accent['fill-hover']);
    await user.pointer({ target: screen.getByText('Gain') });
    expect(colorsOf(dial)[1]).toBe(dark.color.accent.fill);
    fireEvent.pointerDown(dial);
    expect(colorsOf(dial)[1]).toBe(dark.color.accent['fill-hover']);
    fireEvent.pointerUp(dial);
    expect(colorsOf(dial)[1]).toBe(dark.color.accent.fill);
  });

  it('takes the resize pointer, and the default one while it cannot turn', async () => {
    const { rerender } = await render(<Gain />);
    expect(control().style).toMatchObject({ cursor: 'ns-resize' });
    await rerender(<Gain readOnly />);
    expect(control().style).toMatchObject({ cursor: 'default' });
    await rerender(<Gain disabled />);
    expect(control().style).toMatchObject({ cursor: 'default' });
  });

  it('keeps the colors of a read-only knob under the pointer', async () => {
    const user = userEvent.setup();
    await render(<Gain readOnly />);
    await user.pointer({ target: control() });
    expect(colorsOf(control())[1]).toBe(dark.color.accent.fill);
  });

  it('draws a disabled knob in the disabled colors', async () => {
    await render(<Gain disabled />);
    expect(colorsOf(control())).toEqual([
      dark.color.border.subtle,
      dark.color.fg.disabled,
      dark.color.fg.disabled,
    ]);
    expect(screen.getByText('Gain').style).toMatchObject({ color: dark.color.fg.disabled });
    expect(screen.getByText('50').style).toMatchObject({ color: dark.color.fg.disabled });
  });

  it('shows its focus ring when focused from the keyboard, not when pressed', async () => {
    const user = userEvent.setup();
    await render(
      <>
        <Gain />
        <Button>Other</Button>
      </>,
    );
    const dial = control();
    await user.tab();
    expect(dial.style).toMatchObject(RING);
    // The ring takes no node: the dial draws only its shapes.
    expect(dial.children).toHaveLength(0);
    await user.tab();
    await user.click(dial);
    expect(dial).toHaveFocus();
    expect(dial.style).not.toHaveProperty('outlineWidth');
    await user.keyboard('{ArrowUp}');
    expect(dial.style).toMatchObject(RING);
  });

  it('passes the knob to a style function, whose styles win over its own', async () => {
    await render(
      <Knob.Root defaultValue={50}>
        <Knob.Label style={(knob) => ({ opacity: knob.value / 100 })}>Gain</Knob.Label>
        <Knob.Control style={dragCursor} />
        <Knob.ValueText style={{ color: '#ff0000' }} />
      </Knob.Root>,
    );
    const dial = control();
    expect(dial.style).toMatchObject({ cursor: 'pointer' });
    fireEvent.pointerDown(dial);
    expect(dial.style).toMatchObject({ cursor: 'none' });
    fireEvent.pointerUp(dial);
    expect(screen.getByText('Gain').style).toMatchObject({ opacity: 0.5 });
    expect(screen.getByText('50').style).toMatchObject({ color: '#ff0000' });
  });

  it('draws shapes of your own in place of the dial, and colors of your own', async () => {
    await render(
      <>
        <Knob.Root>
          <Knob.Control accessibilityLabel="Own">
            <Circle cx={50} cy={50} r={40} fill="none" stroke="currentColor" />
          </Knob.Control>
        </Knob.Root>
        <Knob.Root>
          <Knob.Control accessibilityLabel="Colored">
            <Knob.Track color="#00ff00" />
          </Knob.Control>
        </Knob.Root>
      </>,
    );
    expect(
      screen.getByRole('adjustable', { name: 'Own' }).svgScene?.children.map(({ type }) => type),
    ).toEqual(['circle']);
    expect(colorsOf(screen.getByRole('adjustable', { name: 'Colored' }))).toEqual(['#00ff00']);
  });

  it('draws with the token values of the theme', async () => {
    await render(
      <ThemeProvider defaultTheme="light">
        <Gain />
      </ThemeProvider>,
    );
    expect(colorsOf(control())).toEqual([
      light.color.border.default,
      light.color.accent.fill,
      light.color.fg.default,
    ]);
  });
});
