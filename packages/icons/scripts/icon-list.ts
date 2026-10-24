/**
 * The icons this package ships. After editing, regenerate `src/generated/icons.ts`:
 *
 *   vp run --filter @contour-ui/icons icons
 *
 * Each name becomes a `<camelName>Icon` export (`chevron-right` -> `chevronRightIcon`).
 */

/** Lucide icons by their current Lucide name (https://lucide.dev/icons), drawn stroked. */
export const LUCIDE_ICONS: readonly string[] = [
  // Search button, search dialog field.
  'search',
  // Sidebar, previous / next links, disclosure.
  'chevron-right',
  'chevron-down',
  'chevron-left',
  // Section switcher.
  'chevrons-up-down',
  // Mobile menu, close button.
  'menu',
  'x',
  // External links.
  'arrow-up-right',
  // Heading anchors.
  'hash',
  // Code block: copy, copied.
  'copy',
  'check',
  // Theme switch.
  'sun',
  'moon',
  'monitor',
  // Alert statuses.
  'info',
  'circle-check',
  'triangle-alert',
  'circle-x',
  'lightbulb',
  // Collapse the desktop sidebar.
  'panel-left',
];

/** Brand logos from Simple Icons by slug (https://simpleicons.org), drawn filled. */
export const SIMPLE_ICONS: readonly string[] = [
  // Header and sidebar.
  'github',
];
