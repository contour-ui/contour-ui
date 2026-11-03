'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless } from '@contour-ui/headless-react';
import { mergeProps } from '@contour-ui/primitive';
import type { ReactElement } from 'react';

import { KnobSizeContext } from './knob-size.ts';
import { knobLook } from './knob.look.ts';
import type { KnobLookState, KnobSize } from './knob.look.ts';

export interface KnobRootProps extends Headless.RootProps {
  /**
   * The diameter of the dial: `sm`, `md` or `lg`, the `size.knob-*` tokens
   * (`--ct-size-knob-*` on the web).
   *
   * @defaultValue 'md'
   */
  readonly size?: KnobSize | undefined;
}

/**
 * The state the look of the root is given: the root's look depends on its size alone, and the
 * knob's state is only known below it.
 */
const ROOT_STATE: KnobLookState = Object.freeze({
  disabled: false,
  readOnly: false,
  dragging: false,
  hovered: false,
  focusVisible: false,
});

/**
 * Knob root: a rotary control for audio-plugin UIs, a column of its label, its dial and its value
 * readout. Runs the knob of `@contour-ui/headless-react`: drag up or down (Shift for fine
 * moves), turn the wheel, use the arrow keys, or double-press to reset. Name it with
 * `Knob.Label`, or `aria-label` on `Knob.Control`. On Soundor it draws with the token values of
 * the theme.
 *
 * @example
 * <Knob.Root min={-60} max={12} defaultValue={0} step={0.1} formatValue={formatDecibels}>
 *   <Knob.Label>Gain</Knob.Label>
 *   <Knob.Control />
 *   <Knob.ValueText />
 * </Knob.Root>
 */
export function KnobRoot({ size = 'md', ...props }: KnobRootProps): ReactElement {
  const { root } = useStyles(knobLook, { size }, ROOT_STATE);
  return (
    <KnobSizeContext value={size}>
      <Headless.Root {...mergeProps(root, props)} />
    </KnobSizeContext>
  );
}
