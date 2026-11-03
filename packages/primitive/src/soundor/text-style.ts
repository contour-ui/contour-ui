import type { StyleProp } from '@soundor/react';
import { createContext } from 'react';
import type { Context } from 'react';

/**
 * The ambient text style: the `textStyle` of the nearest box or pressable that gives one, with
 * the ones above it underneath (a nearer one wins, per property, as CSS inherits text styles).
 * The runs of text a box wraps and every `Primitive.text` take it before their own `style`:
 * native text inherits nothing from the views around it, so the label style of a button reaches
 * its label this way.
 */
export const TextStyleContext: Context<StyleProp> = createContext<StyleProp>(undefined);

/** `own` over `inherited`, or whichever is given. */
export function mergeTextStyles(inherited: StyleProp, own: StyleProp | undefined): StyleProp {
  if (own === undefined || own === null || own === false) {
    return inherited;
  }
  return inherited === undefined || inherited === null || inherited === false
    ? own
    : [inherited, own];
}
