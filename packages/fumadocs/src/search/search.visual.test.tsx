import { vars } from '@contour-ui/tokens';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { SearchTrigger } from '../index.ts';
import { visualStates } from '../test-utils/visual.tsx';

/** As wide as the sidebar: the field fills the width its container gives it. */
function Sidebar({ children }: { readonly children: ReactNode }): ReactElement {
  return <div style={{ maxInlineSize: '16rem' }}>{children}</div>;
}

const dialog = page.getByRole('dialog', { name: 'Search' });
const field = dialog.getByRole('combobox', { name: 'Search the docs' });

/**
 * Open the dialog from the keyboard, where the stories clicked the trigger, so that the pointer
 * hovers nothing; wait for the focus to move into its field, then search for `query`, all at once:
 * the results on screen are those of the whole query.
 */
async function search(query: string): Promise<void> {
  page.getByRole('button', { name: 'Search' }).element().focus();
  await userEvent.keyboard('{Enter}');
  await vi.waitFor(() => {
    if (document.activeElement !== field.element()) {
      throw new Error('The focus is not in the field yet.');
    }
  });
  await userEvent.fill(field, query);
}

visualStates({
  // `field`, as in the sidebar, with the shortcut of the platform; `icon`, as in the header on phones.
  triggers: {
    render: () => (
      <Sidebar>
        <div style={{ display: 'flex', alignItems: 'center', gap: vars.space['control-gap'] }}>
          <SearchTrigger />
          <SearchTrigger variant="icon" />
        </div>
      </Sidebar>
    ),
  },
  // The results of "button": each page that matches, then its headings, paragraphs and table rows.
  results: {
    render: () => (
      <Sidebar>
        <SearchTrigger />
      </Sidebar>
    ),
    target: 'page',
    ready: async () => {
      await search('button');
      await dialog.getByRole('group', { name: 'Dialog, Essentials, Components' }).findElement();
    },
    focused: () => field,
  },
  // A query that matches nothing says so.
  'no-results': {
    render: () => (
      <Sidebar>
        <SearchTrigger />
      </Sidebar>
    ),
    target: 'page',
    ready: async () => {
      await search('xylophone');
      await dialog.getByText('No results for “xylophone”').findElement();
    },
    focused: () => field,
  },
});
