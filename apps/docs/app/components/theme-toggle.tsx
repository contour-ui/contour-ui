import { moonIcon, sunIcon } from '@contour-ui/icons';
import { Button, Icon, useTheme } from '@contour-ui/kit';
import type { ReactElement } from 'react';

/**
 * The button that switches between the light and the dark theme (`theme-toggle.css`): it shows
 * the icon of the theme it switches to, and its name says so. Until the user clicks it, the theme
 * follows the operating system, the default of `ThemeProvider`.
 *
 * The theme is unknown during the server render and the hydration render, so the button holds
 * both choices, and CSS shows the one that fits the `data-theme` of `<html>`, which the theme
 * script sets before the first paint: no wrong icon flashes, and the name is right before the
 * page is hydrated.
 */
export function ThemeToggle(): ReactElement {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="lg"
      className="docs-theme-toggle"
      onClick={() => {
        setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
      }}
    >
      <span className="docs-theme-toggle__choice" data-target="light">
        <Icon icon={sunIcon} />
        <span className="docs-theme-toggle__label">Switch to the light theme</span>
      </span>
      <span className="docs-theme-toggle__choice" data-target="dark">
        <Icon icon={moonIcon} />
        <span className="docs-theme-toggle__label">Switch to the dark theme</span>
      </span>
    </Button>
  );
}
