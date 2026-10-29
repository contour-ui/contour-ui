'use client';

import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { CodeBlockContext } from './code-block-context.ts';
import type { CodeBlockContextValue } from './code-block-context.ts';

export interface CodeBlockRootProps extends PrimitiveProps<'figure'> {
  /**
   * The text `CodeBlock.CopyTrigger` copies. Without it, the trigger copies the text of
   * `CodeBlock.Content` as it is when clicked.
   */
  value?: string | undefined;
}

const isSet = (value: string | undefined): boolean => value !== undefined && value !== '';

/**
 * The code block: a `figure` that holds the header and the code. It maps the
 * variables of Shiki's css-variables theme (`--shiki-token-keyword` and the
 * rest) to the syntax colors of the tokens, so code highlighted with that
 * theme follows the color theme it is shown in.
 *
 * The figure is named by `CodeBlock.Title` (`aria-labelledby`) while one is
 * mounted, and by nothing else: not by the copy button or its status in the
 * header. The title registers itself after the first render, so the server
 * render and hydration match.
 *
 * @example
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Title>theme-switch.tsx</CodeBlock.Title>
 *     <CodeBlock.CopyTrigger />
 *   </CodeBlock.Header>
 *   <CodeBlock.Content dangerouslySetInnerHTML={{ __html: highlighted }} />
 * </CodeBlock.Root>
 */
export function CodeBlockRoot({ value, className, ...props }: CodeBlockRootProps): ReactElement {
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined);
  const registerTitle = useCallback((id: string) => {
    setLabelledBy(id);
    return () => {
      setLabelledBy((current) => (current === id ? undefined : current));
    };
  }, []);
  const context = useMemo<CodeBlockContextValue>(
    () => ({ value, contentRef, titleId, registerTitle }),
    [value, titleId, registerTitle],
  );
  // A name of the owner's wins: `aria-labelledby` would override an `aria-label`.
  const named = isSet(props['aria-label']) || isSet(props['aria-labelledby']);
  const ownProps = {
    className: cx('contour-code-block', className),
    'data-scope': 'code-block',
    'data-part': 'root',
    // `mergeProps` skips `undefined`.
    'aria-labelledby': named ? undefined : labelledBy,
  };

  return (
    <CodeBlockContext value={context}>
      <Primitive.figure {...mergeProps(ownProps, props)} />
    </CodeBlockContext>
  );
}
