/**
 * contour-ui icons as data: Lucide icons and brand logos (Simple Icons) compiled
 * into normalized paths, for SVG (`d`) and for Canvas 2D (`commands`, `drawIcon`).
 * Each icon is a separate `<camelName>Icon` export, so bundlers drop the unused ones.
 */
export { PathCommand } from './icon-data.ts';
export type { IconData, IconPath } from './icon-data.ts';
export { drawIcon } from './draw-icon.ts';
export type { DrawIconOptions, IconContext } from './draw-icon.ts';
export * from './generated/icons.ts';
