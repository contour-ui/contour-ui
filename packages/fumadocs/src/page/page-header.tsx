import type { ReactElement } from 'react';

export interface PageHeaderProps {
  /** The title of the page, from its frontmatter. */
  readonly title: string;
  /** The description of the page, from its frontmatter. */
  readonly description?: string | undefined;
}

/**
 * The top of a page (`page-header.css`): its title as the page's `h1`, and its description
 * under it. It sets no margin: the page spaces it from the content.
 */
export function PageHeader({ title, description }: PageHeaderProps): ReactElement {
  return (
    <header className="contour-docs-page-header">
      <h1 className="contour-docs-page-header__title">{title}</h1>
      {description === undefined || description === '' ? null : (
        <p className="contour-docs-page-header__description">{description}</p>
      )}
    </header>
  );
}
