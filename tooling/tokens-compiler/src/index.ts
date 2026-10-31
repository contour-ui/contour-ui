/**
 * The compiler of `@contour-ui/tokens`. DTCG 2025.10 sources become a model (`resolve/`,
 * `model/`); platforms say how one platform writes a token (`platforms/`); outputs turn the model
 * into the package's files (`outputs/`); checks hold the rules of the design (`checks/`).
 * `designTokens` runs all of it inside `vp pack`; `buildTokens` runs it without tsdown.
 */
export { buildTokens } from './build.ts';
export type { DesignTokensOptions, TokenBuild } from './build.ts';
export { contrast } from './checks/contrast.ts';
export { described } from './checks/described.ts';
export { gamut } from './checks/gamut.ts';
export { paletteSteps } from './checks/palette-steps.ts';
export type { CheckContext, TokenCheck } from './checks/check.ts';
export type { ModelToken, ThemeValue, Tier, TokenModel, TokenType } from './model/model.ts';
export { formatProblems } from './model/problem.ts';
export type { Problem, Report } from './model/problem.ts';
export { css } from './outputs/css.ts';
export { docs } from './outputs/docs.ts';
export type { Artifact, TokenOutput } from './outputs/output.ts';
export { values } from './outputs/values.ts';
export { vars } from './outputs/vars.ts';
export { designTokens } from './plugin.ts';
export { soundorPlatform } from './platforms/soundor.ts';
export type { SoundorEasing, SoundorPlatformOptions } from './platforms/soundor.ts';
export type { PlainValue, ValuesPlatform } from './platforms/values.ts';
export { webPlatform } from './platforms/web.ts';
export type { Declaration, WebPlatform, WebPlatformOptions } from './platforms/web.ts';
