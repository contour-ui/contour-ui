import { lightbulbIcon } from '@contour-ui/icons';
import { Icon } from '@contour-ui/react';
import { vars } from '@contour-ui/tokens';
import type { ReactElement, ReactNode } from 'react';

import { visualStates } from '../test-utils/visual.tsx';
import { Callout, Prose } from './index.ts';

/** In the content of a page, as an MDX page renders it. */
function InContent({ children }: { readonly children: ReactNode }): ReactElement {
  return <Prose style={{ maxInlineSize: '44rem' }}>{children}</Prose>;
}

/**
 * Every type of Fumadocs' callouts and the status of the alert it becomes: `warn` and `warning`
 * are `warning`, `error` is `danger`, `idea` is `neutral`.
 */
function Types(): ReactElement {
  return (
    <div style={{ display: 'grid', gap: vars.space['group-gap'] }}>
      <Callout type="info" title="Info">
        Themes switch with the <code>data-theme</code> attribute.
      </Callout>
      <Callout type="warn" title="Warn">
        The sidebar state is stored in <code>localStorage</code>.
      </Callout>
      <Callout type="warning" title="Warning">
        Load the stylesheet of the layout before <code>@contour-ui/react/styles.css</code>.
      </Callout>
      <Callout type="error" title="Error">
        A page outside the page tree has no neighbours.
      </Callout>
      <Callout type="success" title="Success">
        The search index is ready.
      </Callout>
      <Callout type="idea" title="Idea">
        Add your own components to the MDX map.
      </Callout>
    </div>
  );
}

visualStates({
  // `type="info"`, the default: the styled `Alert` with the `info` status.
  info: {
    render: () => (
      <InContent>
        <Callout title="Pre-release">The packages are not on npm yet.</Callout>
      </InContent>
    ),
  },
  types: {
    render: () => (
      <InContent>
        <Types />
      </InContent>
    ),
  },
  // Paragraphs and a list in the content, without a title.
  content: {
    render: () => (
      <InContent>
        <Callout>
          <p>The packages are not on npm yet.</p>
          <ul>
            <li>Essentials and Headless have their first components.</li>
            <li>Audio still shows a placeholder.</li>
          </ul>
        </Callout>
      </InContent>
    ),
  },
  // `icon` replaces the icon of the status.
  'custom-icon': {
    render: () => (
      <InContent>
        <Callout type="idea" title="Tip" icon={<Icon icon={lightbulbIcon} />}>
          Press ⌘K anywhere to search the docs.
        </Callout>
      </InContent>
    ),
  },
});
