'use client';

import { mergeProps, Primitive } from '@contour-ui/primitive';
import type { PrimitiveProps } from '@contour-ui/primitive';
import type { ReactElement } from 'react';

import { KnobContext } from './knob-context.ts';
import { useKnob } from './use-knob.ts';
import type { UseKnobProps } from './use-knob.ts';

export interface KnobRootProps
  extends UseKnobProps, Omit<PrimitiveProps<'div'>, keyof UseKnobProps> {}

/**
 * Knob root: a `div` (a `View` on native platforms) that runs the knob machine and gives its
 * parts the state. On the web it carries the position of the value as `--knob-position` (0 to 1)
 * and its angle as `--knob-angle` (from `-135deg` to `135deg`, clockwise from the top), for a
 * dial of your own; elsewhere read `position` and `angle` from `useKnobContext()`.
 *
 * @example
 * <Knob.Root min={20} max={20000} scale="log" defaultValue={1000} formatValue={formatFrequency}>
 *   <Knob.Label>Cutoff</Knob.Label>
 *   <Knob.Control>
 *     <Knob.Track />
 *     <Knob.Range />
 *     <Knob.Thumb />
 *   </Knob.Control>
 *   <Knob.ValueText />
 * </Knob.Root>
 */
export function KnobRoot({
  value,
  defaultValue,
  onValueChange,
  onValueChangeStart,
  onValueChangeEnd,
  min,
  max,
  step,
  scale,
  origin,
  disabled,
  readOnly,
  formatValue,
  dragDistance,
  pointerLock,
  name,
  form,
  ...props
}: KnobRootProps): ReactElement {
  const api = useKnob({
    value,
    defaultValue,
    onValueChange,
    onValueChangeStart,
    onValueChangeEnd,
    min,
    max,
    step,
    scale,
    origin,
    disabled,
    readOnly,
    formatValue,
    dragDistance,
    pointerLock,
    name,
    form,
  });
  return (
    <KnobContext value={api}>
      <Primitive.div {...mergeProps(api.getRootProps(), props)} />
    </KnobContext>
  );
}
