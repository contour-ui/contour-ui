/*
 * The Soundor build of the styled package: the components that run in Soundor plugin UIs, from
 * the same sources as on the web, drawn with the token values of the theme. The web build
 * (`index.ts`) exports every component.
 */

export { Button } from './button/button.tsx';
export type { ButtonProps, ButtonState } from './button/button.tsx';
export { registerFonts } from './fonts/register-fonts.soundor.ts';
export * as Knob from './knob/index.ts';
// The readouts and scales of value controls, so that apps need no other package to set up a Knob.
export {
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatNumber,
  formatPercent,
  linearScale,
  logScale,
  powerScale,
} from '@contour-ui/headless';
export type { Scale, ScaleOption } from '@contour-ui/headless';
export { ThemeProvider } from './theme-provider/theme-provider.soundor.tsx';
export type { ThemeProviderProps } from './theme-provider/theme-provider.soundor.tsx';
export { useTheme } from './theme-provider/use-theme.soundor.ts';
export type { UseThemeReturn } from './theme-provider/use-theme.soundor.ts';
