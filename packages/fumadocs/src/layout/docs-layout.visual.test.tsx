import type { ReactElement } from 'react';

import { DocsLayout, DocsPage } from '../index.ts';
import { PageContent } from '../test-utils/page-content.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { toc } from '../test-utils/toc.ts';
import { visualStates } from '../test-utils/visual.tsx';

/** The page of Button in the layout, with its long content and table of contents. */
function ButtonPage(): ReactElement {
  return (
    <DocsLayout tree={pageTree}>
      <DocsPage title="Button" description="A button that runs an action." toc={toc}>
        <PageContent />
      </DocsPage>
    </DocsLayout>
  );
}

visualStates({
  // At 1280px: the sidebar, the page and the column of its table of contents.
  desktop: { render: () => <ButtonPage />, padded: false },
});
