'use client';

import { mergeProps } from '@contour-ui/headless-react';
import { searchIcon } from '@contour-ui/icons';
import { Button, Icon, IconButton, Kbd } from '@contour-ui/kit';
import { use } from 'react';
import type { ReactElement } from 'react';

import { SearchContext } from './search-context.ts';
import { ARIA_SHORTCUT, SHORTCUT_KEYS, useApplePlatform } from './shortcut.ts';

export interface SearchTriggerProps {
  /**
   * `field`: a wide button with the label and the shortcut, as in the sidebar; `icon`: an icon
   * button, as in the header on phones.
   *
   * @defaultValue 'field'
   */
  readonly variant?: 'field' | 'icon' | undefined;
  readonly className?: string | undefined;
}

/** The platform the keys are for: `apple` or `other`. */
type Platform = keyof typeof SHORTCUT_KEYS;

/**
 * The shortcut at the end of the field: the keys of both platforms, stacked in one place, so
 * the room they take is the same before and after hydration; the keys of the platform show
 * once it is known. Hidden from assistive technology, which reads `aria-keyshortcuts`.
 */
function Shortcut({ platform }: { readonly platform: Platform | undefined }): ReactElement {
  return (
    <span
      className="contour-docs-search-trigger__shortcut"
      data-platform={platform}
      aria-hidden="true"
    >
      {Object.entries(SHORTCUT_KEYS).map(([keysPlatform, keys]) => (
        <span
          key={keysPlatform}
          className="contour-docs-search-trigger__keys"
          data-keys={keysPlatform}
        >
          {keys.map((key) => (
            <Kbd key={key} size="sm">
              {key}
            </Kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

/**
 * The button that opens the search dialog of `DocsProvider`, named "Search" in both variants,
 * of the `lg` size of the buttons around it, for a layout of your own; the layouts of this
 * package render theirs. The shortcut, ⌘K or Ctrl K, is its `aria-keyshortcuts` once the platform
 * is known, after hydration; the `field` variant also shows it (`search.css`), and fills the
 * width its container gives it. Nothing renders on a site without search (`search={false}`).
 *
 * @example
 * <SearchTrigger />
 * <SearchTrigger variant="icon" />
 */
export function SearchTrigger({
  variant = 'field',
  className,
}: SearchTriggerProps): ReactElement | null {
  const search = use(SearchContext);
  const apple = useApplePlatform();
  if (search === null) {
    return null;
  }
  let platform: Platform | undefined;
  if (apple !== undefined) {
    platform = apple ? 'apple' : 'other';
  }
  const ownProps = {
    'aria-haspopup': 'dialog',
    'aria-expanded': search.open,
    'aria-keyshortcuts': platform === undefined ? undefined : ARIA_SHORTCUT[platform],
    onClick: search.openSearch,
  } as const;

  if (variant === 'icon') {
    return (
      <IconButton
        {...mergeProps(ownProps, { className })}
        variant="ghost"
        size="lg"
        label="Search"
        icon={searchIcon}
      />
    );
  }
  return (
    <Button
      {...mergeProps({ className: 'contour-docs-search-trigger' }, ownProps, { className })}
      variant="outline"
      size="lg"
    >
      <Icon icon={searchIcon} />
      Search
      <Shortcut platform={platform} />
    </Button>
  );
}
