import type { ReactElement, ReactNode } from 'react';

import { CodeExample, INSTALL_CODE } from '../../test-utils/mdx.tsx';
import { visualStates } from '../../test-utils/visual.tsx';
import { Prose, Tab, Tabs, TabsContent, TabsList, TabsTrigger } from '../index.ts';

/** In the content of a page, as an MDX page renders it. */
function InContent({ children }: { readonly children: ReactNode }): ReactElement {
  return <Prose style={{ maxInlineSize: '44rem' }}>{children}</Prose>;
}

/** `<Tabs items={[…]}>` with a `Tab` for each item, the first one selected. */
function Items(): ReactElement {
  return (
    <Tabs items={['JavaScript', 'Rust', 'C++']}>
      <Tab value="JavaScript">
        <p>Runs in every browser, and on the server with Node.js.</p>
      </Tab>
      <Tab value="Rust">
        <p>Compiles to native code, and to WebAssembly.</p>
      </Tab>
      <Tab value="C++">
        <p>Compiles to native code.</p>
      </Tab>
    </Tabs>
  );
}

/**
 * A `label` at the start of the row names the list of tabs. A code block alone in a panel, as
 * `remarkCodeTab` puts the blocks with a `tab` meta inside `<Tabs>`, fills it: the copy button
 * sits at the end of the row.
 */
function LabelAndCode(): ReactElement {
  return (
    <Tabs items={['pnpm', 'Notes']} label="Install">
      <Tab>
        <CodeExample lines={INSTALL_CODE} />
      </Tab>
      <Tab>
        <p>
          Install the tokens with <code>@contour-ui/react</code>: the app imports their stylesheet.
        </p>
      </Tab>
    </Tabs>
  );
}

/**
 * Two tabs of the group `language`: a reader's choice in one selects the same tab in the other,
 * and the session remembers it (`sessionStorage`, under the group id).
 */
function Group(): ReactElement {
  return (
    <>
      <Tabs items={['TypeScript', 'JavaScript']} groupId="language" label="Setup">
        <Tab>
          <p>Import the types of the package.</p>
        </Tab>
        <Tab>
          <p>Import the package.</p>
        </Tab>
      </Tabs>
      <Tabs items={['TypeScript', 'JavaScript']} groupId="language" label="Usage">
        <Tab>
          <p>Give the props their types.</p>
        </Tab>
        <Tab>
          <p>Pass the props.</p>
        </Tab>
      </Tabs>
    </>
  );
}

/** Without `items`: `TabsList`, `TabsTrigger` and `TabsContent`, part by part. */
function Parts(): ReactElement {
  return (
    <Tabs defaultValue="props">
      <TabsList aria-label="Reference">
        <TabsTrigger value="props">Props</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
      </TabsList>
      <TabsContent value="props">
        <p>The props of the component.</p>
      </TabsContent>
      <TabsContent value="events">
        <p>What it reports.</p>
      </TabsContent>
    </Tabs>
  );
}

// Tabs of MDX content, with the props of Fumadocs' `Tabs`. Each state shows the tabs as they
// render, the first one selected: `tabs.test.tsx` selects the others.
visualStates({
  items: {
    render: () => (
      <InContent>
        <Items />
      </InContent>
    ),
  },
  'label-and-code': {
    render: () => (
      <InContent>
        <LabelAndCode />
      </InContent>
    ),
  },
  group: {
    render: () => (
      <InContent>
        <Group />
      </InContent>
    ),
  },
  parts: {
    render: () => (
      <InContent>
        <Parts />
      </InContent>
    ),
  },
});
