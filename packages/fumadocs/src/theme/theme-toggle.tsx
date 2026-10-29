'use client';

import { monitorIcon, moonIcon, sunIcon } from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { Button, Icon, SegmentGroup, useTheme } from '@contour-ui/react';
import type { ThemeChoice } from '@contour-ui/react';
import { use } from 'react';
import type { ReactElement } from 'react';

import { DocsContext } from '../provider/docs-context.ts';
import type { ThemeToggleMode } from '../provider/docs-context.ts';

export interface ThemeToggleProps {
  /**
   * How it lets the reader choose: `light-dark`, a button that switches between the light and the
   * dark theme; `light-dark-system`, three choices, with the theme of the operating system.
   *
   * @defaultValue the `themeToggle.mode` of `DocsProvider`, or else `'light-dark'`
   */
  readonly mode?: ThemeToggleMode | undefined;
}

/** A choice of the three-way picker: its icon and its name. */
interface ThemeOption {
  readonly value: ThemeChoice;
  readonly icon: IconData;
  readonly label: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: 'light', icon: sunIcon, label: 'Light' },
  { value: 'dark', icon: moonIcon, label: 'Dark' },
  { value: 'system', icon: monitorIcon, label: 'System' },
];

const isThemeChoice = (value: string | null): value is ThemeChoice =>
  THEME_OPTIONS.some((option) => option.value === value);

/**
 * The theme picker (`theme-toggle.css`), for a layout of your own; the layouts of this package
 * render theirs, in the mode of `DocsProvider`'s `themeToggle`. Until the reader chooses, the
 * theme is the default of `DocsProvider`'s `theme`: the one of the operating system unless you
 * set another.
 *
 * - `light-dark`: a button that switches between the light and the dark theme. It shows the icon
 *   of the theme it switches to, and its name says so. The theme is unknown during the server
 *   render and the hydration render, so the button holds both choices, and CSS shows the one
 *   that fits the `data-theme` of `<html>`, which `docsScript()` sets before the first paint: no
 *   wrong icon flashes, and the name is right before the page is hydrated.
 * - `light-dark-system`: Kit's SegmentGroup "Theme" with three icon choices, Light, Dark and
 *   System, the choice checked. `data-theme` cannot tell `system` from the theme it resolves to,
 *   so no choice is checked until the page has hydrated and the stored choice is known.
 *
 * @example
 * <ThemeToggle mode="light-dark-system" />
 */
export function ThemeToggle({ mode }: ThemeToggleProps): ReactElement {
  const docs = use(DocsContext);
  const { theme, resolvedTheme, setTheme } = useTheme();

  if ((mode ?? docs?.themeToggleMode) === 'light-dark-system') {
    return (
      <SegmentGroup.Root
        size="lg"
        aria-label="Theme"
        className="contour-docs-theme-toggle"
        data-mode="light-dark-system"
        value={theme ?? null}
        onValueChange={(details) => {
          if (isThemeChoice(details.value)) {
            setTheme(details.value);
          }
        }}
      >
        <SegmentGroup.Indicator />
        {THEME_OPTIONS.map(({ value, icon, label }) => (
          <SegmentGroup.Item key={value} value={value}>
            <Icon icon={icon} />
            <SegmentGroup.ItemHiddenInput aria-label={label} />
          </SegmentGroup.Item>
        ))}
      </SegmentGroup.Root>
    );
  }

  return (
    <Button
      variant="ghost"
      size="lg"
      className="contour-docs-theme-toggle"
      data-mode="light-dark"
      onClick={() => {
        setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
      }}
    >
      <span className="contour-docs-theme-toggle__choice" data-target="light">
        <Icon icon={sunIcon} />
        <span className="contour-docs-theme-toggle__label">Switch to the light theme</span>
      </span>
      <span className="contour-docs-theme-toggle__choice" data-target="dark">
        <Icon icon={moonIcon} />
        <span className="contour-docs-theme-toggle__label">Switch to the dark theme</span>
      </span>
    </Button>
  );
}
