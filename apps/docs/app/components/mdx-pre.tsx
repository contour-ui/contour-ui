import { CodeBlock } from '@contour-ui/kit';
import type { ComponentProps, ReactElement } from 'react';

/**
 * A highlighted `pre` as Fumadocs' `rehypeCode` passes it: Shiki's class and style, plus the
 * code block's meta string. `title="…"` arrives as `title`, `noCopy` as `allowCopy="false"`,
 * `lineNumbers` as `data-line-numbers`, and `lineNumbers=N` adds `data-line-numbers-start`.
 */
interface MdxPreProps extends ComponentProps<'pre'> {
  allowCopy?: string | undefined;
  'data-line-numbers'?: boolean | undefined;
  'data-line-numbers-start'?: number | string | undefined;
}

/**
 * A fenced code block as Kit's `CodeBlock`: a header with the title when the block has one, and
 * the highlighted `pre` in the scroll area. `not-fumadocs-codeblock` turns off the Shiki styles
 * of `fumadocs-ui/css/preset.css`, which are not in a cascade layer and would beat Kit's.
 */
export function MdxPre({
  title,
  // The copy button will read it; it is not an attribute of the `pre`.
  allowCopy: _allowCopy,
  style,
  ...props
}: MdxPreProps): ReactElement {
  const start = Number(props['data-line-numbers-start']);
  // Kit numbers the lines with this counter: reset to one less than the first number.
  const numbering = Number.isInteger(start)
    ? { counterReset: `contour-code-block-line ${start - 1}` }
    : undefined;

  return (
    <CodeBlock.Root className="not-fumadocs-codeblock">
      {title === undefined || title === '' ? null : (
        <CodeBlock.Header>
          <CodeBlock.Title>{title}</CodeBlock.Title>
        </CodeBlock.Header>
      )}
      <CodeBlock.Content>
        <pre {...props} style={{ ...style, ...numbering }} />
      </CodeBlock.Content>
    </CodeBlock.Root>
  );
}
