import type { ReactElement } from 'react';

import { Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';

export type PlaceholderRootProps = PrimitiveProps<'div'>;

/**
 * Placeholder unstyled part: a `div` (or, with `asChild`, its child) with the
 * `scope`/`part` data attributes every headless part carries.
 */
export function PlaceholderRoot(props: PlaceholderRootProps): ReactElement {
  return <Primitive.div data-scope="placeholder" data-part="root" {...props} />;
}
