import { Knob as Headless, useKnobContext } from '@contour-ui/soundor-headless';
import type { UseKnobReturn } from '@contour-ui/soundor-headless';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';
import type { Style } from '@soundor/react';
import { use } from 'react';
import type { ReactElement } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';
import { focusRingStyle } from '../utils/focus-ring.ts';
import { KnobRange } from './knob-range.tsx';
import { KnobSizeContext, resolveStyle } from './knob-style.ts';
import type { KnobSize, KnobStyleProp } from './knob-style.ts';
import { KnobThumb } from './knob-thumb.tsx';
import { KnobTrack } from './knob-track.tsx';

export interface KnobControlProps extends Omit<Headless.ControlProps, 'style'> {
  /** Styles after the dial's own, or a function of the knob that returns them. */
  readonly style?: KnobStyleProp | undefined;
}

const DIAMETER = { sm: 'knob-sm', md: 'knob-md', lg: 'knob-lg' } as const;

function controlStyle(tokens: SoundorTokens, size: KnobSize, knob: UseKnobReturn): Style {
  const diameter = tokens.size[DIAMETER[size]];
  return {
    width: diameter,
    height: diameter,
    flexShrink: 0,
    // Round, so the focus ring is a circle around the dial.
    borderRadius: tokens.radius.round,
    // Nothing to turn: a disabled or a read-only knob takes the default pointer.
    cursor: knob.disabled || knob.readOnly ? 'default' : 'ns-resize',
  };
}

/**
 * Knob control: the round dial, as large as the size of the root, which takes focus and the
 * input. Without children, it draws the track, the range and the thumb; give it children to draw
 * shapes of your own in its `0 0 100 100` view box.
 */
export function KnobControl({ style, children, ...props }: KnobControlProps): ReactElement {
  const tokens = useTokens();
  const size = use(KnobSizeContext);
  const knob = useKnobContext();
  return (
    <Headless.Control
      {...props}
      style={[
        controlStyle(tokens, size, knob),
        // As `:focus-visible` on the web: a key gave the focus, or was pressed since a press did.
        knob.focusVisible && focusRingStyle(tokens),
        resolveStyle(style, knob),
      ]}
    >
      {children ?? (
        <>
          <KnobTrack />
          <KnobRange />
          <KnobThumb />
        </>
      )}
    </Headless.Control>
  );
}
