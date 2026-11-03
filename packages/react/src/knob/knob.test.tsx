/*
 * The styled Knob on every platform: one file, run in Chromium (`react`) and on Soundor's
 * simulated runtime (`react:soundor`) through the test harness. Its parts keep the behavior of
 * the headless Knob they style; how they look is a test of each platform (`knob.web.test.tsx`,
 * `knob.soundor.test.tsx`), and the behavior itself is tested with the headless parts.
 */
import { formatDecibels } from '@contour-ui/headless';
import { harness } from '@contour-ui/test-harness';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import * as Knob from './index.ts';

const { drawing, getByRole, hasText, readsText, semantics, user } = harness;

/** A labelled knob with the default dial and a readout. */
function Gain(props: Knob.RootProps): ReactElement {
  return (
    <Knob.Root min={-60} max={12} defaultValue={-6} formatValue={formatDecibels} {...props}>
      <Knob.Label>Gain</Knob.Label>
      <Knob.Control />
      <Knob.ValueText />
      <Knob.HiddenInput />
    </Knob.Root>
  );
}

/** The kinds of the shapes the dial of the slider `name` draws, in order. */
const shapesOf = (name: string): string[] =>
  drawing(getByRole('slider', { name })).shapes.map(({ type }) => type);

describe('Knob', () => {
  it('is a slider named by its label, with its value and the text of it', async () => {
    await harness.render(<Gain />);

    expect(semantics(getByRole('slider', { name: 'Gain' }))).toMatchObject({
      role: 'slider',
      name: 'Gain',
      value: { min: -60, max: 12, now: -6, text: formatDecibels(-6) },
      disabled: false,
    });
  });

  it('draws the track, the range and the thumb unless given shapes of its own', async () => {
    await harness.render(
      <>
        <Gain />
        <Knob.Root>
          <Knob.Control aria-label="Own">
            <Knob.Range />
          </Knob.Control>
        </Knob.Root>
      </>,
    );
    expect(shapesOf('Gain')).toStrictEqual(['path', 'path', 'line']);
    expect(shapesOf('Own')).toStrictEqual(['path']);
  });

  it('shows the readout, which assistive technology reads with the control alone', async () => {
    await harness.render(<Gain />);

    expect(hasText(formatDecibels(-6))).toBe(true);
    expect(readsText(formatDecibels(-6))).toBe(false);
  });

  it('turns with the keys, and its readout follows', async () => {
    await harness.render(<Gain step={1} />);
    const control = getByRole('slider', { name: 'Gain' });

    await user.tab();
    await user.keyboard('{ArrowUp}');

    expect(semantics(control).value.now).toBe(-5);
    expect(hasText(formatDecibels(-5))).toBe(true);
  });

  it('is disabled to assistive technology while disabled', async () => {
    await harness.render(<Gain disabled />);

    expect(semantics(getByRole('slider', { name: 'Gain' })).disabled).toBe(true);
  });
});
