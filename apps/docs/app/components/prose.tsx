import { mergeProps } from '@contour-ui/headless';
import type { ComponentProps, ReactElement } from 'react';

/**
 * Typography and vertical rhythm for the MDX content of a page (`prose.css`). Everything inside
 * an element with the `docs-not-prose` class is left alone.
 */
export function Prose(props: ComponentProps<'div'>): ReactElement {
  return <div {...mergeProps({ className: 'docs-prose' }, props)} />;
}
