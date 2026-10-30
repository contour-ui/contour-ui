import type { ReactElement, ReactNode } from 'react';

import { BUTTON_CODE, CodeExample, CSS_CODE, INSTALL_CODE } from '../test-utils/mdx.tsx';
import { visualStates } from '../test-utils/visual.tsx';
import { Prose } from './index.ts';

/** In the content of a page, as an MDX page renders it. */
function InContent({ children }: { readonly children: ReactNode }): ReactElement {
  return <Prose style={{ maxInlineSize: '44rem' }}>{children}</Prose>;
}

// A fenced code block of an MDX page, as the MDX map's `pre` draws it with the styled `CodeBlock`:
// the highlighted code (Shiki's css-variables theme, colored by the syntax tokens), a header
// with the title from the meta, and a copy button.
visualStates({
  // ` ```tsx title="app.tsx" `: the title in a header, with the copy button.
  title: {
    render: () => (
      <InContent>
        <CodeExample lines={BUTTON_CODE} title="app.tsx" />
      </InContent>
    ),
  },
  // Without a title, the copy button sits at the top end of the code.
  'no-title': {
    render: () => (
      <InContent>
        <CodeExample lines={INSTALL_CODE} />
      </InContent>
    ),
  },
  // `noCopy`: no copy button.
  'no-copy': {
    render: () => (
      <InContent>
        <CodeExample lines={INSTALL_CODE} noCopy />
      </InContent>
    ),
  },
  // `lineNumbers=3`: the lines are numbered from 3. A long line scrolls sideways.
  'line-numbers': {
    render: () => (
      <InContent>
        <CodeExample title="panel.css" lines={CSS_CODE} lineNumbers={3} />
      </InContent>
    ),
  },
});
