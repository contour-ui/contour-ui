import { Kbd } from '@contour-ui/kit';
import type { ReactElement } from 'react';

import { Callout, Prose } from '../mdx/index.ts';
import { BUTTON_CODE, CodeExample, mdx } from './mdx.tsx';

// What MDX renders for Markdown, through `getMdxComponents()`.
const H2 = mdx('h2');
const H3 = mdx('h3');
const H4 = mdx('h4');
const Table = mdx('table');
const Thead = mdx('thead');
const Tbody = mdx('tbody');
const Tr = mdx('tr');
const Th = mdx('th');
const Td = mdx('td');

/** The rows of the table of props: name, type, default. */
const PROPS = [
  ['variant', "'solid' | 'outline' | 'ghost'", "'solid'"],
  ['size', "'sm' | 'md' | 'lg'", "'md'"],
  ['disabled', 'boolean', 'false'],
] as const;

/**
 * The content of the page of Button as its MDX renders it, in `Prose`: an example, then the
 * headings `toc` (`toc.ts`) links to, with text, a callout, a list and a table under them.
 */
export function PageContent(): ReactElement {
  return (
    <Prose>
      <p>
        A button runs an action where it is: it saves, sends or opens something. A link goes to
        another page instead.
      </p>
      <CodeExample title="app.tsx" lines={BUTTON_CODE} />
      <H2 id="usage">Usage</H2>
      <p>
        Import <code>Button</code> from <code>@contour-ui/kit</code> and give it a label that says
        what it does. Keep the label short: a verb, and the object when it is not obvious.
      </p>
      <p>
        One action of a view is the main one, and its button is <code>solid</code>; the others are{' '}
        <code>outline</code> or <code>ghost</code>, so the eye finds the main action first.
      </p>
      <H2 id="variants">Variants</H2>
      <p>
        <code>solid</code> fills the button with the accent color, <code>outline</code> draws its
        border only, and <code>ghost</code> shows nothing until it is hovered.
      </p>
      <H3 id="sizes">Sizes</H3>
      <p>
        <code>sm</code>, <code>md</code> and <code>lg</code> follow the heights of the controls, so
        a button lines up with a field of the same size.
      </p>
      <H3 id="with-an-icon">With an icon</H3>
      <p>An icon before the label says what kind of action the button runs.</p>
      <Callout title="Icon buttons">
        A button with an icon and no visible label is an <code>IconButton</code>: it takes the label
        as its accessible name.
      </Callout>
      <H2 id="accessibility">Accessibility</H2>
      <p>
        The button is a native <code>button</code> element: it takes the focus, and screen readers
        announce its label and its state.
      </p>
      <H3 id="keyboard">Keyboard</H3>
      <ul>
        <li>
          <Kbd>Enter</Kbd> and <Kbd>Space</Kbd> press the button.
        </li>
        <li>
          <Kbd>Tab</Kbd> moves the focus to the next control.
        </li>
      </ul>
      <H4 id="focus-order">Focus order</H4>
      <p>A disabled button keeps its place in the page but leaves the order of the focus.</p>
      <H2 id="props">Props</H2>
      <Table>
        <Thead>
          <Tr>
            <Th>Prop</Th>
            <Th>Type</Th>
            <Th>Default</Th>
          </Tr>
        </Thead>
        <Tbody>
          {PROPS.map(([name, type, value]) => (
            <Tr key={name}>
              <Td>
                <code>{name}</code>
              </Td>
              <Td>
                <code>{type}</code>
              </Td>
              <Td>
                <code>{value}</code>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Prose>
  );
}
