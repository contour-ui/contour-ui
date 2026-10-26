import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CodeBlockRootProps = PrimitiveProps<'figure'>;

/**
 * The code block: a `figure` that holds the header and the code. It maps the
 * variables of Shiki's css-variables theme (`--shiki-token-keyword` and the
 * rest) to the syntax colors of the tokens, so code highlighted with that
 * theme follows the color theme it is shown in. With a header, the figure is
 * named by it.
 *
 * @example
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Title>theme-switch.tsx</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Content dangerouslySetInnerHTML={{ __html: highlighted }} />
 * </CodeBlock.Root>
 */
export function CodeBlockRoot({ className, ...props }: CodeBlockRootProps): ReactElement {
  const ownProps = {
    className: cx('contour-code-block', className),
    'data-scope': 'code-block',
    'data-part': 'root',
  };

  return <Primitive.figure {...mergeProps(ownProps, props)} />;
}
