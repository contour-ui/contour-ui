import { fileTextIcon, githubIcon, lightbulbIcon } from '@contour-ui/icons';
import { Icon } from '@contour-ui/react';
import type { ReactElement, ReactNode } from 'react';

import { visualStates } from '../test-utils/visual.tsx';
import { Card, Cards, Prose } from './index.ts';

/** In the content of a page, as an MDX page renders it. */
function InContent({ children }: { readonly children: ReactNode }): ReactElement {
  return <Prose style={{ maxInlineSize: '44rem' }}>{children}</Prose>;
}

/**
 * Cards that link to pages: through the framework's `Link` for a page of the site, in a new tab
 * for another site. The whole card is the link; the text under the title is the `description`
 * or the children. One column on phones, two from 40rem.
 */
function Links(): ReactElement {
  return (
    <Cards>
      <Card title="Guide" href="/docs/guide">
        How contour-ui works: packages, installation, themes, styling with tokens.
      </Card>
      <Card
        title="Essentials"
        href="/docs/essentials"
        description="Styled general-purpose components."
      />
      <Card title="Forms" href="/docs/essentials/forms" description="Checkbox and Select." />
      <Card
        title="GitHub"
        href="https://github.com/contour-ui/contour-ui"
        description="The source, the issues and the releases."
      />
    </Cards>
  );
}

/** `icon` shows above the title. */
function Icons(): ReactElement {
  return (
    <Cards>
      <Card
        title="Read the guide"
        href="/docs/guide"
        icon={<Icon icon={fileTextIcon} />}
        description="Start here."
      />
      <Card
        title="Ideas"
        href="/docs/guide/themes"
        icon={<Icon icon={lightbulbIcon} />}
        description="Themes and tokens."
      />
      <Card
        title="Source"
        href="https://github.com/contour-ui/contour-ui"
        icon={<Icon icon={githubIcon} />}
        description="On GitHub."
      />
    </Cards>
  );
}

/** Without `href`, a card is a plain panel. */
function Static(): ReactElement {
  return (
    <Cards>
      <Card title="Accessible">Every component passes axe in both themes.</Card>
      <Card title="Themed">Dark by default, light under one attribute.</Card>
    </Cards>
  );
}

visualStates({
  links: {
    render: () => (
      <InContent>
        <Links />
      </InContent>
    ),
  },
  icons: {
    render: () => (
      <InContent>
        <Icons />
      </InContent>
    ),
  },
  static: {
    render: () => (
      <InContent>
        <Static />
      </InContent>
    ),
  },
});
