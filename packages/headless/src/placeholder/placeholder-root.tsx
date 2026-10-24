import type { ComponentProps, ReactElement } from 'react';

export type PlaceholderRootProps = ComponentProps<'div'>;

/** Placeholder unstyled part. Real headless components follow the `scope`/`part` data-attribute convention. */
export function PlaceholderRoot(props: PlaceholderRootProps): ReactElement {
  return <div data-scope="placeholder" data-part="root" {...props} />;
}
