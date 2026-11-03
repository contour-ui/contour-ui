/*
 * The looks of the styled components: what each part of a component looks like, once per
 * platform. On the web a look names the classes and the data attributes the stylesheet of the
 * package selects a part by; on native platforms it builds the part's style objects from the
 * token values of the theme. A component reads its look through `useStyles` of the styles
 * platform module, which runs the half of its platform. A look module imports no renderer and no
 * token values, only their types, so the web bundle never carries the values of Soundor.
 */
import type { NativeStyle } from '@contour-ui/primitive';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';

/** What a look gives a part on the web: its class, and the data attributes its stylesheet reads. */
export interface WebPartLook {
  /** `contour-<component>` on the root, `contour-<component>__<part>` on the other parts. */
  readonly className: string;
  /** The variants and sizes the stylesheet selects (`data-variant`, `data-size`), and the like. */
  readonly [attribute: `data-${string}`]: string | undefined;
}

/**
 * What a look gives a part on native platforms, by the kind of its element. A key the part does
 * not need is left out, never `undefined`: no `undefined` reaches a native prop.
 */
export interface NativePartLook {
  /** The style of a node: a box, a pressable, a text or the `svg` of a dial. */
  readonly style?: NativeStyle;
  /**
   * The style of the text a box or a pressable holds: its strings, and every `Primitive.text`
   * below it, take it before their own (native platforms have no inherited text styles).
   */
  readonly textStyle?: NativeStyle;
  /** The color a shape strokes or fills in: its `currentColor`. */
  readonly color?: string;
}

/** The web half of a look: a {@link WebPartLook} for each part. */
export type WebLook<Part extends string> = { readonly [Name in Part]: WebPartLook };

/** The native half of a look: a {@link NativePartLook} for each part. */
export type NativeLook<Part extends string> = { readonly [Name in Part]: NativePartLook };

/**
 * The look of a component, one half per platform. Both halves take the same options (variants,
 * sizes, flags such as `disabled`) and the same state, and give each part what its platform
 * styles it with. A web half returns the classes and data attributes of today's stylesheet and
 * ignores what CSS reads by itself (`:hover`, `:focus-visible`); a native half builds the styles
 * from the token values it is given, the state included.
 *
 * @example
 * const badgeLook: Look<'root', { tone: 'neutral' | 'accent' }, InteractionState> = {
 *   web: ({ tone }) => ({ root: { className: 'contour-badge', 'data-tone': tone } }),
 *   native: ({ color }, { tone }) => ({
 *     root: { style: { backgroundColor: tone === 'accent' ? color.accent.fill : color.bg.hover } },
 *   }),
 * };
 */
export interface Look<Part extends string, Options, State> {
  /** The web half: classes and data attributes, a pure function of the options and the state. */
  readonly web: (options: Options, state: State) => WebLook<Part>;
  /** The native half: styles from the token values of the theme, the options and the state. */
  readonly native: (tokens: SoundorTokens, options: Options, state: State) => NativeLook<Part>;
}

/**
 * The focus ring of a control on native platforms, as the web draws it (`outline:
 * border-width.focus solid border.focus`, `outline-offset: border-width.focus`): an outline
 * outside the border, following its corners, taking no room in the layout. A native half puts it
 * in a control's style while the state says `focusVisible`.
 *
 * @example
 * style: { ...rootStyle(tokens), ...(state.focusVisible ? focusRingStyle(tokens) : undefined) }
 */
export function focusRingStyle(tokens: SoundorTokens): NativeStyle {
  const width = tokens['border-width'].focus;
  return {
    outlineWidth: width,
    outlineColor: tokens.color.border.focus,
    outlineOffset: width,
  };
}
