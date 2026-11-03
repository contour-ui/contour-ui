import { vars } from '@contour-ui/tokens';
import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { formatDecibels, formatFrequency, Knob, logScale } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** The element of a part, inside `container`. */
function part(container: Element, name: string): Element {
  const element = container.querySelector(`[data-scope="knob"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No knob ${name}.`);
  }
  return element;
}

/** The root of the knob of a control. */
function rootOf(control: Element): Element {
  const root = control.closest('.contour-knob');
  if (root === null) {
    throw new Error('No knob root.');
  }
  return root;
}

/** The shapes inside a control, in order: a part by its name, any other by its tag. */
function shapesOf(control: Element): string[] {
  return [...control.children].map((child) =>
    child instanceof SVGElement ? (child.dataset['part'] ?? child.localName) : child.localName,
  );
}

/** The computed color of a part. */
const colorOf = (container: Element, name: string): string =>
  getComputedStyle(part(container, name)).color;

const sizes = [
  ['sm', vars.size['knob-sm']],
  ['md', vars.size['knob-md']],
  ['lg', vars.size['knob-lg']],
] as const;

/** A labelled knob with a readout. */
function Gain(props: Knob.RootProps) {
  return (
    <Knob.Root min={-60} max={12} defaultValue={-6} formatValue={formatDecibels} {...props}>
      <Knob.Label>Gain</Knob.Label>
      <Knob.Control />
      <Knob.ValueText />
    </Knob.Root>
  );
}

