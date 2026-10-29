import { Button } from '@contour-ui/react';
import type { ReactElement } from 'react';

/**
 * The first stop of the Tab order on the page (`skip-link.css`): a link past the header and the
 * navigation to `main#content`, out of sight until it has focus. The layouts of this package
 * render it first, and their page is that `main`; a layout of your own renders it first too, and
 * gives its main content `id="content"` and `tabIndex={-1}`.
 *
 * @example
 * <SkipLink />
 * <header>…</header>
 * <main id="content" tabIndex={-1}>…</main>
 */
export function SkipLink(): ReactElement {
  return (
    <Button asChild size="lg" className="contour-docs-skip-link">
      <a href="#content">Skip to content</a>
    </Button>
  );
}
