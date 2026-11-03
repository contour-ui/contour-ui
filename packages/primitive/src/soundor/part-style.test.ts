import { describe, expect, it, vi } from 'vite-plus/test';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import type { InteractionState } from '../shared/interaction.ts';
import { resolveStyle } from './part-style.ts';

describe('resolveStyle', () => {
  it('calls a style function with the state of the part', () => {
    const style = vi.fn<(state: InteractionState) => { readonly opacity: number }>(() => ({
      opacity: 0.5,
    }));
    const pressed = { ...RESTING_INTERACTION, pressed: true };

    expect(resolveStyle(style, pressed)).toStrictEqual({ opacity: 0.5 });
    expect(style).toHaveBeenCalledExactlyOnceWith(pressed);
  });

  it('passes styles as they are', () => {
    const styles = [{ opacity: 1 }, false] as const;

    expect(resolveStyle(styles, RESTING_INTERACTION)).toBe(styles);
    expect(resolveStyle(undefined, RESTING_INTERACTION)).toBeUndefined();
  });
});
