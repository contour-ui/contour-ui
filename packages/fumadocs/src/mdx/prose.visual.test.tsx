import { Button, Kbd } from '@contour-ui/react';
import type { ReactElement, ReactNode } from 'react';

import { BUTTON_CODE, CodeExample, mdx } from '../test-utils/mdx.tsx';
import { visualStates } from '../test-utils/visual.tsx';
import { Callout, Card, Cards, Preview, Prose } from './index.ts';

/** As wide as the article of a docs page. */
function InArticle({ children }: { readonly children: ReactNode }): ReactElement {
  return <div style={{ maxInlineSize: '44rem' }}>{children}</div>;
}

// What MDX renders for Markdown, through `getMdxComponents()`.
const H1 = mdx('h1');
const H2 = mdx('h2');
const H3 = mdx('h3');
const H4 = mdx('h4');
const H5 = mdx('h5');
const H6 = mdx('h6');
const A = mdx('a');
const Table = mdx('table');
const Thead = mdx('thead');
const Tbody = mdx('tbody');
const Tr = mdx('tr');
const Th = mdx('th');
const Td = mdx('td');

/** A diagram as an image: three layers, each on the one below, drawn without text. */
const DIAGRAM = `data:image/svg+xml,${encodeURIComponent(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160">',
    '<rect width="480" height="160" fill="#1f2937"/>',
    '<rect x="40" y="104" width="400" height="32" rx="6" fill="#60a5fa"/>',
    '<rect x="80" y="64" width="320" height="32" rx="6" fill="#a78bfa"/>',
    '<rect x="120" y="24" width="240" height="32" rx="6" fill="#f472b6"/>',
    '</svg>',
  ].join(''),
)}`;

/**
 * Every element a page's Markdown renders, in `Prose`: headings that link to themselves, text
 * with inline marks and the three kinds of links, lists, a definition list, a quote, a rule, a
 * table, a code block, images, and the components of the MDX map.
 */
function EveryElement(): ReactElement {
  return (
    <Prose>
      <H1 id="prose">Prose</H1>
      <p>
        Prose sets the typography of a page: its headings, its text and their rhythm. Text has{' '}
        <strong>strong</strong> and <em>emphasized</em> words, <del>struck</del> ones,{' '}
        <code>inline code</code> and keys such as <Kbd>Esc</Kbd>. Links lead to{' '}
        <A href="/docs/guide/themes">a page of the site</A>, to{' '}
        <A href="#lists">a heading of the page</A> or to{' '}
        <A href="https://github.com/contour-ui/contour-ui">another site</A>.
      </p>
      <H2 id="lists">Lists</H2>
      <p>Lists keep their markers, and a list inside an item is indented under it:</p>
      <ul>
        <li>Tokens, the design decisions as CSS variables.</li>
        <li>
          Essentials, the everyday styled components:
          <ul>
            <li>Button, Card and Dialog.</li>
            <li>Table and Code block.</li>
          </ul>
        </li>
        <li>Headless, the behavior without styles.</li>
      </ul>
      <ol>
        <li>Install the packages.</li>
        <li>Load the stylesheets.</li>
        <li>Render the components.</li>
      </ol>
      <H3 id="definitions">Definitions</H3>
      <dl>
        <dt>Token</dt>
        <dd>A named design decision, such as a color or a space.</dd>
        <dt>Role</dt>
        <dd>A semantic token that components use, such as the color of muted text.</dd>
      </dl>
      <H2 id="quotes">Quotes and rules</H2>
      <blockquote>
        <p>Every component is styled with the semantic tokens, never with raw values.</p>
      </blockquote>
      <hr />
      <H2 id="tables">Tables</H2>
      <Table>
        <Thead>
          <Tr>
            <Th>Prop</Th>
            <Th>Type</Th>
            <Th style={{ textAlign: 'right' }}>Default</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>
              <code>variant</code>
            </Td>
            <Td>
              <code>{"'solid' | 'outline' | 'ghost'"}</code>
            </Td>
            <Td style={{ textAlign: 'right' }}>
              <code>{"'solid'"}</code>
            </Td>
          </Tr>
          <Tr>
            <Td>
              <code>size</code>
            </Td>
            <Td>
              <code>{"'sm' | 'md' | 'lg'"}</code>
            </Td>
            <Td style={{ textAlign: 'right' }}>
              <code>{"'md'"}</code>
            </Td>
          </Tr>
        </Tbody>
      </Table>
      <H2 id="code">Code</H2>
      <p>A code block, highlighted at build time, with its title and a copy button:</p>
      <CodeExample title="app.tsx" lines={BUTTON_CODE} />
      <H2 id="images">Images</H2>
      <img src={DIAGRAM} alt="Three layers, each resting on the one below." />
      <figure>
        <img src={DIAGRAM} alt="The same three layers." />
        <figcaption>A figure with a caption.</figcaption>
      </figure>
      <H2 id="components">Components</H2>
      <Callout title="A callout">Callouts keep their own look inside Prose.</Callout>
      <Cards>
        <Card title="Guide" href="/docs/guide" description="How it works." />
        <Card title="Essentials" href="/docs/essentials" description="Styled components." />
      </Cards>
      <Preview>
        <Button>A live example</Button>
      </Preview>
      <H3 id="smaller-headings">Smaller headings</H3>
      <H4 id="level-four">Level four</H4>
      <p>Text under a heading of level four.</p>
      <H5 id="level-five">Level five</H5>
      <p>Text under a heading of level five.</p>
      <H6 id="level-six">Level six</H6>
      <p>Text under a heading of level six.</p>
    </Prose>
  );
}

/** A short page: a heading, a paragraph and a list, as most pages start. */
function Text(): ReactElement {
  return (
    <Prose>
      <p>
        <code>@contour-ui/react</code> styles its components with plain CSS and the semantic tokens.
        Load its stylesheet after the tokens, then use the components.
      </p>
      <H2 id="install">Install</H2>
      <p>Add the packages with the package manager of the project.</p>
      <ul>
        <li>
          <code>@contour-ui/react</code>, the components.
        </li>
        <li>
          <code>@contour-ui/tokens</code>, the CSS variables they use.
        </li>
      </ul>
    </Prose>
  );
}

visualStates({
  // Taller than the viewport: the test grows it to the height of the page.
  'every-element': {
    render: () => (
      <InArticle>
        <EveryElement />
      </InArticle>
    ),
  },
  text: {
    render: () => (
      <InArticle>
        <Text />
      </InArticle>
    ),
  },
});
