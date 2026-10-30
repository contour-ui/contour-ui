import type { ReactElement, ReactNode } from 'react';

import { FrameworkTabs, PackageInstall } from '../../test-utils/tabs.tsx';
import { visualStates } from '../../test-utils/visual.tsx';
import { Prose } from '../index.ts';

/** In the content of a page, as an MDX page renders it. */
function InContent({ children }: { readonly children: ReactNode }): ReactElement {
  return <Prose style={{ maxInlineSize: '44rem' }}>{children}</Prose>;
}

// Code block tabs, as Fumadocs' remark plugins write them into a page: one frame with the look of
// a code block, the triggers where its header would be, and the code of the selected tab below,
// with its copy button at the end of the row of triggers. The stories went back to the first tab
// for the screenshot: each state shows it as it renders.
visualStates({
  // A ` ```package-install ` block (or ` ```npm `): the command of each package manager, as
  // `remarkNpm` makes it, npm first.
  'package-install-block': {
    render: () => (
      <InContent>
        <PackageInstall packages="@contour-ui/react @contour-ui/tokens" />
      </InContent>
    ),
  },
  // Consecutive code blocks with a `tab` meta, ` ```tsx tab="React Router" ` and
  // ` ```tsx tab="Next.js" `. A block with a title keeps its header under the row of triggers.
  'tab-meta': {
    render: () => (
      <InContent>
        <FrameworkTabs />
      </InContent>
    ),
  },
  // `tab-group="framework"` on the first block of each: both select the same tab, and the choice
  // is remembered across visits (`localStorage`, under the group id).
  'tab-group': {
    render: () => (
      <InContent>
        <FrameworkTabs groupId="framework" persist />
        <FrameworkTabs groupId="framework" persist />
      </InContent>
    ),
  },
});
