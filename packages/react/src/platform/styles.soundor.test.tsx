import { useStyles } from '#platform/styles';
import { PLATFORM, RESTING_INTERACTION } from '@contour-ui/primitive';
import type { InteractionState } from '@contour-ui/primitive';
import { soundorTokens } from '@contour-ui/tokens/soundor';
import { Text } from '@soundor/react';
import { render, screen } from '@soundor/testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { ThemeProvider } from '../theme-provider/theme-provider.soundor.tsx';
import type { Look } from '../utils/look.ts';

const { dark, light } = soundorTokens;

/** A look whose web half must never run on Soundor. */
const look: Look<'root', { readonly tone: 'neutral' | 'accent' }, InteractionState> = {
  web: () => {
    throw new Error('The Soundor build runs the native half of a look only.');
  },
  native: ({ color }, { tone }, { hovered }) => ({
    root: {
      style: {
        backgroundColor: tone === 'accent' ? color.accent.fill : color.bg.hover,
        opacity: hovered ? 0.5 : 1,
      },
    },
  }),
};

/** Renders the background color and the opacity the look gives its root. */
function Probe({ state }: { readonly state: InteractionState }): ReactElement {
  const { root } = useStyles(look, { tone: 'accent' }, state);
  return <Text>{`${root.style?.backgroundColor} ${root.style?.opacity}`}</Text>;
}

describe('useStyles', () => {
  it('reads the Soundor build of the platform modules and of the element layer', () => {
    expect(PLATFORM).toBe('soundor');
  });

  it('builds the native half with the token values of the default theme outside a provider', async () => {
    await render(<Probe state={RESTING_INTERACTION} />);
    expect(screen.getByText(`${dark.color.accent.fill} 1`)).toBeDefined();
  });

  it('builds it with the token values of the theme of the provider, and with the state', async () => {
    await render(
      <ThemeProvider defaultTheme="light">
        <Probe state={{ ...RESTING_INTERACTION, hovered: true }} />
      </ThemeProvider>,
    );
    expect(screen.getByText(`${light.color.accent.fill} 0.5`)).toBeDefined();
  });
});
