import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTocContext } from './toc-context.ts';

export type TocListProps = PrimitiveProps<'ul'>;

/** Table of contents list: the `ul` of the items, flat in the order of the page. */
export function TocList(props: TocListProps): ReactElement {
  const api = useTocContext();
  return <Primitive.ul {...mergeProps(api.getListProps(), props)} />;
}