describe('Knob', () => {
  it('renders the classes, the resolved size and a dial as wide as its token', async () => {
    const screen = await render(
      <>
        {sizes.map(([size]) => (
          <Knob.Root key={size} size={size}>
            <Knob.Label>{size}</Knob.Label>
            <Knob.Control />
            <Knob.ValueText />
            <Knob.HiddenInput />
          </Knob.Root>
        ))}
        <Knob.Root>
          <Knob.Control aria-label="default" />
        </Knob.Root>
      </>,
    );
    for (const [size, token] of sizes) {
      const control = screen.getByRole('slider', { name: size }).element();
      const root = control.closest('.contour-knob');
      expect(root).toHaveAttribute('data-size', size);
      expect(control).toHaveClass('contour-knob__control');
      const style = getComputedStyle(control);
      expect(style.inlineSize).toBe(computed('inline-size', token));
      expect(style.blockSize).toBe(computed('block-size', token));
    }
    const root = screen.getByRole('slider', { name: 'default' }).element().closest('.contour-knob');
    expect(root).toHaveAttribute('data-size', 'md');

    const first = rootOf(screen.getByRole('slider', { name: 'sm' }).element());
    expect(part(first, 'label')).toHaveClass('contour-knob__label');
    expect(part(first, 'track')).toHaveClass('contour-knob__track');
    expect(part(first, 'range')).toHaveClass('contour-knob__range');
    expect(part(first, 'thumb')).toHaveClass('contour-knob__thumb');
    expect(part(first, 'value-text')).toHaveClass('contour-knob__value-text');
    expect(part(first, 'hidden-input')).toHaveClass('contour-knob__hidden-input');
  });

  it('draws the track, the range and the thumb unless given shapes of its own', async () => {
    const screen = await render(
      <>
        <Knob.Root defaultValue={50}>
          <Knob.Control aria-label="Default dial" />
        </Knob.Root>
        <Knob.Root defaultValue={50}>
          <Knob.Control aria-label="Own dial">
            <Knob.Range />
            <circle cx={50} cy={50} r={10} />
          </Knob.Control>
        </Knob.Root>
      </>,
    );
    const own = screen.getByRole('slider', { name: 'Own dial' }).element();

    expect(shapesOf(screen.getByRole('slider', { name: 'Default dial' }).element())).toStrictEqual([
      'track',
      'range',
      'thumb',
    ]);
    expect(shapesOf(own)).toStrictEqual(['range', 'circle']);
  });

  it('colors the track, the range and the thumb, and brightens the range under the pointer', async () => {
    const screen = await render(<Gain />);
    const control = screen.getByRole('slider', { name: 'Gain' });
    const { container } = screen;
    await userEvent.unhover(control);

    expect(colorOf(container, 'track')).toBe(computed('color', vars.color.border.default));
    expect(colorOf(container, 'range')).toBe(computed('color', vars.color.accent.fill));
    expect(colorOf(container, 'thumb')).toBe(computed('color', vars.color.fg.default));
    expect(colorOf(container, 'label')).toBe(computed('color', vars.color.fg.muted));
    expect(colorOf(container, 'value-text')).toBe(computed('color', vars.color.fg.default));
    const style = getComputedStyle(control.element());
    expect(style.cursor).toBe('ns-resize');
    expect(style.touchAction).toBe('none');
    expect(style.borderTopLeftRadius).toBe(computed('border-top-left-radius', vars.radius.round));

    await userEvent.hover(control);
    await expect
      .poll(() => colorOf(container, 'range'))
      .toBe(computed('color', vars.color.accent['fill-hover']));
  });

  it('keeps the range bright while it drags', async () => {
    const screen = await render(<Gain />);
    const control = screen.getByRole('slider', { name: 'Gain' });
    await userEvent.unhover(control);

    control
      .element()
      .dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse' }),
      );
    await expect.element(control).toHaveAttribute('data-dragging', '');
    await expect
      .poll(() => colorOf(screen.container, 'range'))
      .toBe(computed('color', vars.color.accent['fill-hover']));
    control
      .element()
      .dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'mouse' }),
      );
    await expect.element(control).not.toHaveAttribute('data-dragging');
  });

  it('sets the label in the label style and the readout in the monospace value style', async () => {
    const screen = await render(<Gain />);
    const label = getComputedStyle(part(screen.container, 'label'));
    const value = getComputedStyle(part(screen.container, 'value-text'));

    expect(label.fontSize).toBe(computed('font-size', vars.text.label.fontSize));
    expect(label.fontFamily).toBe(computed('font-family', vars.text.label.fontFamily));
    expect(value.fontFamily).toBe(computed('font-family', vars.text.value.fontFamily));
    expect(value.fontSize).toBe(computed('font-size', vars.text.value.fontSize));
    expect(part(screen.container, 'value-text')).toHaveTextContent('−6.0 dB');
  });

  it('greys out a disabled knob and gives it the default pointer', async () => {
    const screen = await render(<Gain disabled />);
    const { container } = screen;

    expect(colorOf(container, 'track')).toBe(computed('color', vars.color.border.subtle));
    for (const name of ['range', 'thumb', 'label', 'value-text']) {
      expect(colorOf(container, name)).toBe(computed('color', vars.color.fg.disabled));
    }
    expect(getComputedStyle(part(container, 'control')).cursor).toBe('default');
  });

  it('gives a read-only knob the default pointer and no hover', async () => {
    const screen = await render(<Gain readOnly />);
    const control = screen.getByRole('slider', { name: 'Gain' });

    await userEvent.hover(control);
    expect(getComputedStyle(control.element()).cursor).toBe('default');
    expect(colorOf(screen.container, 'range')).toBe(computed('color', vars.color.accent.fill));
  });

  it('shows the focus ring of a button around the dial, from the keyboard', async () => {
    const screen = await render(
      <>
        <button type="button">Before</button>
        <Gain />
      </>,
    );
    const control = screen.getByRole('slider', { name: 'Gain' });

    await userEvent.click(control);
    expect(getComputedStyle(control.element()).outlineStyle).toBe('none');
    await userEvent.click(page.getByRole('button', { name: 'Before' }));
    await userEvent.keyboard('{Tab}');
    await expect.element(control).toHaveAttribute('data-focus-visible', '');
    const style = getComputedStyle(control.element());
    expect(style.outlineColor).toBe(computed('color', vars.color.border.focus));
    expect(style.outlineWidth).toBe(computed('outline-width', vars['border-width'].focus));
    expect(style.outlineOffset).toBe(computed('outline-offset', vars['border-width'].focus));
  });

  it('passes axe with its colors, a disabled knob too: its readout is inactive text', async () => {
    const screen = await render(
      <div style={{ background: vars.color.bg.canvas, padding: vars.space['panel-inset'] }}>
        <Gain />
        <Gain disabled />
      </div>,
    );
    await expect
      .element(screen.getByRole('slider', { name: 'Gain' }).last())
      .toHaveAttribute('aria-disabled', 'true');
    await expectNoAxeViolations();
  });

  it('re-exports the readouts and scales of value controls', () => {
    expect(formatFrequency(1250)).toBe('1.25 kHz');
    expect(logScale.toPosition(200, 20, 2000)).toBeCloseTo(0.5);
  });
});
