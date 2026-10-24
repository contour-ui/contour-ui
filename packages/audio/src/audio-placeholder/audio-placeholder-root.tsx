import { Placeholder } from '@contour-ui/kit';
import type { ReactElement } from 'react';

export type AudioPlaceholderRootProps = Placeholder.RootProps;

/** Placeholder audio part, composed from the kit placeholder (the allowed `audio -> kit` edge). */
export function AudioPlaceholderRoot({
  className,
  ...props
}: AudioPlaceholderRootProps): ReactElement {
  const classes =
    className === undefined
      ? 'contour-audio-placeholder'
      : `contour-audio-placeholder ${className}`;
  return <Placeholder.Root className={classes} {...props} />;
}
