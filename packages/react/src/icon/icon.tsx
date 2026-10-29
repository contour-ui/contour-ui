import { mergeProps } from '@contour-ui/headless-react';
import type { IconData } from '@contour-ui/icons';
import type { ComponentProps, ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface IconProps extends Omit<ComponentProps<'svg'>, 'children'> {
  /** The icon to draw: one of the `<camelName>Icon` exports of `@contour-ui/icons`. */
  icon: IconData;
  /**
   * Width and height: a number of pixels or any CSS length. `1em` follows the
   * font size of the surrounding text. Components that hold icons size them in
   * CSS, which takes precedence over this attribute.
   *
   * @defaultValue '1em'
   */
  size?: number | string | undefined;
  /**
   * Accessible name. With it the icon is an image with this name (`role="img"`);
   * without it the icon is decorative and hidden from assistive technology.
   */
  label?: string | undefined;
  /**
   * Stroke width of the outlined paths, in units of the 24-unit icon grid.
   *
   * @defaultValue the icon's own, `2` for Lucide icons
   */
  strokeWidth?: number | undefined;
}

/**
 * An icon from `@contour-ui/icons` as an inline `<svg>` in the current text
 * color. Decorative unless it has a `label`.
 *
 * @example
 * <Icon icon={searchIcon} />
 * <Icon icon={githubIcon} label="GitHub" />
 */
export function Icon({
  icon,
  size = '1em',
  label,
  strokeWidth = icon.strokeWidth,
  className,
  ...props
}: IconProps): ReactElement {
  const named = label !== undefined && label !== '';
  const ownProps = {
    viewBox: `0 0 ${icon.size} ${icon.size}`,
    // An inline-block box even without Kit's CSS, so the label of an icon in a link or a button
    // joins the name as a separate word ("Fumadocs opens in a new tab"): name computations put a
    // space around a child whose `display` is not `inline`. A presentation attribute ranks below
    // every CSS rule, so a stylesheet still sets `display` (`none` included).
    display: 'inline-block',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: cx('contour-icon', className),
    'data-scope': 'icon',
    'data-part': 'root',
    // `mergeProps` skips the `undefined` ones.
    role: named ? 'img' : undefined,
    'aria-label': named ? label : undefined,
    'aria-hidden': named ? undefined : true,
  } as const;

  return (
    <svg {...mergeProps(ownProps, props)}>
      {icon.paths.map((path) =>
        path.fill ? (
          <path key={path.d} d={path.d} fill="currentColor" stroke="none" />
        ) : (
          <path key={path.d} d={path.d} />
        ),
      )}
    </svg>
  );
}
