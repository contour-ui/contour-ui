import { mergeProps } from '@contour-ui/headless';
import type { ComponentProps, ReactElement } from 'react';

/**
 * Frame for live examples (`preview.css`): outside the prose styles, so components render with
 * their own CSS.
 */
export function Preview(props: ComponentProps<'div'>): ReactElement {
  return <div {...mergeProps({ className: 'docs-preview docs-not-prose' }, props)} />;
}
