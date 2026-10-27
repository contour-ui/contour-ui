'use client';

import { CodeBlock } from '@contour-ui/kit';
import type { ComponentProps, ReactElement } from 'react';

/**
 * A highlighted `pre` as Fumadocs' `rehypeCode` passes it: Shiki's class and style, plus the
 * code block's meta string. `title="…"` arrives as `title`, `noCopy` as `allowCopy="false"`,
 * `lineNumbers` as `data-line-numbers`, and `lineNumbers=N` adds `data-line-numbers-start`.
 */
interface MdxPreProps extends ComponentProps<'pre'> {
  allowCopy?: string | undefined;
  /**
   * The icon of the code's language, an SVG as HTML, which `rehypeCode` adds unless its options
   * say `icon: false`. The header shows the title only, so the icon is dropped, not left on the
   * `pre` as an attribute.
   */
  icon?: string | undefined;
  'data-line-numbers'?: boolean | undefined;
  'data-line-numbers-start'?: number | string | undefined;
}

/**
 * A fenced code block as Kit's `CodeBlock`: a header with the title when the block has one, the
 * highlighted `pre` in the scroll area, and a copy button unless the meta says `noCopy`, in the
 * header or, without a title, at the top end of the block.
 */
export function MdxPre({
  title,
  allowCopy,
  icon: _icon,
  style,
  ...props
}: MdxPreProps): ReactElement {
  const start = Number(props['data-line-numbers-start']);
  // Kit numbers the lines with this counter: reset to one less than the first number.
  const numbering = Number.isInteger(start)
    ? { counterReset: `contour-code-block-line ${start - 1}` }
    : undefined;
  // It copies the text of the content, as shown.
  const copy = allowCopy === 'false' ? null : <CodeBlock.CopyTrigger />;

  return (
    <CodeBlock.Root>
      {title === undefined || title === '' ? (
        copy
      ) : (
        <CodeBlock.Header>
          <CodeBlock.Title>{title}</CodeBlock.Title>
          {copy}
        </CodeBlock.Header>
      )}
      <CodeBlock.Content>
        <pre {...props} style={{ ...style, ...numbering }} />
      </CodeBlock.Content>
    </CodeBlock.Root>
  );
}
