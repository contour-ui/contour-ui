import { Placeholder as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

export type PlaceholderRootProps = Headless.RootProps;

/** Placeholder styled part: the headless root plus the `contour-placeholder` class from `styles.css`. */
export function PlaceholderRoot({ className, ...props }: PlaceholderRootProps): ReactElement {
  const classes =
    className === undefined ? 'contour-placeholder' : `contour-placeholder ${className}`;
  return <Headless.Root className={classes} {...props} />;
}
