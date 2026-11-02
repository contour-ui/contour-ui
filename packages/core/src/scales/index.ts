/*
 * Scales: how a control spreads a range of values over its travel (linear, logarithmic, a power
 * curve). Pure functions of plain numbers, shared by every platform.
 */
export { clampPosition, linearScale, logScale, powerScale, resolveScale } from './scale.ts';
export type { Scale, ScaleOption } from './scale.ts';
