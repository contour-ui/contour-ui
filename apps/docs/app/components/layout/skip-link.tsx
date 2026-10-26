import { Button } from '@contour-ui/kit';
import type { ReactElement } from 'react';

/**
 * The first stop of the Tab order on every page (`skip-link.css`): a link past the header and the
 * navigation to `main#content`, out of sight until it has focus.
 */
export function SkipLink(): ReactElement {
  return (
    <Button asChild size="lg" className="docs-skip-link">
      <a href="#content">Skip to content</a>
    </Button>
  );
}
