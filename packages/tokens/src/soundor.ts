/**
 * contour-ui design tokens for Soundor, the plugin UI runtime of `@contour-ui/soundor`: the
 * values of every semantic token per theme, as Soundor styles take them.
 *
 * @example
 * import { soundorTokens } from '@contour-ui/tokens/soundor';
 * const { color, radius } = soundorTokens.dark;
 * const style = { backgroundColor: color.bg.surface, borderRadius: radius.panel };
 */
export { soundorTokens } from './generated/soundor.ts';
export type {
  SoundorEasing,
  SoundorTextStyle,
  SoundorTokens,
  SoundorTransition,
} from './generated/soundor.ts';
