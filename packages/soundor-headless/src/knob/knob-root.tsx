import { View } from '@soundor/react';
import type { ViewProps } from '@soundor/react';
import type { ReactElement } from 'react';

import { KnobContext } from './knob-context.ts';
import { useKnob } from './use-knob.ts';
import type { UseKnobProps } from './use-knob.ts';

export interface KnobRootProps extends UseKnobProps, Omit<ViewProps, keyof UseKnobProps> {}

/**
 * Knob root: a `View` that runs the knob machine and gives its parts the state.
 *
 * @example
 * <Knob.Root min={20} max={20000} scale="log" defaultValue={1000} formatValue={formatFrequency}>
 *   <Knob.Label>Cutoff</Knob.Label>
 *   <Knob.Control width={40} height={40}>
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
  });
  return (
    <KnobContext value={api}>
      <View {...props} />
    </KnobContext>
  );
}
