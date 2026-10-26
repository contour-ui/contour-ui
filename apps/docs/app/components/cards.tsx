import { mergeProps } from '@contour-ui/headless';
import type { ComponentProps, ReactElement } from 'react';

/** Grid for MDX `<Cards>` (`cards.css`): one column on phones, two from 40rem. */
export function Cards(props: ComponentProps<'div'>): ReactElement {
  return <div {...mergeProps({ className: 'docs-cards' }, props)} />;
}
