import { mergeProps } from '@contour-ui/headless';
import { hashIcon } from '@contour-ui/icons';
import { Icon } from '@contour-ui/kit';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ReactElement } from 'react';

interface MdxHeadingProps extends ComponentProps<'h2'> {
  /** The heading element: the level of the Markdown heading. */
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * A Markdown heading that links to itself (`mdx-heading.css`). It keeps the `id` MDX gives it,
 * and its text is a link to that `#id`, with a hash that shows while the heading is hovered or
 * the link has the focus. The hash is decorative, so the text alone names both the heading and
 * the link. A heading without an id stays a plain heading.
 */
function MdxHeading({ as: Heading, id, children, ...props }: MdxHeadingProps): ReactElement {
  if (id === undefined || id === '') {
    return <Heading {...props}>{children}</Heading>;
  }
  return (
    <Heading {...mergeProps({ className: 'docs-heading' }, props)} id={id}>
      <a className="docs-heading__link" href={`#${id}`}>
        {children}
        <Icon icon={hashIcon} className="docs-heading__hash" />
      </a>
    </Heading>
  );
}

/** Markdown headings, `#` to `######`, as {@link MdxHeading}. */
export const mdxHeadingComponents = {
  h1: (props) => <MdxHeading {...props} as="h1" />,
  h2: (props) => <MdxHeading {...props} as="h2" />,
  h3: (props) => <MdxHeading {...props} as="h3" />,
  h4: (props) => <MdxHeading {...props} as="h4" />,
  h5: (props) => <MdxHeading {...props} as="h5" />,
  h6: (props) => <MdxHeading {...props} as="h6" />,
} satisfies MDXComponents;
