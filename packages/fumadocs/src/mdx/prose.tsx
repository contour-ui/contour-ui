import type { ComponentProps, ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ProseProps = ComponentProps<'div'>;

/**
 * Typography and vertical rhythm for the MDX content of a page (`prose.css`). Everything inside
 * an element with the `contour-docs-not-prose` class is left alone: give it to a block that
 * should render with its own styles only, as `Preview` does for live examples.
 *
 * It imports nothing from `@contour-ui/react` or `@contour-ui/headless-react`, so it renders on
 * the server too (React Server Components) and adds nothing to the client bundle.
 *
 * @example
 * <Prose>
 *   <Mdx components={getMdxComponents()} />
 * </Prose>
 */
export function Prose({ className, ...props }: ProseProps): ReactElement {
  return <div {...props} className={cx('contour-docs-prose', className)} />;
}
