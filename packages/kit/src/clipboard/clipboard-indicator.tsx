'use client';

import { Clipboard as Headless } from '@contour-ui/headless';
import { checkIcon, copyIcon } from '@contour-ui/icons';
import type { ReactElement } from 'react';

import { Icon } from '../icon/index.ts';
import { cx } from '../utils/cx.ts';

export type ClipboardIndicatorProps = Headless.IndicatorProps;

/**
 * Clipboard indicator: shows its children, and `copied` in their place while the value is
 * copied; without either, a copy icon that turns into a check mark. What it shows while copied
 * comes in with a short pop (a fade under reduced motion).
 *
 * It is for the eyes, hidden from assistive technology (`aria-hidden`): the trigger keeps its
 * name, and the root's status element announces the copy. In a trigger with text, let it swap
 * the icon and leave the text alone, so the visible text stays part of the trigger's name.
 *
 * @example
 * <Clipboard.Trigger>
 *   <Clipboard.Indicator />
 *   Copy
 * </Clipboard.Trigger>
 */
export function ClipboardIndicator({
  children,
  copied,
  className,
  ...props
}: ClipboardIndicatorProps): ReactElement {
  // Only without content of its own: `copied="Copied"` alone shows nothing until a copy. The
  // default icons are the element of the part, so a button sizes them as its own icons.
  const icons = children === undefined && copied === undefined;
  return (
    <Headless.Indicator
      asChild={icons}
      aria-hidden
      className={cx('contour-clipboard__indicator', className)}
      copied={icons ? <Icon icon={checkIcon} /> : copied}
      {...props}
    >
      {icons ? <Icon icon={copyIcon} /> : children}
    </Headless.Indicator>
  );
}
