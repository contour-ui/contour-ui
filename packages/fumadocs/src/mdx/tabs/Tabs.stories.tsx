import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { CodeExample, INSTALL_CODE } from '../../test-utils/mdx.tsx';
import { Prose, Tab, Tabs, TabsContent, TabsList, TabsTrigger } from '../index.ts';

/**
 * Tabs of MDX content, with the props of Fumadocs' `Tabs`: `items` makes a trigger for each name,
 * and each `Tab` holds the content of one. A frame around the styled `line` Tabs, the selected
 * panel under the row of triggers. A code block alone in a panel fills it, and its copy button
 * moves up into the row.
 */
const meta: Meta<typeof Tabs> = {
  title: 'Fumadocs/MDX/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      // In the content of a page, as an MDX page renders it.
      <Prose style={{ maxInlineSize: '44rem' }}>
        <Story />
      </Prose>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** `<Tabs items={[…]}>` with a `Tab` for each item, the first one selected. */
export const Items: Story = {
  render: () => (
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
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: 'JavaScript' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(canvas.getByRole('tab', { name: 'Rust' }));
    await expect(canvas.getByText(/WebAssembly/u)).toBeVisible();
    // Back to the first tab, for the screenshot.
    await userEvent.click(canvas.getByRole('tab', { name: 'JavaScript' }));
  },
};

/**
 * A `label` at the start of the row names the list of tabs. A code block alone in a panel, as
 * `remarkCodeTab` puts the blocks with a `tab` meta inside `<Tabs>`, fills it: the copy button
 * sits at the end of the row.
 */
export const LabelAndCode: Story = {
  render: () => (
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
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole('tablist', { name: 'Install' });
    await expect(within(list).getAllByRole('tab')).toHaveLength(2);
    await expect(canvas.getByRole('button', { name: 'Copy code' })).toBeVisible();
  },
};

/**
 * Two tabs of the group `language`: a reader's choice in one selects the same tab in the other,
 * and the session remembers it (`sessionStorage`, under the group id).
 */
export const Group: Story = {
  render: () => (
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
  ),
  play: async ({ canvas }) => {
    const setup = canvas.getByRole('tablist', { name: 'Setup' });
    const usage = canvas.getByRole('tablist', { name: 'Usage' });
    await userEvent.click(within(setup).getByRole('tab', { name: 'JavaScript' }));
    await waitFor(async () => {
      await expect(within(usage).getByRole('tab', { name: 'JavaScript' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
    await expect(sessionStorage.getItem('language')).toBe('JavaScript');

    // Back to the first tab, for the screenshot.
    await userEvent.click(within(usage).getByRole('tab', { name: 'TypeScript' }));
    await waitFor(async () => {
      await expect(within(setup).getByRole('tab', { name: 'TypeScript' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  },
};

/** Without `items`: `TabsList`, `TabsTrigger` and `TabsContent`, part by part. */
export const Parts: Story = {
  render: () => (
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
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: 'Props' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByText('The props of the component.')).toBeVisible();
  },
};
