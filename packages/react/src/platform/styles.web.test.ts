import { useStyles as webStyles } from '#platform/styles';
import { PLATFORM, RESTING_INTERACTION } from '@contour-ui/primitive';
import type { InteractionState } from '@contour-ui/primitive';
import { describe, expect, it } from 'vite-plus/test';

import type { Look } from '../utils/look.ts';

/** A look whose native half must never run on the web. */
const look: Look<'root', { readonly tone: 'neutral' | 'accent' }, InteractionState> = {
  web: ({ tone }, { hovered }) => ({
    root: { className: 'probe', 'data-tone': tone, 'data-hovered': hovered ? '' : undefined },
  }),
  native: () => {
    throw new Error('The web build runs the web half of a look only.');
  },
};

describe('useStyles', () => {
  it('reads the web build of the platform modules and of the element layer', () => {
    expect(PLATFORM).toBe('web');
  });

  // Called outside React: a hook would throw here, and a server component could not call it.
  it('gives the classes and data attributes of the web half, as a pure function', () => {
    expect(webStyles(look, { tone: 'accent' }, RESTING_INTERACTION)).toStrictEqual({
      root: { className: 'probe', 'data-tone': 'accent', 'data-hovered': undefined },
    });
    expect(webStyles(look, { tone: 'neutral' }, { ...RESTING_INTERACTION, hovered: true })).toEqual(
      { root: { className: 'probe', 'data-tone': 'neutral', 'data-hovered': '' } },
    );
  });
});
