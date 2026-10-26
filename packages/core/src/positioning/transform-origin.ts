import type { Placement } from './positioning.types.ts';

/**
 * The edge of the floating element next to its reference, for each placement: the opposite side,
 * then the aligned edge, or the middle of the side when the placement is centered.
 */
const ORIGINS: { readonly [P in Placement]: string } = {
  top: 'bottom center',
  'top-start': 'bottom left',
  'top-end': 'bottom right',
  right: 'left center',
  'right-start': 'left top',
  'right-end': 'left bottom',
  bottom: 'top center',
  'bottom-start': 'top left',
  'bottom-end': 'top right',
  left: 'right center',
  'left-start': 'right top',
  'left-end': 'right bottom',
};

/**
 * The origins that change in right-to-left text, where the start edge of `top` and `bottom` is
 * the right one. The start edge of `left` and `right` stays the top one.
 */
const RTL_ORIGINS: { readonly [P in Placement]?: string } = {
  'top-start': 'bottom right',
  'top-end': 'bottom left',
  'bottom-start': 'top right',
  'bottom-end': 'top left',
};

/**
 * The CSS `transform-origin` of a floating element at `placement`: its edge next to the
 * reference, where a scale animation grows from (`top left` for `bottom-start`).
 */
export function getTransformOrigin(placement: Placement, rtl: boolean): string {
  return (rtl ? RTL_ORIGINS[placement] : undefined) ?? ORIGINS[placement];
}
