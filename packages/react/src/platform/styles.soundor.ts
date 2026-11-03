/*
 * The Soundor build of the styles platform module: a look builds the style objects of each part
 * from the token values of the theme (`ThemeProvider`, or the default theme outside one), the
 * options and the state, since Soundor has no stylesheets: no classes, no `:hover`, no inherited
 * text styles. Internal: public types never name it.
 */
import { useTokens } from '../theme-provider/use-theme.soundor.ts';
import type { Look, NativeLook } from '../utils/look.ts';

/** What {@link useStyles} gives each part: on Soundor, its styles and the color of a shape. */
export type Styles<Part extends string> = NativeLook<Part>;

/**
 * The look of the parts of a component: on Soundor, the styles of the native half of `look`,
 * built from the token values of the theme of the nearest `ThemeProvider`.
 *
 * @example
 * const look = useStyles(buttonLook, { variant, size, disabled }, state);
 * return <Primitive.button {...mergeProps(look.root, props)} />;
 */
export function useStyles<Part extends string, Options, State>(
  look: Look<Part, Options, State>,
  options: Options,
  state: State,
): Styles<Part> {
  return look.native(useTokens(), options, state);
}
